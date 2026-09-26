import type { SpawnCondition } from "../../api/content";
import type { ReferenceIndex } from "../../api/references";

/**
 * Como uma condição de surgimento é escrita na tela. A tabela dá rótulo e unidade aos tipos
 * conhecidos; tipo de outro jogo, que não esteja aqui, ainda aparece com o código humanizado — o
 * vocabulário é aberto de propósito (doc/spawn_and_spatial.md).
 */
interface Labels {
  label: string;
  unit?: string;
  /** Rótulo por valor, nos tipos de código. */
  values?: Record<string, string>;
}

const CONDITION_LABELS: Record<string, Labels> = {
  altitude: { label: "Altitude", unit: "m" },
  depth: { label: "Profundidade", unit: "m" },
  distance_from_center: { label: "Do centro", unit: "m" },
  time_of_day: { label: "Período", values: { day: "dia", night: "noite" } },
  biome_area: { label: "No bioma", values: { edge: "borda", interior: "interior" } },
  forest: { label: "Floresta", values: { inside: "dentro", outside: "fora" } },
  weather: { label: "Clima" },
  progress: { label: "Depois de" },
  water_surface: { label: "Na superfície da água" },
  near_base: { label: "Perto de uma base" },
  known_item: { label: "Conhecendo" },
  level: { label: "Nível" },
  level_up_chance: { label: "Chance de estrela", unit: "%" },
  max_alive: { label: "Vivos ao mesmo tempo", unit: "no máx." },
  max_total: { label: "No total", unit: "no máx." },
  spawn_interval: { label: "Tenta a cada", unit: "s" },
  per_zone: { label: "Por zona" },
  hunts_player: { label: "Caça o jogador" },
  duration: { label: "Dura", unit: "s" },
  dungeon_room: { label: "Em sala de masmorra" },
};

function humanize(type: string): string {
  const text = type.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A faixa em texto: grandeza única sai como um número só, e sem limite vira "a partir de"/"até". */
function rangeText({ min, max }: SpawnCondition, unit?: string): string | null {
  const suffix = unit ? ` ${unit}` : "";
  if (min !== null && max !== null) return min === max ? `${min}${suffix}` : `${min} a ${max}${suffix}`;
  if (min !== null) return `a partir de ${min}${suffix}`;
  if (max !== null) return `até ${max}${suffix}`;
  return null;
}

/** Uma condição em texto, para o chip e para o tooltip. */
export function describeCondition(condition: SpawnCondition, references?: ReferenceIndex): string {
  const labels = CONDITION_LABELS[condition.type];
  const label = labels?.label ?? humanize(condition.type);
  const parts: string[] = [];

  const range = rangeText(condition, labels?.unit);
  if (range) parts.push(range);
  if (condition.value !== null) parts.push(labels?.values?.[condition.value] ?? condition.value);
  if (condition.target) parts.push(references?.name(condition.target) ?? condition.target.extId);

  const text = parts.length > 0 ? `${label}: ${parts.join(" ")}` : label;
  return condition.negated ? `Não ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
}
