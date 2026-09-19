package com.paradoxbh.gameplannerserver.query;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.query.QueryJson.Type;

/**
 * Transforma um {@link QueryJson} na condição WHERE de uma consulta e descreve, para o front, os
 * campos que ela aceita. Cada consulta tem o seu, com os campos dela.
 *
 * Todo o JSON é validado aqui: campo conhecido, operador que o campo aceita, valor no formato do
 * tipo. O erro diz onde está a regra, ex.: "query.groups[0].rules[1]: ...".
 */
public final class QueryBuilder {

    public static final int MAX_DEPTH = 8;
    public static final int MAX_RULES = 200;
    /** Valores de um in ou not_in. */
    public static final int MAX_VALUES = 1000;

    private final Map<String, QueryField> fields = new LinkedHashMap<>();

    public QueryBuilder(List<QueryField> fields) {
        for (QueryField field : fields) {
            if (this.fields.putIfAbsent(field.name(), field) != null) {
                throw new IllegalArgumentException("Campo de consulta repetido: " + field.name());
            }
        }
    }

    /** Campos na ordem em que foram declarados. */
    public List<QueryField.Info> fields() {
        return fields.values().stream().map(QueryField::info).toList();
    }

    /**
     * Condição SQL do filtro, sem a palavra WHERE; guarda os valores em {@code params}. Nulo ou grupo
     * sem regras vira TRUE. Subgrupo vazio é ignorado, como se não existisse.
     */
    public String where(QueryJson query, Map<String, Object> params) {
        if (query == null) {
            return "TRUE";
        }
        if (query.type() != Type.GROUP) {
            throw ApiException.badRequest("query precisa ser um grupo: {\"type\": \"group\", \"operator\": \"and\","
                    + " \"rules\": [...], \"groups\": [...]}");
        }
        String sql = new Walk(new Params(params)).group(query, "query", 1);
        return sql == null ? "TRUE" : sql;
    }

    private final class Walk {

        private final Params params;
        private int rules;

        Walk(Params params) {
            this.params = params;
        }

        /** Nulo quando o grupo não tem regra nenhuma, nem nos subgrupos. */
        String group(QueryJson group, String path, int depth) {
            if (depth > MAX_DEPTH) {
                throw ApiException.badRequest(path + ": grupos aninhados passam de " + MAX_DEPTH + " níveis");
            }
            if (group.field() != null || group.value() != null) {
                throw ApiException.badRequest(path + ": grupo não tem field nem value; eles vão nas regras");
            }
            String joiner = joiner(group.operator(), path);

            List<String> parts = new ArrayList<>();
            List<QueryJson> children = group.rules() == null ? List.of() : group.rules();
            for (int i = 0; i < children.size(); i++) {
                String childPath = path + ".rules[" + i + "]";
                QueryJson child = required(children.get(i), childPath);
                if (child.type() == Type.GROUP) {
                    throw ApiException.badRequest(childPath + ": rules só tem regras; grupos vão em groups");
                }
                parts.add(rule(child, childPath));
            }
            children = group.groups() == null ? List.of() : group.groups();
            for (int i = 0; i < children.size(); i++) {
                String childPath = path + ".groups[" + i + "]";
                QueryJson child = required(children.get(i), childPath);
                if (child.type() == Type.RULE) {
                    throw ApiException.badRequest(childPath + ": groups só tem grupos; regras vão em rules");
                }
                String sql = group(child, childPath, depth + 1);
                if (sql != null) {
                    parts.add(sql);
                }
            }
            if (parts.isEmpty()) {
                return null;
            }
            return parts.size() == 1 ? parts.getFirst() : "(" + String.join(joiner, parts) + ")";
        }

