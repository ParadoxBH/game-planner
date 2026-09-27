/** Atributos do documento (número, texto, booleano) de e para os campos do formulário. */
import type { AttributeDefinition, AttributeValue } from "../../api/content";
import { numberOf } from "./contentForm";

export type AttributeType = AttributeDefinition["dataType"];

/**
 * Um atributo no formulário: número e texto ficam como texto enquanto se digita; booleano é o próprio. O tipo vem do
 * valor gravado ou, para atributo novo, da definição (sem definição, quem edita escolhe); ao salvar, a definição
 * manda, porque o servidor confere o valor contra ela.
 */
export interface AttributeEntry {
  value: string | boolean;
  type: AttributeType;
}

/** Pela chave, na ordem em que entraram. */
export type AttributeForm = Record<string, AttributeEntry>;

export function typeOfValue(value: AttributeValue): AttributeType {
  return typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "text";
}

export function attributeFormOf(attributes: Record<string, AttributeValue> | undefined): AttributeForm {
  return Object.fromEntries(
    Object.entries(attributes ?? {}).map(([key, value]) => [
      key,
      { value: typeof value === "boolean" ? value : String(value), type: typeOfValue(value) },
    ]),
  );
}

/** Valor inicial de um atributo recém-adicionado. */
export function emptyAttribute(type: AttributeType): AttributeEntry {
  return { value: type === "boolean" ? false : "", type };
}

/** O tipo que vale na hora de salvar: o da definição, se houver; senão o da linha. */
export function effectiveType(key: string, entry: AttributeEntry, definitions: Map<string, AttributeDefinition>): AttributeType {
  return definitions.get(key)?.dataType ?? entry.type;
}

function definitionMap(definitions: AttributeDefinition[] | Map<string, AttributeDefinition>) {
  return definitions instanceof Map ? definitions : new Map(definitions.map((definition) => [definition.key, definition]));
}

/** Número digitado que não é número (vazio vale: o atributo sai). */
export function attributeEntryInvalid(key: string, entry: AttributeEntry, definitions: Map<string, AttributeDefinition>): boolean {
  return effectiveType(key, entry, definitions) === "number" && typeof entry.value === "string" && numberOf(entry.value) === undefined;
}

/** O que vai para o documento: número e texto vazios saem; número vira número. */
export function attributesOut(
  form: AttributeForm,
  definitions: AttributeDefinition[] | Map<string, AttributeDefinition>,
): Record<string, AttributeValue> {
  const map = definitionMap(definitions);
  const out: Record<string, AttributeValue> = {};
  Object.entries(form).forEach(([key, entry]) => {
    const type = effectiveType(key, entry, map);
    if (type === "boolean") {
      out[key] = entry.value === true || entry.value === "true";
      return;
    }
    const text = typeof entry.value === "string" ? entry.value.trim() : String(entry.value);
    if (text === "") return;
    out[key] = type === "number" ? (numberOf(text) as number) : text;
  });
  return out;
}

/** Quantos atributos impedem salvar (número com texto que não é número). */
export function invalidAttributeCount(form: AttributeForm, definitions: AttributeDefinition[] | Map<string, AttributeDefinition>): number {
  const map = definitionMap(definitions);
  return Object.entries(form).filter(([key, entry]) => attributeEntryInvalid(key, entry, map)).length;
}

export function attributesInvalid(form: AttributeForm, definitions: AttributeDefinition[] | Map<string, AttributeDefinition>): boolean {
  return invalidAttributeCount(form, definitions) > 0;
}
