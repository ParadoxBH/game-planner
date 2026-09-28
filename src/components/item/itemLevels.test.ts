import { describe, expect, it } from "vitest";
import type { AttributeDefinition, RecipeDocument, RecipeModifier } from "../../api/content";
import {
  applyModifiers,
  buildItem,
  changedKeys,
  isUpgrade,
  levelTable,
  modifiersFor,
  upgradeMaterials,
  upgradeStep,
  wildcardUpgrade,
} from "./itemLevels";

const item = (extId: string) => ({ kind: "item", extId });

function recipe(extId: string, parts: Partial<RecipeDocument>): RecipeDocument {
  return {
    extId,
    name: null,
    summary: null,
    description: null,
    media: [],
    craftTimeSeconds: null,
    stations: [],
    inputs: [],
    outputs: [],
    unlock: [],
    modifiers: [],
    events: [],
    ...parts,
  } as RecipeDocument;
}

const input = (extId: string, amount: number, level: number | null = null) => ({
  target: item(extId),
  amount,
  notConsumed: false,
  level,
  levelOperator: level === null ? null : ("exact" as const),
});
const output = (extId: string, level: number | null = null) => ({ target: item(extId), amount: 1, chance: null, level });

const definition = (key: string, levelIncrementOf: string | null = null): AttributeDefinition => ({
  key,
  label: key,
  dataType: "number",
  unit: null,
  group: null,
  ordinal: 0,
  levelIncrementOf,
});

// Valheim: a melhoria não diz o nível de entrada; os aumentos vêm dos metadados por nível.
const swordUpgrade = (quality: number) =>
  recipe(`Recipe_SwordIron_q${quality}`, {
    inputs: [input("SwordIron", 1), input("Iron", 10 * (quality - 1))],
    outputs: [output("SwordIron", quality)],
  });
const sword = {
  extId: "SwordIron",
  attributes: { damage_slash: 55, damage_per_level_slash: 6, durability: 200, durability_per_level: 50, weight: 0.8 },
};
const valheimDefinitions = [
  definition("damage_slash"),
  definition("damage_per_level_slash", "damage_slash"),
  definition("durability"),
  definition("durability_per_level", "durability"),
];

// How to Fish: a entrada diz o nível, e o dano de cada nível vem fixo na receita.
const pistolUpgrade = (level: number, damage: number) =>
  recipe(`upgrade_ammo_Pistol_${level}`, {
    inputs: [input("Pistol", 1, level - 1), input("money", 100 * level)],
    outputs: [output("Pistol", level)],
    modifiers: [{ target: null, attribute: "damage", operation: "set", value: damage }],
  });

describe("upgradeStep", () => {
  it("recognizes an upgrade by the same item coming out a level higher", () => {
    expect(upgradeStep(swordUpgrade(3))).toEqual({ target: item("SwordIron"), from: 2, to: 3 });
    expect(upgradeStep(pistolUpgrade(1, 28))).toEqual({ target: item("Pistol"), from: 0, to: 1 });
  });

  it("takes a category that goes in and out as a wildcard upgrade of any of its items", () => {
    const category = { kind: "category", extId: "altar_Upgrader2Weapon" };
    const altar = recipe("altar_upgrade_Upgrader2Weapon", {
      inputs: [{ ...input("x", 1), target: category }, input("Upgrader2Weapon", 1)],
      outputs: [{ target: category, amount: 1, chance: 0.65, level: null }],
    });
    expect(wildcardUpgrade(altar)).toEqual(category);
    expect(isUpgrade(altar)).toBe(true);
    expect(upgradeStep(altar)).toBeNull();
    expect(upgradeMaterials(altar, category).map((row) => row.target.extId)).toEqual(["Upgrader2Weapon"]);
  });

  it("does not take a recipe that consumes and produces the same item without a level", () => {
    expect(isUpgrade(recipe("build_Bread", { inputs: [input("Bread", 1)], outputs: [output("Bread")] }))).toBe(false);
    expect(isUpgrade(recipe("Recipe_SwordIron", { inputs: [input("Iron", 20)], outputs: [output("SwordIron")] }))).toBe(false);
  });

  it("keeps only the materials as the cost", () => {
    expect(upgradeMaterials(swordUpgrade(2), item("SwordIron")).map((row) => row.target.extId)).toEqual(["Iron"]);
  });
});

