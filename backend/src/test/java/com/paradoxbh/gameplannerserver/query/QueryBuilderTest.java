package com.paradoxbh.gameplannerserver.query;

import static com.paradoxbh.gameplannerserver.query.QueryJson.and;
import static com.paradoxbh.gameplannerserver.query.QueryJson.or;
import static com.paradoxbh.gameplannerserver.query.QueryJson.rule;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.query.QueryField.Option;

import tools.jackson.databind.json.JsonMapper;

class QueryBuilderTest {

    private static final QueryBuilder BUILDER = new QueryBuilder(List.of(
            QueryField.column("name", "Nome", FieldType.TEXT, "t.name"),
            QueryField.column("level", "Nível", FieldType.NUMBER, "t.level"),
            QueryField.column("periodStart", "Início", FieldType.DATE, "t.period_start"),
            QueryField.column("position", "Posição", FieldType.GEOMETRY, "t.position"),
            QueryField.code("rarity", "Raridade", "rarity", "t.rarity_code"),
            QueryField.options("appliesTo", "Aplica-se a", "t.applies_to", new Option("item", "Item"),
                    new Option("both", "Ambos")),
            QueryField.flag("sellable", "Vendível", "t.sell IS NOT NULL"),
            QueryField.has("category", "Categoria", FieldType.CODE, "category",
                    match -> "EXISTS (SELECT 1 FROM c WHERE " + match.code("c.category") + ")"),
            QueryField.has("drops", "Dropa", FieldType.REFERENCE, null,
                    match -> "EXISTS (SELECT 1 FROM d WHERE " + match.reference("d.kind", "d.ext") + ")")));

    private final Map<String, Object> params = new HashMap<>();

    @Test
    void emptyOrMissingGroupDoesNotFilter() {
        assertThat(BUILDER.where(null, params)).isEqualTo("TRUE");
        assertThat(BUILDER.where(and(), params)).isEqualTo("TRUE");
        assertThat(BUILDER.where(and(or(), and()), params)).isEqualTo("TRUE");
        assertThat(params).isEmpty();
    }

    @Test
    void rulesAndGroupsBecomeParameterizedSql() {
        String sql = BUILDER.where(and(
                rule("name", "contains", "50%_off"),
                rule("level", "between", List.of(1, 10)),
                or(rule("rarity", "in", List.of("rare", "epic")), rule("rarity", "is_null"))), params);

        assertThat(sql).isEqualTo("((t.name ILIKE :q0) AND (t.level BETWEEN :q1 AND :q2)"
                + " AND ((t.rarity_code IN (:q3)) OR (t.rarity_code IS NULL)))");
        assertThat(params).containsEntry("q0", "%50\\%\\_off%")
                .containsEntry("q1", new BigDecimal("1"))
                .containsEntry("q2", new BigDecimal("10"))
                .containsEntry("q3", List.of("rare", "epic"));
    }

    @Test
    void negationsKeepRowsWithoutValue() {
        assertThat(BUILDER.where(and(rule("rarity", "not_equal", "rare")), params))
                .isEqualTo("(t.rarity_code IS DISTINCT FROM :q0)");
        params.clear();
        assertThat(BUILDER.where(and(rule("rarity", "not_in", List.of("rare"))), params))
                .isEqualTo("((t.rarity_code IS NULL OR t.rarity_code NOT IN (:q0)))");
        params.clear();
        assertThat(BUILDER.where(and(rule("sellable", "equal", false)), params))
                .isEqualTo("(NOT COALESCE((t.sell IS NOT NULL), FALSE))");
    }

    @Test
    void listFieldsTestMembership() {
        assertThat(BUILDER.where(and(rule("category", "equal", "flor")), params))
                .isEqualTo("(EXISTS (SELECT 1 FROM c WHERE c.category = :q0))");
        params.clear();
        assertThat(BUILDER.where(and(rule("category", "not_in", List.of("flor", "raro"))), params))
                .isEqualTo("(NOT COALESCE(EXISTS (SELECT 1 FROM c WHERE c.category IN (:q0)), FALSE))");
        params.clear();
        assertThat(BUILDER.where(and(rule("category", "is_null")), params))
                .isEqualTo("(NOT COALESCE(EXISTS (SELECT 1 FROM c WHERE c.category IS NOT NULL), FALSE))");
        params.clear();

        assertThat(BUILDER.where(and(rule("drops", "in", List.of("item:ouro", "prata"))), params))
                .isEqualTo("(EXISTS (SELECT 1 FROM d WHERE ((d.ext = :q0 AND (d.kind IS NULL OR d.kind = :q1))"
                        + " OR (d.ext = :q2))))");
        assertThat(params).containsEntry("q0", "ouro").containsEntry("q1", "item").containsEntry("q2", "prata");
    }

