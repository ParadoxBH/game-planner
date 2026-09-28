import type { AttributeDefinition, AttributeValue, RecipeModifier } from "../../api/content";

/** Nome de exibição do atributo: o rótulo da definição ou, sem ela, a própria chave. */
export function attributeName(key: string, definition?: AttributeDefinition): string {
  return definition?.label ?? key;
}

const NUMBER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Valor com unidade: 26 → "26", 1.5 com kg → "1,5 kg", true → "sim". */
export function formatAttributeValue(value: AttributeValue, definition?: AttributeDefinition): string {
  const shown = typeof value === "boolean" ? (value ? "sim" : "não") : typeof value === "number" ? NUMBER.format(value) : value;
  return definition?.unit ? `${shown} ${definition.unit}` : shown;
}

/** "Perfurante: 26", "Peso: 1,5 kg". */
export function attributeText(key: string, value: AttributeValue, definition?: AttributeDefinition): string {
  return `${attributeName(key, definition)}: ${formatAttributeValue(value, definition)}`;
}

const SIGNED = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2, signDisplay: "always" });

/** Diferença entre dois valores numéricos: "+6", "−0,5"; nula quando não é número ou não mudou. */
export function attributeDelta(before: AttributeValue | undefined, after: AttributeValue): number | null {
  if (typeof after !== "number") return null;
  const delta = after - (typeof before === "number" ? before : 0);
  return delta === 0 ? null : Math.round(delta * 10000) / 10000;
}

export function formatDelta(delta: number): string {
  return SIGNED.format(delta);
}

/** "Dano +5", "Velocidade +10%", "Munição por pente vira 17". */
export function modifierText(modifier: RecipeModifier, definition?: AttributeDefinition): string {
  const name = attributeName(modifier.attribute, definition);
  if (modifier.operation === "set") return `${name} vira ${formatAttributeValue(modifier.value, definition)}`;
  const value = typeof modifier.value === "number" ? SIGNED.format(modifier.value) : String(modifier.value);
  return modifier.operation === "percent" ? `${name} ${value}%` : `${name} ${value}${definition?.unit ? ` ${definition.unit}` : ""}`;
}
