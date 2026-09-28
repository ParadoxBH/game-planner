import type { AttributeDefinition, AttributeValue, ModifierOperation, RecipeModifier, Reference } from "../../api/content";

export const OPERATION_LABELS: Record<ModifierOperation, string> = { add: "Soma", percent: "Porcentagem", set: "Vira" };

/** Linha do formulário: o valor fica como texto enquanto se digita; `target` vazio é o alvo automático. */
export interface ModifierRow {
  key: number;
  /** "tipo:código" de um item da receita, ou vazio: o item melhorado, senão o primeiro produto. */
  target: string;
  attribute: string;
  operation: ModifierOperation;
  value: string;
}

export const targetKey = (target: Reference | null) => (target ? `${target.kind ?? ""}:${target.extId}` : "");

export function targetOf(key: string): Reference | null {
  if (!key) return null;
  const separator = key.indexOf(":");
  return { kind: key.slice(0, separator) || null, extId: key.slice(separator + 1) } as Reference;
}

export function valueIn(value: AttributeValue): string {
  return typeof value === "boolean" ? (value ? "sim" : "não") : String(value);
}

const TRUE = new Set(["sim", "true", "verdadeiro"]);
const FALSE = new Set(["não", "nao", "false", "falso"]);

/**
 * Valor digitado → o que vai para a API. Soma e porcentagem são número; "vira" segue o tipo do atributo (sem
 * definição: número se parecer número, sim/não vira booleano, o resto é texto). Undefined: inválido.
 */
export function valueOut(text: string, operation: ModifierOperation, definition?: AttributeDefinition): AttributeValue | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const number = Number(trimmed.replace(",", "."));
  const numeric = Number.isFinite(number);
  if (operation !== "set") return numeric ? number : undefined;

  const type = definition?.dataType;
  const lower = trimmed.toLowerCase();
  if (type === "number") return numeric ? number : undefined;
  if (type === "boolean") return TRUE.has(lower) ? true : FALSE.has(lower) ? false : undefined;
  if (type === "text") return trimmed;
  if (numeric) return number;
  if (TRUE.has(lower)) return true;
  if (FALSE.has(lower)) return false;
  return trimmed;
}

export function modifierInvalid(row: ModifierRow, definitions: Map<string, AttributeDefinition>): boolean {
  // Mesma regra de código da API: sem / \ ? # % ; e até 128 caracteres.
  return !/^[^/\\?#%;]{1,128}$/.test(row.attribute.trim()) || valueOut(row.value, row.operation, definitions.get(row.attribute.trim())) === undefined;
}

export function modifierOut(row: ModifierRow, definitions: Map<string, AttributeDefinition>): RecipeModifier {
  const attribute = row.attribute.trim();
  return {
    target: targetOf(row.target),
    attribute,
    operation: row.operation,
    value: valueOut(row.value, row.operation, definitions.get(attribute))!,
  };
}
