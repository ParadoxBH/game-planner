package com.paradoxbh.gameplannerserver.content.store;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class AttributeDefinitionRepository {

    public record AttributeDefinition(String key, String label, String dataType, String unit, int ordinal) {
    }

    private final JdbcClient jdbc;

    public AttributeDefinitionRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<AttributeDefinition> list(String gameId) {
        return jdbc.sql("""
                SELECT key, label, data_type, unit, ordinal FROM attribute_definition
                WHERE game_id = :game ORDER BY ordinal, key
                """)
                .param("game", gameId)
                .query((rs, rowNum) -> new AttributeDefinition(rs.getString("key"), rs.getString("label"),
                        rs.getString("data_type"), rs.getString("unit"), rs.getInt("ordinal")))
                .list();
    }

    public void upsert(String gameId, AttributeDefinition definition) {
        jdbc.sql("""
                INSERT INTO attribute_definition (game_id, key, label, data_type, unit, ordinal)
                VALUES (:game, :key, :label, :type, :unit, :ordinal)
                ON CONFLICT (game_id, key) DO UPDATE
                   SET label = excluded.label, data_type = excluded.data_type,
                       unit = excluded.unit, ordinal = excluded.ordinal
                """)
                .param("game", gameId).param("key", definition.key()).param("label", definition.label())
                .param("type", definition.dataType()).param("unit", definition.unit())
                .param("ordinal", definition.ordinal())
                .update();
    }

    public boolean delete(String gameId, String key) {
        return jdbc.sql("DELETE FROM attribute_definition WHERE game_id = :game AND key = :key")
                .param("game", gameId).param("key", key)
                .update() > 0;
    }

    /** Chave → tipo declarado, para conferir valores na escrita. */
    public Map<String, String> types(String gameId) {
        Map<String, String> types = new HashMap<>();
        jdbc.sql("SELECT key, data_type FROM attribute_definition WHERE game_id = :game")
                .param("game", gameId)
                .query(rs -> {
                    types.put(rs.getString("key"), rs.getString("data_type"));
                });
        return types;
    }
}
