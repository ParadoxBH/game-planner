import type { AttributeDefinition, AttributeValue } from "../../api/content";

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
