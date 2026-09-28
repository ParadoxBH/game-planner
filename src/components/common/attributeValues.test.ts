import { describe, expect, it, vi } from "vitest";

// contentForm (numberOf) importa a sessão da API, que mexe em window e localStorage ao carregar.
vi.hoisted(() => {
  const store = new Map<string, string>();
  Object.assign(globalThis, {
    window: { addEventListener: () => undefined },
    localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value), removeItem: (key: string) => store.delete(key) },
  });
});
import type { AttributeDefinition } from "../../api/content";
import { attributeFormOf, attributesOut, emptyAttribute, invalidAttributeCount } from "./attributeValues";
import { listingSort, listingWhere, type ListingSchema } from "../../api/query";

const definition = (key: string, dataType: AttributeDefinition["dataType"]): AttributeDefinition => ({
  key,
  label: key,
  dataType,
  unit: null,
  group: null,
  ordinal: 0,
  levelIncrementOf: null,
});

describe("attributeFormOf / attributesOut", () => {
  it("keeps each value's own type, so undefined attributes round-trip", () => {
    const form = attributeFormOf({ damage_pierce: 26, skill: "bows", teleportable: false });
    expect(form.damage_pierce).toEqual({ value: "26", type: "number" });
    expect(form.skill).toEqual({ value: "bows", type: "text" });
    expect(form.teleportable).toEqual({ value: false, type: "boolean" });
    expect(attributesOut(form, [])).toEqual({ damage_pierce: 26, skill: "bows", teleportable: false });
  });

  it("drops empty number and text, accepts comma decimals and lets the definition decide the type", () => {
    const form = {
      weight: { value: "1,5", type: "text" as const },
      empty: emptyAttribute("number"),
      note: { value: "  ", type: "text" as const },
      flag: emptyAttribute("boolean"),
    };
    expect(attributesOut(form, [definition("weight", "number")])).toEqual({ weight: 1.5, flag: false });
  });

  it("counts numbers that are not numbers", () => {
    const form = { damage: { value: "abc", type: "number" as const }, name: { value: "abc", type: "text" as const } };
    expect(invalidAttributeCount(form, [])).toBe(1);
    expect(invalidAttributeCount(form, [definition("name", "number")])).toBe(2);
  });
});

describe("attribute listing filter", () => {
  const schema: ListingSchema = {
    search: { placeholder: "", fields: ["name"] },
    activeEvents: false,
    filters: [
      {
        key: "attr",
        label: "Atributo",
        display: "attribute",
        field: "attribute",
        options: [
          { value: "damage_pierce", label: "Perfurante", count: 3, attribute: { group: "Dano", numeric: true } },
          { value: "skill", label: "Habilidade", count: 2, attribute: { numeric: false } },
        ],
      },
    ],
  };

  it("filters by having the attribute and sorts from highest to lowest by default", () => {
    const values = { attr: "damage_pierce" };
    expect(JSON.stringify(listingWhere(schema, undefined, values))).toContain('"field":"attr.damage_pierce","operator":"is_not_null"');
    expect(listingSort(schema, values)).toBe("-attr.damage_pierce");
  });

  it("turns min and max into a range and honours the chosen order", () => {
    const where = JSON.stringify(listingWhere(schema, undefined, { attr: "damage_pierce", attrMin: "30", attrMax: "10" }));
    expect(where).toContain('"operator":"between","value":[10,30]');
    expect(listingSort(schema, { attr: "damage_pierce", attrSort: "asc" })).toBe("attr.damage_pierce");
    expect(listingSort(schema, { attr: "damage_pierce", attrSort: "none" })).toBeUndefined();
  });

  it("only checks presence for non-numeric attributes and never sorts by them", () => {
    const values = { attr: "skill", attrMin: "5" };
    expect(JSON.stringify(listingWhere(schema, undefined, values))).toContain('"field":"attribute","operator":"equal","value":"skill"');
    expect(listingSort(schema, values)).toBeUndefined();
  });
});
