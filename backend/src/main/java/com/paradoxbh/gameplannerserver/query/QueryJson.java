package com.paradoxbh.gameplannerserver.query;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Filtro de consulta em árvore. Um grupo junta regras e subgrupos com {@code operator} "and" ou
 * "or"; uma regra compara um campo com um valor, ex.: {@code {"type":"rule","field":"level",
 * "operator":"greater","value":10}}. {@code rules} só tem regras e {@code groups} só tem grupos.
 *
 * O front sempre envia um grupo. Grupo sem regras nem subgrupos não filtra nada. Os campos e
 * operadores aceitos por cada consulta vêm do endpoint {@code .../query/fields}; quem valida é o
 * {@link QueryBuilder}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record QueryJson(Type type, String operator, String field, Object value,
                        List<QueryJson> rules, List<QueryJson> groups) {

    public enum Type {
        @JsonProperty("rule") RULE,
        @JsonProperty("group") GROUP
    }

    public static final String AND = "and";
    public static final String OR = "or";

    public static QueryJson rule(String field, String operator, Object value) {
        return new QueryJson(Type.RULE, operator, field, value, null, null);
    }

    public static QueryJson rule(String field, String operator) {
        return rule(field, operator, null);
    }

    public static QueryJson group(String operator, List<QueryJson> rules, List<QueryJson> groups) {
        return new QueryJson(Type.GROUP, operator, null, null, List.copyOf(rules), List.copyOf(groups));
    }

    /** Grupo "and" com os itens, separados em regras e subgrupos. Sem itens, não filtra nada. */
    public static QueryJson and(QueryJson... items) {
        return of(AND, items);
    }

    public static QueryJson or(QueryJson... items) {
        return of(OR, items);
    }

    /** Fora do JSON: o tipo já diz. Sem isso, cada nó sairia com "group": true ou false. */
    @JsonIgnore
    public boolean isGroup() {
        return type == Type.GROUP;
    }

    private static QueryJson of(String operator, QueryJson... items) {
        List<QueryJson> rules = new ArrayList<>();
        List<QueryJson> groups = new ArrayList<>();
        for (QueryJson item : items) {
            (item.isGroup() ? groups : rules).add(item);
        }
        return group(operator, rules, groups);
    }
}
