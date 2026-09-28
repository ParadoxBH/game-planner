package com.paradoxbh.gameplannerserver.content.store;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class AttributeDefinitionRepository {

    /**
     * {@code group}: seção em que o atributo aparece (Dano, Comida...), V21; nulo cai em "Outros".
     * {@code levelIncrementOf}: atributo que este aumenta a cada nível do item (V22), ex.: damage_per_level_slash
     * aumenta damage_slash; nulo, nenhum.
     */
    public record AttributeDefinition(String key, String label, String dataType, String unit, String group,
                                      int ordinal, String levelIncrementOf) {
    }

    /**
     * Uso de uma chave de atributo no jogo, com ou sem definição: quantos itens e entidades a têm e se
     * todo valor gravado é número.
     */
    public record AttributeUsage(String key, long items, long entities, boolean numeric) {
    }

    private final JdbcClient jdbc;

    public AttributeDefinitionRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<AttributeDefinition> list(String gameId) {
        return jdbc.sql("""
                SELECT key, label, data_type, unit, group_label, ordinal, level_increment_of FROM attribute_definition
                WHERE game_id = :game ORDER BY ordinal, key
                """)
                .param("game", gameId)
                .query((rs, rowNum) -> new AttributeDefinition(rs.getString("key"), rs.getString("label"),
                        rs.getString("data_type"), rs.getString("unit"), rs.getString("group_label"),
                        rs.getInt("ordinal"), rs.getString("level_increment_of")))
                .list();
    }

    public void upsert(String gameId, AttributeDefinition definition) {
        jdbc.sql("""
                INSERT INTO attribute_definition (game_id, key, label, data_type, unit, group_label, ordinal,
                                                  level_increment_of)
                VALUES (:game, :key, :label, :type, :unit, :group, :ordinal, :levelIncrementOf)
                ON CONFLICT (game_id, key) DO UPDATE
                   SET label = excluded.label, data_type = excluded.data_type,
                       unit = excluded.unit, group_label = excluded.group_label, ordinal = excluded.ordinal,
                       level_increment_of = excluded.level_increment_of
                """)
                .param("game", gameId).param("key", definition.key()).param("label", definition.label())
                .param("type", definition.dataType()).param("unit", definition.unit())
                .param("group", definition.group())
                .param("ordinal", definition.ordinal())
                .param("levelIncrementOf", definition.levelIncrementOf())
                .update();
    }

    public List<AttributeUsage> usage(String gameId) {
        return jdbc.sql("""
                SELECT key, count(*) FILTER (WHERE kind = 'item') AS items,
                       count(*) FILTER (WHERE kind = 'entity') AS entities,
                       bool_and(value_num IS NOT NULL) AS numeric
                FROM content_attribute
                WHERE game_id = :game
                GROUP BY key
                ORDER BY key
                """)
                .param("game", gameId)
                .query((rs, rowNum) -> new AttributeUsage(rs.getString("key"), rs.getLong("items"),
                        rs.getLong("entities"), rs.getBoolean("numeric")))
                .list();
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
