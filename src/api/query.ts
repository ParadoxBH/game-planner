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

/**
 * Junta as partes sem aninhar à toa: grupo vazio sai, e grupo com o mesmo operador do pai ou com um filho só se
 * desfaz nele. and(a, and(b, c)) vira and(a, b, c); and(a, or(b)) vira and(a, b).
 */
function group(operator: "and" | "or", parts: QueryPart[]): QueryGroup {
  const rules: QueryRule[] = [];
  const groups: QueryGroup[] = [];
  const add = (part: QueryJson) => {
    if (part.type === "rule") {
      rules.push(part);
      return;
    }
    const children = [...part.rules, ...part.groups];
    if (part.operator === operator || children.length === 1) children.forEach(add);
    else if (children.length > 0) groups.push(part);
  };
  parts.forEach((part) => {
    if (part) add(part);
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

/** Controle de um filtro de tela: select escolhe uma opção; multi marca conter ou não conter em cada uma; tabs é select em abas; switch liga a única opção. */
export type FilterDisplay = "select" | "multi" | "tabs" | "switch";

export interface ListingFilterOption {
  value: string;
  label: string;
  iconMediaId?: string;
  /** Quantos registros a opção tem, para exibir junto do rótulo. */
  count?: number;
  /** O que a opção aplica; ausente, `field equal value`. */
  query?: QueryGroup;
  /** Em multi, o que "não conter" aplica; ausente, `field not_equal value`. */
  exclude?: QueryGroup;
  /** Com `dependsOn` no filtro: sob quais valores do filtro pai a opção aparece. */
  parents?: string[];
}

/** Filtro de tela descrito pelo backend (GET .../query/filters). O front desenha e aplica sem conhecê-lo. */
export interface ListingFilter {
  /** Nome do valor escolhido. */
  key: string;
  label: string;
  display: FilterDisplay;
  /** Nome curto de ícone ("trade", "station"); ausente, o padrão. */
  icon?: string;
  /** Rótulo de "nenhuma opção" em select e tabs. */
  allLabel?: string;
  /** Campo do QueryJson das opções sem query. Com ele, um valor fora das opções (vindo da URL) ainda filtra. */
  field?: string;
  /** Valor antes de o usuário mexer. */
  defaultValue?: string;
  /** Key de outro filtro: com um valor escolhido nele, só valem as opções que o têm em `parents`. */
  dependsOn?: string;
  options: ListingFilterOption[];
}

/** A barra de uma listagem: a busca, que procura o texto em cada campo, e os filtros na ordem de exibição. */
export interface ListingSchema {
  search: { placeholder: string; fields: string[] };
  /** A listagem segue o filtro global de eventos ativos: toda consulta leva o grupo de inActiveEvents na raiz. */
  activeEvents: boolean;
  filters: ListingFilter[];
}

export type IncludeState = "include" | "exclude" | "indifferent";

/** Valor de um filtro de tela: a opção escolhida (select, tabs, switch) ou o estado de cada opção (multi). null: nenhuma. */
export type FilterValue = string | null | Record<string, IncludeState>;

/** Valores da barra pela `key` de cada filtro. Ausente: vale o padrão do filtro. */
export type FilterValues = Record<string, FilterValue | undefined>;

/**
 * As opções que valem agora. Com `dependsOn` e um valor escolhido no filtro pai, só as que aparecem sob ele, como
 * as sub-categorias da categoria principal escolhida; sem valor no pai, todas.
 */
export function visibleOptions(filter: ListingFilter, filters: ListingFilter[], values: FilterValues): ListingFilterOption[] {
  const parent = filter.dependsOn ? filters.find((candidate) => candidate.key === filter.dependsOn) : undefined;
  const selected = parent ? filterValue(parent, values) : null;
  return typeof selected === "string"
    ? filter.options.filter((option) => option.parents?.includes(selected))
    : filter.options;
}

/** O valor em vigor: o escolhido ou, antes de o usuário mexer, o padrão do filtro. */
export function filterValue(filter: ListingFilter, values: FilterValues): FilterValue {
  const value = values[filter.key];
  return value !== undefined ? value : (filter.defaultValue ?? null);
}

function optionWhere(filter: ListingFilter, value: string, exclude: boolean): QueryPart {
  const option = filter.options.find((candidate) => candidate.value === value);
  const query = exclude ? option?.exclude : option?.query;
  if (query) return query;
  return filter.field ? rule(filter.field, exclude ? "not_equal" : "equal", value) : undefined;
}

/** O texto da busca em qualquer dos campos que o backend indica. Em branco, não filtra. */
export function searchWhere(search: ListingSchema["search"], term: string | undefined): QueryGroup | undefined {
  const text = term?.trim();
  return text ? or(...search.fields.map((field) => rule(field, "contains", text))) : undefined;
}

/** QueryJson da barra: a busca e o valor em vigor de cada filtro, juntos com "and". */
export function listingWhere(schema: ListingSchema, term: string | undefined, values: FilterValues): QueryGroup {
  const parts: QueryPart[] = [searchWhere(schema.search, term)];
  schema.filters.forEach((filter) => {
    const value = filterValue(filter, values);
    if (value === null) return;
    if (typeof value === "string") {
      parts.push(optionWhere(filter, value, false));
      return;
    }
    Object.entries(value).forEach(([option, state]) => {
      if (state !== "indifferent") parts.push(optionWhere(filter, option, state === "exclude"));
    });
  });
  return and(...parts);
}

/** Valor de um filtro sem nada escolhido: nenhuma opção, ou nenhuma marcada em multi. */
export function emptyFilterValue(filter: ListingFilter): FilterValue {
  return filter.display === "multi" ? {} : null;
}

/** Todos os valores de volta ao padrão de cada filtro; somado aos atuais (setCriteria), limpa o que foi escolhido. */
export function resetFilterValues(values: FilterValues): FilterValues {
  return Object.fromEntries(Object.keys(values).map((key) => [key, undefined]));
}

/** Quantas escolhas de um filtro estão valendo: 0 ou 1, e em multi uma por opção marcada. */
export function filterCount(filter: ListingFilter, values: FilterValues): number {
  const value = filterValue(filter, values);
  if (value === null) return 0;
  if (typeof value === "string") return 1;
  return Object.values(value).filter((state) => state !== "indifferent").length;
}
