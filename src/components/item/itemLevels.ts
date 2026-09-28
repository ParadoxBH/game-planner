import type {
  AttributeDefinition,
  AttributeValue,
  RecipeDocument,
  RecipeModifier,
  RecipeStation,
  Reference,
  Requirement,
} from "../../api/content";

export type Attributes = Record<string, AttributeValue>;

/** O mesmo alvo: mesmo código, e o mesmo tipo quando os dois dizem o tipo. */
function sameTarget(a: Reference, b: Reference): boolean {
  return a.extId === b.extId && (!a.kind || !b.kind || a.kind === b.kind);
}

/** Subida de nível de uma receita de melhoria: o item, o nível de entrada e o de saída. */
export interface UpgradeStep {
  target: Reference;
  from: number;
  to: number;
}

/**
 * A receita sobe um item de nível: um produto sai num nível e o mesmo item entra como ingrediente num nível menor
 * (sem nível na entrada, o de saída menos um). A mesma regra do campo `type` da API; consumir e produzir o mesmo
 * item sem nível (pôr a comida na bandeja) não é melhoria.
 */
export function upgradeStep(recipe: RecipeDocument): UpgradeStep | null {
  for (const output of recipe.outputs) {
    if (output.level == null) continue;
    const input = recipe.inputs.find((candidate) => sameTarget(candidate.target, output.target) && output.level! > (candidate.level ?? 0));
    if (input) return { target: output.target, from: input.level ?? output.level - 1, to: output.level };
  }
  return null;
}

/**
 * Melhoria curinga: a mesma categoria entra e sai da receita, então ela sobe mais um nível qualquer item da categoria,
 * sem limite (no Valheim, o Altar Ancestral com o ídolo do tier). Devolve a categoria.
 */
export function wildcardUpgrade(recipe: RecipeDocument): Reference | null {
  const output = recipe.outputs.find(
    (candidate) => candidate.target.kind === "category" && recipe.inputs.some((input) => sameTarget(input.target, candidate.target)),
  );
  return output?.target ?? null;
}

export function isUpgrade(recipe: RecipeDocument): boolean {
  return upgradeStep(recipe) !== null || wildcardUpgrade(recipe) !== null;
}

/** Ingredientes da melhoria sem o próprio item que sobe de nível: o custo. */
export function upgradeMaterials(recipe: RecipeDocument, target: Reference): Requirement[] {
  return recipe.inputs.filter((input) => !sameTarget(input.target, target));
}

/** O item que o modificador muda: o alvo dele, senão o item melhorado, senão o primeiro produto. */
export function modifierTarget(recipe: RecipeDocument, modifier: RecipeModifier): Reference | null {
  return modifier.target ?? upgradeStep(recipe)?.target ?? wildcardUpgrade(recipe) ?? recipe.outputs[0]?.target ?? null;
}

/** Os modificadores da receita que mudam este item. */
export function modifiersFor(recipe: RecipeDocument, target: Reference): RecipeModifier[] {
  return (recipe.modifiers ?? []).filter((modifier) => {
    const changed = modifierTarget(recipe, modifier);
    return changed !== null && sameTarget(changed, target);
  });
}

