/** Atributos do documento (número, texto, booleano) de e para os campos do formulário. */
import type { AttributeDefinition, AttributeValue } from "../../api/content";
import { numberOf } from "./contentForm";

/** Valores do formulário: número e texto ficam como texto enquanto se digita; booleano é o próprio. */
export type AttributeForm = Record<string, string | boolean>;

export function attributeFormOf(attributes: Record<string, AttributeValue> | undefined): AttributeForm {
  return Object.fromEntries(
    Object.entries(attributes ?? {}).map(([key, value]) => [key, typeof value === "boolean" ? value : String(value)]),
  );
}

/** O que vai para o documento: vazio sai, número vira número pelo tipo da definição. */
export function attributesOut(form: AttributeForm, definitions: AttributeDefinition[]): Record<string, AttributeValue> {
  const types = new Map(definitions.map((definition) => [definition.key, definition.dataType]));
  const out: Record<string, AttributeValue> = {};
  Object.entries(form).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      out[key] = value;
      return;
    }
    if (value.trim() === "") return;
    out[key] = types.get(key) === "number" ? (numberOf(value) as number) : value.trim();
  });
  return out;
}

/** Algum atributo numérico com texto que não é número. */
export function attributesInvalid(form: AttributeForm, definitions: AttributeDefinition[]): boolean {
  return definitions.some(
    (definition) =>
      definition.dataType === "number" && typeof form[definition.key] === "string" && numberOf(form[definition.key] as string) === undefined,
  );
}

