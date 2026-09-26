import type { SpawnCondition } from "../../api/content";

/**
 * Avaliação de condições de surgimento, em TypeScript puro: sem React, sem rede, sem depender de
 * como os dados chegaram. Quem produz um `WorldSample` — os controles do simulador hoje, um save do
 * jogador lido no navegador amanhã — usa a mesma função sem mudar nada.
 *
 * O vocabulário e a regra de combinação estão em doc/spawn_and_spatial.md.
 */

/** O que se sabe de um ponto do mundo. Campo ausente ou null é desconhecido, não é falso. */
export interface WorldSample {
  /** Ext id do bioma ou local. */
  biome?: string | null;
  altitude?: number | null;
  /** Coluna de água acima do ponto. */
  depth?: number | null;
  timeOfDay?: "day" | "night" | null;
  biomeArea?: "edge" | "interior" | null;
  forest?: boolean | null;
  /** Ext id do evento de clima. */
  weather?: string | null;
  distanceFromCenter?: number | null;
  nearBase?: boolean | null;
  /** Chaves globais obtidas e ext ids dos chefes derrotados. */
  progress?: string[];
  /** Ext ids dos itens que o jogador conhece. */
  knownItems?: string[];
}

/**
 * `unknown` é o terceiro estado, e não é opcional: sem ele, quem ainda não escolheu o clima ou não
 * veria nada (se desconhecido contasse como falha) ou veria tudo (se contasse como acerto).
 */
export type Outcome = "match" | "fail" | "unknown";

/** Tipos avaliáveis contra uma amostra. O resto é descritivo e nunca reprova uma regra. */
export const GATING_TYPES: ReadonlySet<string> = new Set([
  "altitude",
  "depth",
  "time_of_day",
  "biome_area",
  "forest",
  "weather",
  "progress",
  "distance_from_center",
  "near_base",
  "known_item",
]);

/** Resultado de um tipo de condição, com as linhas que o produziram. */
export interface TypeOutcome {
  type: string;
  outcome: Outcome;
  conditions: SpawnCondition[];
}

/** Agrupa as condições por tipo, na ordem em que aparecem. */
function byType(conditions: SpawnCondition[]): Map<string, SpawnCondition[]> {
  const groups = new Map<string, SpawnCondition[]>();
  conditions.forEach((condition) => {
    const group = groups.get(condition.type);
    if (group) group.push(condition);
    else groups.set(condition.type, [condition]);
  });
  return groups;
}

function inRange(value: number, condition: SpawnCondition): boolean {
  return (condition.min === null || value >= condition.min) && (condition.max === null || value <= condition.max);
}

/**
 * Uma linha casa com a amostra? `null` quando a amostra não sabe responder — aí o tipo inteiro fica
 * desconhecido, porque não dá para afirmar nem negar.
 */
function matchesOne(sample: WorldSample, condition: SpawnCondition): boolean | null {
  switch (condition.type) {
    case "altitude":
      return sample.altitude == null ? null : inRange(sample.altitude, condition);
    case "depth":
      return sample.depth == null ? null : inRange(sample.depth, condition);
    case "distance_from_center":
      return sample.distanceFromCenter == null ? null : inRange(sample.distanceFromCenter, condition);
    case "time_of_day":
      return sample.timeOfDay == null ? null : sample.timeOfDay === condition.value;
    case "biome_area":
      return sample.biomeArea == null ? null : sample.biomeArea === condition.value;
    case "forest":
      return sample.forest == null ? null : sample.forest === (condition.value === "inside");
    case "weather":
      return sample.weather == null ? null : sample.weather === condition.target?.extId;
    case "near_base":
      return sample.nearBase == null ? null : sample.nearBase;
    case "progress":
      // A chave crua e o ext id do chefe servem: a origem pode dar qualquer um dos dois.
      if (!sample.progress) return null;
      return sample.progress.some((held) => held === condition.value || held === condition.target?.extId);
    case "known_item":
      if (!sample.knownItems) return null;
      return sample.knownItems.some((item) => item === condition.target?.extId);
    default:
      return null;
  }
}

/**
 * O resultado de um tipo: basta uma positiva casar (ou não haver positiva nenhuma) e nenhuma
 * negativa casar. Desconhecido em qualquer linha que importe deixa o tipo desconhecido.
 */
function outcomeOfType(sample: WorldSample, conditions: SpawnCondition[]): Outcome {
  let anyPositive = false;
  let positiveMatched = false;
  let positiveUnknown = false;

  for (const condition of conditions) {
    const result = matchesOne(sample, condition);
    if (condition.negated) {
      if (result === true) return "fail";
      if (result === null) positiveUnknown = true;
      continue;
    }
    anyPositive = true;
    if (result === true) positiveMatched = true;
    else if (result === null) positiveUnknown = true;
  }

  if (anyPositive && !positiveMatched) return positiveUnknown ? "unknown" : "fail";
  return positiveUnknown ? "unknown" : "match";
}

/** O resultado de cada tipo de condição, para a tela dizer *por que* a regra entrou ou não. */
export function explainConditions(sample: WorldSample, conditions: SpawnCondition[]): TypeOutcome[] {
  const result: TypeOutcome[] = [];
  byType(conditions).forEach((group, type) => {
    if (!GATING_TYPES.has(type)) return;
    result.push({ type, outcome: outcomeOfType(sample, group), conditions: group });
  });
  return result;
}

/** Uma reprovação basta para reprovar; senão, qualquer desconhecido deixa o todo desconhecido. */
export function combine(outcomes: Outcome[]): Outcome {
  if (outcomes.some((outcome) => outcome === "fail")) return "fail";
  if (outcomes.some((outcome) => outcome === "unknown")) return "unknown";
  return "match";
}

/** A regra vale nesta amostra? Tipos diferentes valem juntos; o mesmo tipo é "basta um". */
export function matchesConditions(sample: WorldSample, conditions: SpawnCondition[]): Outcome {
  return combine(explainConditions(sample, conditions).map((entry) => entry.outcome));
}