/** Sem o ruído de ponto flutuante: 0,1 + 0,2 é 0,3. */
function tidy(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Aplica os modificadores na ordem: soma, porcentagem do valor atual ou valor fixo. Atributo ausente conta como 0. */
export function applyModifiers(attributes: Attributes, modifiers: RecipeModifier[]): Attributes {
  const next = { ...attributes };
  for (const modifier of modifiers) {
    const current = next[modifier.attribute];
    const base = typeof current === "number" ? current : 0;
    if (modifier.operation === "set") {
      next[modifier.attribute] = modifier.value;
    } else if (typeof modifier.value === "number") {
      next[modifier.attribute] = tidy(modifier.operation === "add" ? base + modifier.value : base * (1 + modifier.value / 100));
    }
  }
  return next;
}

/** Atributo que aumenta outro por nível → o que ele aumenta, pelas definições (damage_per_level_slash → damage_slash). */
export function levelIncrements(definitions: Iterable<AttributeDefinition>): Map<string, string> {
  const increments = new Map<string, string>();
  for (const definition of definitions) {
    if (definition.levelIncrementOf) increments.set(definition.key, definition.levelIncrementOf);
  }
  return increments;
}

/** Soma os aumentos por nível do item em `levels` níveis. Os aumentos vêm do próprio item, que não muda de nível para nível. */
export function applyLevelIncrements(attributes: Attributes, item: Attributes, increments: Map<string, string>, levels: number): Attributes {
  const next = { ...attributes };
  for (const [incrementKey, targetKey] of increments) {
    const increment = item[incrementKey];
    if (typeof increment !== "number" || increment === 0) continue;
    const current = next[targetKey];
    next[targetKey] = tidy((typeof current === "number" ? current : 0) + increment * levels);
  }
  return next;
}

export interface AttributeChange {
  key: string;
  before: AttributeValue | undefined;
  after: AttributeValue;
}

export interface LevelRow {
  level: number;
  /** A receita que leva a este nível; nula no nível base. */
  recipe: RecipeDocument | null;
  attributes: Attributes;
  /** O que mudou em relação ao nível de onde a receita parte. */
  changes: AttributeChange[];
}

function changesBetween(before: Attributes, after: Attributes): AttributeChange[] {
  return Object.keys(after)
    .filter((key) => before[key] !== after[key])
    .map((key) => ({ key, before: before[key], after: after[key] }));
}

/**
 * Atributos do item em cada nível: parte dos atributos cadastrados (o nível base) e segue as melhorias em ordem de
 * nível. Cada passo soma os aumentos por nível dos metadados e aplica os modificadores da receita que miram o item.
 * Duas receitas para o mesmo nível partem ambas do nível anterior. Sem melhorias, a lista vem vazia.
 */
export function levelTable(
  item: { kind?: string | null; extId: string; attributes?: Attributes },
  upgrades: RecipeDocument[],
  definitions: Iterable<AttributeDefinition>,
): LevelRow[] {
  const self: Reference = { kind: item.kind ?? "item", extId: item.extId };
  const steps = upgrades
    .map((recipe) => ({ recipe, step: upgradeStep(recipe) }))
    .filter((entry): entry is { recipe: RecipeDocument; step: UpgradeStep } => entry.step !== null && sameTarget(entry.step.target, self))
    .sort((a, b) => a.step.to - b.step.to || a.step.from - b.step.from);
  if (steps.length === 0) return [];

  const base = item.attributes ?? {};
  const increments = levelIncrements(definitions);
  const baseLevel = Math.min(...steps.map((entry) => entry.step.from));
  const byLevel = new Map<number, Attributes>([[baseLevel, base]]);
  const rows: LevelRow[] = [{ level: baseLevel, recipe: null, attributes: base, changes: [] }];

  for (const { recipe, step } of steps) {
    // Parte do nível de entrada; se ele não foi calculado, do maior nível abaixo dele.
    const known = [...byLevel.keys()].filter((level) => level <= step.from).sort((a, b) => b - a)[0] ?? baseLevel;
    const before = byLevel.get(known) ?? base;
    const after = applyModifiers(applyLevelIncrements(before, base, increments, step.to - known), modifiersFor(recipe, self));
    if (!byLevel.has(step.to)) byLevel.set(step.to, after);
    rows.push({ level: step.to, recipe, attributes: after, changes: changesBetween(before, after) });
  }
  return rows;
}

/** Atributos que mudam em algum nível, na ordem em que aparecem. */
export function changedKeys(rows: LevelRow[]): string[] {
  const keys: string[] = [];
  for (const row of rows) {
    for (const change of row.changes) if (!keys.includes(change.key)) keys.push(change.key);
  }
  return keys;
}

/** Os níveis da tabela, sem repetir, do base ao maior. */
export function levelsOf(rows: LevelRow[]): number[] {
  return [...new Set(rows.map((row) => row.level))].sort((a, b) => a - b);
}

/** Um ingrediente no custo total: o que é gasto soma; o que só é exigido (ferramenta) conta uma vez. */
export interface CostEntry {
  target: Reference;
  amount: number;
  notConsumed: boolean;
}

export interface BuiltItem {
  /** Nível escolhido; nulo quando o item não tem melhorias. */
  level: number | null;
  /** As melhorias do nível base até o escolhido, em ordem, e depois os extras. */
  recipes: RecipeDocument[];
  attributes: Attributes;
  /** O que mudou em relação ao item cadastrado. */
  changes: AttributeChange[];
  cost: CostEntry[];
  /** Bancadas de todas as receitas, sem repetir, com o maior nível exigido. */
  stations: RecipeStation[];
}

function addCost(cost: Map<string, CostEntry>, inputs: Requirement[]) {
  for (const input of inputs) {
    const key = `${input.notConsumed ? "tool" : "use"}|${input.target.kind ?? ""}:${input.target.extId}`;
    const current = cost.get(key);
    if (!current) cost.set(key, { target: input.target, amount: input.amount, notConsumed: input.notConsumed });
    else current.amount = input.notConsumed ? Math.max(current.amount, input.amount) : tidy(current.amount + input.amount);
  }
}

/**
 * Monta o item: sobe do nível base até `level` pela cadeia de melhorias (uma receita por nível) e aplica os extras
 * (acessórios, pente) por cima. Devolve os atributos finais, o que mudou e o custo somado de todas as receitas, sem o
 * próprio item.
 */
export function buildItem(
  item: { kind?: string | null; extId: string; attributes?: Attributes },
  upgrades: RecipeDocument[],
  extras: RecipeDocument[],
  definitions: Iterable<AttributeDefinition>,
  level: number | null,
): BuiltItem {
  const self: Reference = { kind: item.kind ?? "item", extId: item.extId };
  const base = item.attributes ?? {};
  const rows = levelTable(item, upgrades, definitions);
  const levels = levelsOf(rows);
  const chosen = level !== null && levels.includes(level) ? level : (levels[0] ?? null);

  const chain = levels
    .filter((candidate) => chosen !== null && candidate > levels[0] && candidate <= chosen)
    .map((candidate) => rows.find((row) => row.level === candidate && row.recipe)!.recipe!);
  const reached = rows.find((row) => row.level === chosen)?.attributes ?? base;
  const attributes = extras.reduce((current, extra) => applyModifiers(current, modifiersFor(extra, self)), reached);

  const cost = new Map<string, CostEntry>();
  const stations = new Map<string, RecipeStation>();
  for (const recipe of [...chain, ...extras]) {
    addCost(cost, recipe.inputs.filter((input) => !sameTarget(input.target, self)));
    for (const station of recipe.stations) {
      const key = `${station.kind ?? ""}:${station.extId}`;
      const current = stations.get(key);
      if (!current || (station.level ?? 0) > (current.level ?? 0)) stations.set(key, station);
    }
  }

  return {
    level: chosen,
    recipes: [...chain, ...extras],
    attributes,
    changes: changesBetween(base, attributes),
    cost: [...cost.values()],
    stations: [...stations.values()],
  };
}