describe("applyModifiers", () => {
  it("adds, applies a percentage of the current value or sets it", () => {
    const modifiers: RecipeModifier[] = [
      { target: null, attribute: "damage", operation: "add", value: 5 },
      { target: null, attribute: "speed", operation: "percent", value: 10 },
      { target: null, attribute: "full_auto", operation: "set", value: true },
      { target: null, attribute: "crit", operation: "add", value: 0.1 },
    ];
    expect(applyModifiers({ damage: 20, speed: 1.5, full_auto: false, crit: 0.2 }, modifiers)).toEqual({
      damage: 25,
      speed: 1.65,
      full_auto: true,
      crit: 0.3,
    });
  });

  it("picks the modifiers aimed at the item, with no target meaning the upgraded item", () => {
    const magazine = recipe("attachment_Extended Mag_Pistol", {
      inputs: [{ ...input("Pistol", 1), notConsumed: true }],
      outputs: [output("attachment_Extended Mag")],
      modifiers: [{ target: item("Pistol"), attribute: "ammo_per_mag", operation: "set", value: 17 }],
    });
    expect(modifiersFor(magazine, item("Pistol"))).toHaveLength(1);
    expect(modifiersFor(magazine, item("attachment_Extended Mag"))).toHaveLength(0);
    expect(modifiersFor(pistolUpgrade(3, 33), item("Pistol"))).toHaveLength(1);
  });
});

describe("levelTable", () => {
  it("adds the per level increments of the metadata at each level", () => {
    const rows = levelTable(sword, [swordUpgrade(4), swordUpgrade(2), swordUpgrade(3)], valheimDefinitions);
    expect(rows.map((row) => row.level)).toEqual([1, 2, 3, 4]);
    expect(rows.map((row) => row.attributes.damage_slash)).toEqual([55, 61, 67, 73]);
    expect(rows.map((row) => row.attributes.durability)).toEqual([200, 250, 300, 350]);
    expect(rows[2].changes).toEqual([
      { key: "damage_slash", before: 61, after: 67 },
      { key: "durability", before: 250, after: 300 },
    ]);
    expect(changedKeys(rows)).toEqual(["damage_slash", "durability"]);
  });

  it("applies the recipe modifiers when the metadata has no increment", () => {
    const rows = levelTable({ extId: "Pistol", attributes: { damage: 25, ammo_per_mag: 10 } }, [pistolUpgrade(1, 28), pistolUpgrade(2, 30), pistolUpgrade(3, 33)], []);
    expect(rows.map((row) => [row.level, row.attributes.damage])).toEqual([
      [0, 25],
      [1, 28],
      [2, 30],
      [3, 33],
    ]);
    expect(changedKeys(rows)).toEqual(["damage"]);
  });

  it("is empty without upgrades of the item", () => {
    expect(levelTable(sword, [pistolUpgrade(1, 28)], valheimDefinitions)).toEqual([]);
  });
});

describe("buildItem", () => {
  const pistol = { extId: "Pistol", attributes: { damage: 25, ammo_per_mag: 10 } };
  const upgrades = [pistolUpgrade(1, 28), pistolUpgrade(2, 30), pistolUpgrade(3, 33)];
  const magazine = recipe("attachment_Extended Mag_Pistol", {
    inputs: [{ ...input("Pistol", 1), notConsumed: true }, input("money", 90)],
    outputs: [output("attachment_Extended Mag")],
    modifiers: [{ target: item("Pistol"), attribute: "ammo_per_mag", operation: "set", value: 17 }],
  });

  it("climbs to the chosen level, adds the extras and sums the cost without the item itself", () => {
    const built = buildItem(pistol, upgrades, [magazine], [], 2);
    expect(built.level).toBe(2);
    expect(built.attributes).toEqual({ damage: 30, ammo_per_mag: 17 });
    expect(built.changes.map((change) => change.key)).toEqual(["damage", "ammo_per_mag"]);
    // Nível 1 (100) + nível 2 (200) + pente (90).
    expect(built.cost).toEqual([{ target: item("money"), amount: 390, notConsumed: false }]);
    expect(built.recipes.map((entry) => entry.extId)).toEqual(["upgrade_ammo_Pistol_1", "upgrade_ammo_Pistol_2", "attachment_Extended Mag_Pistol"]);
  });

  it("stays at the base level when none is chosen and works without upgrades", () => {
    expect(buildItem(pistol, upgrades, [], [], null)).toMatchObject({ level: 0, attributes: pistol.attributes, cost: [], changes: [] });
    expect(buildItem(pistol, [], [magazine], [], null)).toMatchObject({ level: null, attributes: { damage: 25, ammo_per_mag: 17 } });
  });

  it("uses the per level increments of the metadata", () => {
    const built = buildItem(sword, [swordUpgrade(2), swordUpgrade(3)], [], valheimDefinitions, 3);
    expect(built.attributes.damage_slash).toBe(67);
    expect(built.cost).toEqual([{ target: item("Iron"), amount: 30, notConsumed: false }]);
  });
});
