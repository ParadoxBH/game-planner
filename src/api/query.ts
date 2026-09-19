/**
 * QueryJson: o filtro que toda consulta do backend recebe. Um grupo junta regras e subgrupos com "and" ou "or";
 * uma regra compara um campo com um valor. O front sempre envia um grupo, e o backend (QueryBuilder) valida
 * campo, operador e valor. Os campos que cada listagem aceita vêm de GET .../query/fields.
 */

export type QueryOperator =
  | "equal"
  | "not_equal"
  | "in"
  | "not_in"
  | "contains"
  | "not_contains"
  | "begins_with"
  | "ends_with"
  | "less"
  | "less_or_equal"
  | "greater"
  | "greater_or_equal"
  /** [mínimo, máximo]. */
  | "between"
  /** Geometria cruza [minX, minY, maxX, maxY], em coordenadas de jogo. */
  | "intersects"
  /** Vazio; em campo de lista (categorias, drops...), não ter nenhum. */
  | "is_null"
  /** Preenchido; em campo de lista, ter algum. */
  | "is_not_null";

export type QueryValue = string | number | boolean | (string | number)[];

export interface QueryRule {
  type: "rule";
  field: string;
  operator: QueryOperator;
  /** Ausente em is_null e is_not_null; lista em in, not_in, between e intersects. */
  value?: QueryValue;
}

export interface QueryGroup {
  type: "group";
  operator: "and" | "or";
  /** Só regras. */
  rules: QueryRule[];
  /** Só grupos. Subgrupo vazio é ignorado pelo backend. */
  groups: QueryGroup[];
}

export type QueryJson = QueryRule | QueryGroup;

/**
 * Tipo do valor de um campo. `code` é o código de outro registro, do tipo em `kind`; `reference` é "tipo:id" ou
 * só "id"; `enum` traz as opções em `options`; `date` é "2026-09-18"; `datetime`, ISO-8601 com fuso.
 */
export type QueryFieldType =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "enum"
  | "code"
  | "reference"
  | "geometry";

export interface QueryFieldInfo {
  name: string;
  label: string;
  type: QueryFieldType;
  operators: QueryOperator[];
  /** Em campo `code`: de que tipo é o código (category, rarity, map...). */
  kind?: string;
  /** Em campo `enum`. */
  options?: { value: string; label: string }[];
}

/** O que uma consulta aceita: campos do filtro e chaves de ordenação (com "-" na frente, decrescente). */
export interface QuerySchema {
  fields: QueryFieldInfo[];
  sorts: string[];
}

/** Partes de um grupo. Valores falsos são ignorados, para montar o filtro com condições inline. */
export type QueryPart = QueryJson | false | null | undefined | "" | 0;

export function rule(field: string, operator: QueryOperator, value?: QueryValue): QueryRule {
  return value === undefined ? { type: "rule", field, operator } : { type: "rule", field, operator, value };
}

function group(operator: "and" | "or", parts: QueryPart[]): QueryGroup {
  const rules: QueryRule[] = [];
  const groups: QueryGroup[] = [];
  parts.forEach((part) => {
    if (!part) return;
    if (part.type === "group") groups.push(part);
    else rules.push(part);
  });
  return { type: "group", operator, rules, groups };
}

/** Todas as partes valem. Sem partes, não filtra nada. */
export function and(...parts: QueryPart[]): QueryGroup {
  return group("and", parts);
}

/** Alguma das partes vale. */
export function or(...parts: QueryPart[]): QueryGroup {
  return group("or", parts);
}

/** Nome ou código contém o termo. Termo em branco não filtra. */
export function textSearch(term: string | undefined): QueryGroup | undefined {
  const text = term?.trim();
  return text ? or(rule("name", "contains", text), rule("extId", "contains", text)) : undefined;
}

/** Disponível agora: sem evento, ou com algum dos eventos ativos. Sem eventos ativos, só o que não tem evento. */
export function inActiveEvents(eventIds: string[]): QueryGroup {
  return or(rule("event", "is_null"), eventIds.length > 0 && rule("event", "in", eventIds));
}