    @Test
    void emptyListMatchesNothingAndItsNegationEverything() {
        assertThat(BUILDER.where(and(rule("rarity", "in", List.of())), params)).isEqualTo("(FALSE)");
        assertThat(BUILDER.where(and(rule("category", "not_in", List.of())), params)).isEqualTo("(TRUE)");
    }

    @Test
    void valuesAreConvertedByType() {
        BUILDER.where(and(rule("periodStart", "greater", "2026-09-18"),
                rule("position", "intersects", List.of(0, 0, 100.5, 100))), params);
        assertThat(params).containsEntry("q0", LocalDate.of(2026, 9, 18)).containsEntry("q3", 100.5);
    }

    @Test
    void parameterNamesDoNotCollideWithTheQueryOwn() {
        params.put("q0", "já em uso");
        assertThat(BUILDER.where(and(rule("level", "equal", 3)), params)).isEqualTo("(t.level = :q1)");
    }

    @Test
    void rejectsWhatTheFieldDoesNotAccept() {
        assertBadRequest(and(rule("peso", "equal", 1)), "query.rules[0]: campo desconhecido \"peso\"");
        assertBadRequest(and(rule("level", "contains", "1")), "operador \"contains\" não vale para level (number)");
        assertBadRequest(and(rule("level", "equal", "dez")), "value precisa ser número");
        assertBadRequest(and(rule("level", "equal", List.of(1, 2))), "para vários, use in");
        assertBadRequest(and(rule("level", "between", List.of(10, 1))), "o mínimo não pode passar do máximo");
        assertBadRequest(and(rule("appliesTo", "equal", "mapa")), "\"mapa\" não é opção de appliesTo");
        assertBadRequest(and(rule("sellable", "equal", "sim")), "value precisa ser true ou false");
        assertBadRequest(and(rule("rarity", "equal", "a/b")), "query.rules[0] inválido");
        assertBadRequest(and(or(rule("name", "equal", null))), "query.groups[0].rules[0]: value é obrigatório");
        assertBadRequest(rule("name", "equal", "x"), "query precisa ser um grupo");
        assertBadRequest(QueryJson.group("xor", List.of(), List.of()), "operador de grupo \"xor\"");
        assertBadRequest(QueryJson.group("and", List.of(and()), List.of()), "rules só tem regras");
    }

    @Test
    void limitsDepth() {
        QueryJson deep = and(rule("level", "equal", 1));
        for (int i = 0; i < QueryBuilder.MAX_DEPTH; i++) {
            deep = and(deep);
        }
        QueryJson tooDeep = deep;
        assertThatThrownBy(() -> BUILDER.where(tooDeep, params))
                .isInstanceOf(ApiException.class).hasMessageContaining("níveis");
    }

    @Test
    void readsTheJsonTheFrontSends() {
        QueryJson query = JsonMapper.builder().build().readValue("""
                {"type": "group", "operator": "or",
                 "rules": [{"type": "rule", "field": "level", "operator": "greater_or_equal", "value": 2.5}],
                 "groups": [{"type": "group", "operator": "and", "rules": [
                     {"type": "rule", "field": "drops", "operator": "equal", "value": "item:ouro"}], "groups": []}]}
                """, QueryJson.class);

        assertThat(BUILDER.where(query, params)).isEqualTo("((t.level >= :q0) OR "
                + "(EXISTS (SELECT 1 FROM d WHERE (d.ext = :q1 AND (d.kind IS NULL OR d.kind = :q2)))))");
        assertThat(params).containsEntry("q0", new BigDecimal("2.5"));
    }

    @Test
    void describesFieldsForTheFront() {
        String json = JsonMapper.builder().build().writeValueAsString(BUILDER.fields().get(5));
        assertThat(json).isEqualTo("{\"name\":\"appliesTo\",\"label\":\"Aplica-se a\",\"type\":\"enum\","
                + "\"operators\":[\"equal\",\"not_equal\",\"in\",\"not_in\"],"
                + "\"options\":[{\"value\":\"item\",\"label\":\"Item\"},{\"value\":\"both\",\"label\":\"Ambos\"}]}");
        assertThat(JsonMapper.builder().build().writeValueAsString(BUILDER.fields().get(4)))
                .contains("\"type\":\"code\"", "\"kind\":\"rarity\"").doesNotContain("options");
    }

    @Test
    void writesOnlyTheShapeOfTheQueryJson() {
        assertThat(JsonMapper.builder().build().writeValueAsString(and(rule("level", "equal", 1))))
                .isEqualTo("{\"type\":\"group\",\"operator\":\"and\",\"rules\":["
                        + "{\"type\":\"rule\",\"operator\":\"equal\",\"field\":\"level\",\"value\":1}],"
                        + "\"groups\":[]}");
    }

    private void assertBadRequest(QueryJson query, String message) {
        assertThatThrownBy(() -> BUILDER.where(query, new HashMap<>()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining(message);
    }
}
