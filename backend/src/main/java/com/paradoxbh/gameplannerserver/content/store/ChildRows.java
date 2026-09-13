package com.paradoxbh.gameplannerserver.content.store;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Linhas-filhas posicionais de um conteúdo, com chave (game_id, código do pai, ordinal): o mesmo
 * alvo pode se repetir na lista (ver doc/backend_plan.md 3.7). A escrita apaga e regrava a lista
 * inteira, junto com o pai.
 *
 * Tabela e colunas vêm de código, nunca de entrada do usuário; valores sempre por parâmetro.
 */
@Repository
public class ChildRows {

    /**
     * Onde ficam as linhas: tabela, coluna com o código do pai e colunas de valor fixo que também
     * fazem parte da chave, ex.: source_kind = 'entity' em drop_entry.
     */
    public record Table(String name, String parentColumn, Map<String, String> fixed) {

        public Table {
            fixed = Map.copyOf(fixed);
        }

        public static Table of(String name, String parentColumn) {
            return new Table(name, parentColumn, Map.of());
        }
    }

    private final JdbcClient jdbc;

    public ChildRows(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Linha como mapa ordenado coluna → valor, aceitando nulo. */
    public static Map<String, Object> row(Object... columnsAndValues) {
        Map<String, Object> row = new LinkedHashMap<>();
        for (int i = 0; i < columnsAndValues.length; i += 2) {
            row.put((String) columnsAndValues[i], columnsAndValues[i + 1]);
        }
        return row;
    }

    /** Linhas de vários pais de uma vez, por código do pai, na ordem de cada lista. */
    public <T> Map<String, List<T>> load(Table table, String gameId, Collection<String> parentIds,
                                         Function<Map<String, Object>, T> mapper) {
        if (parentIds.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> params = params(table, gameId);
        params.put("parents", parentIds);

        Map<String, List<T>> result = new HashMap<>();
        jdbc.sql("SELECT * FROM " + table.name() + where(table) + " AND " + table.parentColumn()
                        + " IN (:parents) ORDER BY " + table.parentColumn() + ", ordinal")
                .params(params)
                .query().listOfRows()
                .forEach(row -> result.computeIfAbsent(Rows.string(row, table.parentColumn()), key -> new ArrayList<>())
                        .add(mapper.apply(row)));
        return result;
    }

    /** Substitui as linhas do pai. Cada mapa é uma linha; o ordinal é a posição na lista. */
    public void replace(Table table, String gameId, String parentId, List<Map<String, Object>> rows) {
        delete(table, gameId, parentId);
        for (int ordinal = 0; ordinal < rows.size(); ordinal++) {
            Map<String, Object> params = params(table, gameId);
            params.put("parent", parentId);
            params.put("ordinal", ordinal);

            List<String> columns = new ArrayList<>(List.of("game_id", table.parentColumn(), "ordinal"));
            List<String> values = new ArrayList<>(List.of(":game", ":parent", ":ordinal"));
            for (String column : table.fixed().keySet()) {
                columns.add(column);
                values.add(":fixed_" + column);
            }
            int index = 0;
            for (Map.Entry<String, Object> entry : rows.get(ordinal).entrySet()) {
                columns.add(entry.getKey());
                values.add(":v" + index);
                params.put("v" + index, entry.getValue());
                index++;
            }

            jdbc.sql("INSERT INTO " + table.name() + " (" + String.join(", ", columns) + ") VALUES ("
                            + String.join(", ", values) + ")")
                    .params(params)
                    .update();
        }
    }

    public void delete(Table table, String gameId, String parentId) {
        Map<String, Object> params = params(table, gameId);
        params.put("parent", parentId);
        jdbc.sql("DELETE FROM " + table.name() + where(table) + " AND " + table.parentColumn() + " = :parent")
                .params(params)
                .update();
    }

    private static Map<String, Object> params(Table table, String gameId) {
        Map<String, Object> params = new HashMap<>();
        params.put("game", gameId);
        table.fixed().forEach((column, value) -> params.put("fixed_" + column, value));
        return params;
    }

    private static String where(Table table) {
        StringBuilder where = new StringBuilder(" WHERE game_id = :game");
        for (String column : table.fixed().keySet()) {
            where.append(" AND ").append(column).append(" = :fixed_").append(column);
        }
        return where.toString();
    }
}
