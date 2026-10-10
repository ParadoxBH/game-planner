package com.paradoxbh.gameplannerserver.query;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.model.Reference;

/**
 * Campo que uma consulta aceita no filtro: o nome no {@link QueryJson}, o tipo, os operadores e
 * como cada regra vira SQL. {@code kind} diz de que tipo é o código num campo {@code code}
 * ("category", "rarity"...); {@code options}, os valores de um campo {@code enum}.
 *
 * Expressões e tabelas vêm de código, nunca do JSON; valores sempre por parâmetro.
 */
public record QueryField(String name, String label, FieldType type, List<Operator> operators, String kind,
                         List<Option> options, Condition condition) {

    /** O que o front recebe para montar o filtro. */
    public record Info(String name, String label, FieldType type, List<Operator> operators,
                       @JsonInclude(JsonInclude.Include.NON_NULL) String kind,
                       @JsonInclude(JsonInclude.Include.NON_EMPTY) List<Option> options) {
    }

    public record Option(String value, String label) {
    }

    /** Monta a condição de uma regra já validada; {@code values} vem convertido conforme o tipo. */
    @FunctionalInterface
    interface Condition {
        String sql(Operator operator, List<Object> values, Params params);
    }

    /**
     * Campo de lista, que o registro "tem": categorias, drops, ocupantes... Recebe um {@link Match} e
     * devolve a condição de ter algum dos valores pedidos, em geral um EXISTS sobre a tabela-filha.
     */
    @FunctionalInterface
    public interface Membership {
        String sql(Match match);
    }

    /**
     * Campo de lista com faixa: o registro tem uma linha-filha cuja faixa cobre o valor. Recebe o
     * parâmetro já ligado, ou nulo quando a pergunta é só "tem a linha", em qualquer faixa.
     */
    @FunctionalInterface
    public interface Coverage {
        String sql(String value);
    }

    /** Diz se colunas da linha casam com os valores da regra. Em is_null e is_not_null, casa com qualquer valor. */
    public interface Match {

        /** A coluna tem um dos códigos pedidos. */
        String code(String column);

        /** O par tipo e código casa com uma das referências pedidas. Linha sem tipo casa com qualquer tipo. */
        String reference(String kindColumn, String extIdColumn);
    }

    public QueryField {
        operators = List.copyOf(operators);
        options = options == null ? List.of() : List.copyOf(options);
    }

    /** Coluna ou expressão escalar da linha, ex.: "t.level". */
    public static QueryField column(String name, String label, FieldType type, String expression) {
        if (type == FieldType.REFERENCE) {
            throw new IllegalArgumentException("Referência é campo de lista; use has: " + name);
        }
        return new QueryField(name, label, type, type.operators(), null, null,
                (operator, values, params) -> columnSql(expression, type, operator, values, params));
    }

    /** Coluna com o código de outro registro, ex.: o mapa de um local. */
    public static QueryField code(String name, String label, String kind, String expression) {
        return column(name, label, FieldType.CODE, expression).withKind(kind);
    }

    /** Coluna com um valor de lista fechada. */
    public static QueryField options(String name, String label, String expression, Option... options) {
        return new QueryField(name, label, FieldType.ENUM, FieldType.ENUM.operators(), null, List.of(options),
                (operator, values, params) -> columnSql(expression, FieldType.ENUM, operator, values, params));
    }

    /**
     * Campo de lista com códigos ({@code kind} diz de que tipo) ou referências "tipo:id" ({@code kind} nulo).
     * equal é ter o valor; in, ter algum deles; not_equal e not_in, não ter; is_null, não ter nenhum.
     */
    public static QueryField has(String name, String label, FieldType type, String kind, Membership membership) {
        if (type != FieldType.CODE && type != FieldType.REFERENCE) {
            throw new IllegalArgumentException("Campo de lista é code ou reference: " + name);
        }
        return new QueryField(name, label, type, type.operators(), kind, null,
                (operator, values, params) -> hasSql(membership, operator, values, params));
    }

    /**
     * Faixa de linha-filha que cobre o valor pedido, ex.: a altitude que um ponto de spawn permite.
     * Recebe o parâmetro já ligado, ou nulo em is_null e is_not_null — aí a pergunta é só se existe
     * a linha, com qualquer faixa.
     */
    public static QueryField covers(String name, String label, Coverage coverage) {
        return new QueryField(name, label, FieldType.NUMBER,
                List.of(Operator.EQUAL, Operator.IS_NULL, Operator.IS_NOT_NULL), null, null,
                (operator, values, params) -> switch (operator) {
                    case EQUAL -> coverage.sql(params.bind(values.getFirst()));
                    case IS_NOT_NULL -> coverage.sql(null);
                    case IS_NULL -> "NOT COALESCE(" + coverage.sql(null) + ", FALSE)";
                    default -> throw new IllegalStateException("Operador fora da faixa: " + operator);
                });
    }

    /**
     * Valor numérico de um atributo do conteúdo ({@code content_attribute}), ex.: o dano perfurante.
     * Comparações olham {@code value_num} e só casam com quem tem o atributo; is_not_null é ter o
     * atributo, com qualquer valor, e is_null é não ter. A chave vai por parâmetro.
     */
    public static QueryField attribute(String name, String key) {
        return new QueryField(name, "Atributo " + key, FieldType.NUMBER, ATTRIBUTE_OPERATORS, null, null,
                (operator, values, params) -> {
                    String row = "SELECT 1 FROM content_attribute a WHERE a.game_id = t.game_id AND a.kind = :kind"
                            + " AND a.ext_id = t.ext_id AND a.key = " + params.bind(key);
                    return switch (operator) {
                        case IS_NOT_NULL -> "EXISTS (" + row + ")";
                        case IS_NULL -> "NOT EXISTS (" + row + ")";
                        default -> "EXISTS (" + row + " AND "
                                + columnSql("a.value_num", FieldType.NUMBER, operator, values, params) + ")";
                    };
                });
    }

    private static final List<Operator> ATTRIBUTE_OPERATORS = List.of(Operator.EQUAL, Operator.IN, Operator.LESS,
            Operator.LESS_OR_EQUAL, Operator.GREATER, Operator.GREATER_OR_EQUAL, Operator.BETWEEN, Operator.IS_NULL,
            Operator.IS_NOT_NULL);

    /** Sim ou não calculado por uma condição, ex.: código ainda válido. */
    public static QueryField flag(String name, String label, String predicate) {
        return new QueryField(name, label, FieldType.BOOLEAN, FieldType.BOOLEAN.operators(), null, null,
                (operator, values, params) -> Boolean.TRUE.equals(values.getFirst())
                        ? "(" + predicate + ")"
                        : "NOT COALESCE((" + predicate + "), FALSE)");
    }

    public QueryField withKind(String kind) {
        return new QueryField(name, label, type, operators, kind, options, condition);
    }

    /** Só estes operadores, entre os do tipo. */
    public QueryField withOperators(Operator... operators) {
        return new QueryField(name, label, type, List.of(operators), kind, options, condition);
    }

    public Info info() {
        return new Info(name, label, type, operators, kind, options);
    }

    /** Converte e valida um valor do JSON: pelo tipo e, em enum, pelas opções. */
    Object convert(Object value, String path) {
        Object converted = type.convert(value, path);
        if (type == FieldType.ENUM && options.stream().noneMatch(option -> option.value().equals(converted))) {
            throw ApiException.badRequest(path + ": \"" + converted + "\" não é opção de " + name + ". Use "
                    + options.stream().map(Option::value).collect(Collectors.joining(", ")));
        }
        return converted;
    }

    private static String columnSql(String expression, FieldType type, Operator operator, List<Object> values,
                                    Params params) {
        return switch (operator) {
            case EQUAL -> expression + " = " + params.bind(values.getFirst());
            case NOT_EQUAL -> expression + " IS DISTINCT FROM " + params.bind(values.getFirst());
            case IN -> values.isEmpty() ? "FALSE" : expression + " IN (" + params.bind(values) + ")";
            case NOT_IN -> values.isEmpty() ? "TRUE"
                    : "(" + expression + " IS NULL OR " + expression + " NOT IN (" + params.bind(values) + "))";
            // Texto: sem diferença de maiúscula e de acento, com search_fold (V25) dos dois lados.
            case CONTAINS -> folded(expression) + " LIKE " + foldedParam("%" + escapeLike(values.getFirst()) + "%", params);
            case NOT_CONTAINS -> "(" + expression + " IS NULL OR " + folded(expression) + " NOT LIKE "
                    + foldedParam("%" + escapeLike(values.getFirst()) + "%", params) + ")";
            case BEGINS_WITH -> folded(expression) + " LIKE " + foldedParam(escapeLike(values.getFirst()) + "%", params);
            case ENDS_WITH -> folded(expression) + " LIKE " + foldedParam("%" + escapeLike(values.getFirst()), params);
            case LESS -> expression + " < " + params.bind(values.getFirst());
            case LESS_OR_EQUAL -> expression + " <= " + params.bind(values.getFirst());
            case GREATER -> expression + " > " + params.bind(values.getFirst());
            case GREATER_OR_EQUAL -> expression + " >= " + params.bind(values.getFirst());
            case BETWEEN -> expression + " BETWEEN " + params.bind(values.get(0)) + " AND " + params.bind(values.get(1));
            case INTERSECTS -> "(" + expression + " IS NOT NULL AND " + expression + " && ST_MakeEnvelope("
                    + params.bind(values.get(0)) + ", " + params.bind(values.get(1)) + ", "
                    + params.bind(values.get(2)) + ", " + params.bind(values.get(3)) + ", 0))";
            case IS_NULL -> expression + " IS NULL";
            case IS_NOT_NULL -> expression + " IS NOT NULL";
        };
    }

    private static String hasSql(Membership membership, Operator operator, List<Object> values, Params params) {
        return switch (operator) {
            case EQUAL, IN -> values.isEmpty() ? "FALSE" : membership.sql(new ValuesMatch(values, params));
            case NOT_EQUAL, NOT_IN -> values.isEmpty() ? "TRUE"
                    : "NOT COALESCE(" + membership.sql(new ValuesMatch(values, params)) + ", FALSE)";
            case IS_NOT_NULL -> membership.sql(AnyMatch.INSTANCE);
            case IS_NULL -> "NOT COALESCE(" + membership.sql(AnyMatch.INSTANCE) + ", FALSE)";
            default -> throw new IllegalStateException("Operador de lista não tratado: " + operator);
        };
    }

    private static String folded(String expression) {
        return "search_fold(" + expression + ")";
    }

    private static String foldedParam(String pattern, Params params) {
        return "search_fold(" + params.bind(pattern) + ")";
    }

    private static String escapeLike(Object value) {
        return value.toString().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    /** Casa com os valores da regra. Os parâmetros são criados uma vez e repetidos em cada uso. */
    private static final class ValuesMatch implements Match {

        private final List<Object> values;
        private final Params params;
        private String codes;
        private final List<String[]> references = new ArrayList<>();

        ValuesMatch(List<Object> values, Params params) {
            this.values = values;
            this.params = params;
        }

        @Override
        public String code(String column) {
            if (codes == null) {
                codes = values.size() == 1 ? params.bind(values.getFirst()) : params.bind(values);
            }
            return values.size() == 1 ? column + " = " + codes : column + " IN (" + codes + ")";
        }

        @Override
        public String reference(String kindColumn, String extIdColumn) {
            if (references.isEmpty()) {
                for (Object value : values) {
                    Reference target = (Reference) value;
                    references.add(new String[] {
                            params.bind(target.extId()),
                            target.kind() == null ? null : params.bind(target.kind())});
                }
            }
            List<String> parts = new ArrayList<>();
            for (String[] reference : references) {
                String part = extIdColumn + " = " + reference[0];
                if (reference[1] != null) {
                    part += " AND (" + kindColumn + " IS NULL OR " + kindColumn + " = " + reference[1] + ")";
                }
                parts.add("(" + part + ")");
            }
            return parts.size() == 1 ? parts.getFirst() : "(" + String.join(" OR ", parts) + ")";
        }
    }

    /** Casa com qualquer valor: ter algum, para is_not_null e is_null. */
    private enum AnyMatch implements Match {
        INSTANCE;

        @Override
        public String code(String column) {
            return column + " IS NOT NULL";
        }

        @Override
        public String reference(String kindColumn, String extIdColumn) {
            return extIdColumn + " IS NOT NULL";
        }
    }
}