        String rule(QueryJson rule, String path) {
            if (++rules > MAX_RULES) {
                throw ApiException.badRequest("O filtro passa de " + MAX_RULES + " regras");
            }
            if ((rule.rules() != null && !rule.rules().isEmpty())
                    || (rule.groups() != null && !rule.groups().isEmpty())) {
                throw ApiException.badRequest(path + ": regra não tem rules nem groups; use um grupo");
            }
            if (rule.field() == null || rule.field().isBlank()) {
                throw ApiException.badRequest(path + ": field é obrigatório");
            }
            QueryField field = fields.get(rule.field());
            if (field == null) {
                throw ApiException.badRequest(path + ": campo desconhecido \"" + rule.field() + "\". Use "
                        + String.join(", ", fields.keySet()));
            }
            Operator operator = Operator.fromCode(rule.operator())
                    .filter(field.operators()::contains)
                    .orElseThrow(() -> ApiException.badRequest(path + ": operador \"" + rule.operator()
                            + "\" não vale para " + field.name() + " (" + field.type().code() + "). Use "
                            + field.operators().stream().map(Operator::code).collect(Collectors.joining(", "))));

            return "(" + field.condition().sql(operator, values(field, operator, rule.value(), path), params) + ")";
        }

        private List<Object> values(QueryField field, Operator operator, Object value, String path) {
            return switch (operator.arity()) {
                case NONE -> List.of();
                case ONE -> {
                    if (value instanceof List<?>) {
                        throw ApiException.badRequest(path + ": " + operator.code() + " recebe um valor só; "
                                + "para vários, use in");
                    }
                    yield List.of(field.convert(value, path));
                }
                case LIST -> {
                    List<?> list = value instanceof List<?> many ? many : value == null ? List.of() : List.of(value);
                    if (list.size() > MAX_VALUES) {
                        throw ApiException.badRequest(path + ": " + operator.code() + " aceita até " + MAX_VALUES
                                + " valores");
                    }
                    List<Object> converted = new ArrayList<>(list.size());
                    for (int i = 0; i < list.size(); i++) {
                        converted.add(field.convert(list.get(i), path + ".value[" + i + "]"));
                    }
                    yield converted.stream().distinct().toList();
                }
                case PAIR -> {
                    List<Object> pair = fixed(field, value, 2, path, "[mínimo, máximo]");
                    if (compare(pair.get(0), pair.get(1)) > 0) {
                        throw ApiException.badRequest(path + ": o mínimo não pode passar do máximo");
                    }
                    yield pair;
                }
                case BOX -> {
                    List<Object> box = fixed(field, value, 4, path, "[minX, minY, maxX, maxY]");
                    if (compare(box.get(0), box.get(2)) > 0 || compare(box.get(1), box.get(3)) > 0) {
                        throw ApiException.badRequest(path + ": o mínimo não pode passar do máximo");
                    }
                    yield box;
                }
            };
        }

        private List<Object> fixed(QueryField field, Object value, int size, String path, String shape) {
            if (!(value instanceof List<?> list) || list.size() != size) {
                throw ApiException.badRequest(path + ": value precisa ser " + shape);
            }
            List<Object> converted = new ArrayList<>(size);
            for (int i = 0; i < size; i++) {
                converted.add(field.convert(list.get(i), path + ".value[" + i + "]"));
            }
            return converted;
        }
    }

    private static String joiner(String operator, String path) {
        if (operator == null || QueryJson.AND.equalsIgnoreCase(operator)) {
            return " AND ";
        }
        if (QueryJson.OR.equalsIgnoreCase(operator)) {
            return " OR ";
        }
        throw ApiException.badRequest(path + ": operador de grupo \"" + operator + "\" inválido. Use and ou or");
    }

    private static QueryJson required(QueryJson node, String path) {
        if (node == null) {
            throw ApiException.badRequest(path + " não pode ser nulo");
        }
        if (node.type() == null) {
            throw ApiException.badRequest(path + ": type é obrigatório, rule ou group");
        }
        return node;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static int compare(Object a, Object b) {
        return a instanceof Comparable comparable ? comparable.compareTo(b) : 0;
    }
}
