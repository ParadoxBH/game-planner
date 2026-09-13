package com.paradoxbh.gameplannerserver.content.store;

import java.math.BigDecimal;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.MediaLink;

@Repository
public class ContentTagsRepository {

    private final JdbcClient jdbc;
    private final ContentMediaRepository media;

    public ContentTagsRepository(JdbcClient jdbc, ContentMediaRepository media) {
        this.jdbc = jdbc;
        this.media = media;
    }

    /** Etiquetas de vários conteúdos de uma vez: uma consulta por tabela, não uma por conteúdo. */
    public Map<String, ContentTags> load(String gameId, ContentKind kind, Collection<String> extIds) {
        if (extIds.isEmpty()) {
            return Map.of();
        }

        Map<String, List<String>> categories = new HashMap<>();
        jdbc.sql("""
                SELECT ext_id, category_ext_id FROM content_category
                WHERE game_id = :game AND kind = :kind AND ext_id IN (:ids)
                ORDER BY ext_id, ordinal
                """)
                .param("game", gameId).param("kind", kind.code()).param("ids", extIds)
                .query(rs -> {
                    categories.computeIfAbsent(rs.getString("ext_id"), key -> new ArrayList<>())
                            .add(rs.getString("category_ext_id"));
                });

        Map<String, List<String>> events = new HashMap<>();
        jdbc.sql("""
                SELECT ext_id, event_ext_id FROM content_event
                WHERE game_id = :game AND kind = :kind AND ext_id IN (:ids)
                ORDER BY ext_id, event_ext_id
                """)
                .param("game", gameId).param("kind", kind.code()).param("ids", extIds)
                .query(rs -> {
                    events.computeIfAbsent(rs.getString("ext_id"), key -> new ArrayList<>())
                            .add(rs.getString("event_ext_id"));
                });

        // Ordem de exibição: a da definição do atributo, quando existe; depois, a chave.
        Map<String, Map<String, Object>> attributes = new HashMap<>();
        jdbc.sql("""
                SELECT a.ext_id, a.key, a.value_num, a.value_text, a.value_bool
                FROM content_attribute a
                LEFT JOIN attribute_definition d ON d.game_id = a.game_id AND d.key = a.key
                WHERE a.game_id = :game AND a.kind = :kind AND a.ext_id IN (:ids)
                ORDER BY a.ext_id, coalesce(d.ordinal, 2147483647), a.key
                """)
                .param("game", gameId).param("kind", kind.code()).param("ids", extIds)
                .query(rs -> {
                    BigDecimal number = rs.getBigDecimal("value_num");
                    String text = rs.getString("value_text");
                    Object value = number != null ? number : text != null ? text : (Object) rs.getBoolean("value_bool");
                    attributes.computeIfAbsent(rs.getString("ext_id"), key -> new LinkedHashMap<>())
                            .put(rs.getString("key"), value);
                });

        Map<String, List<MediaLink>> links = media.load(gameId, kind.code(), extIds);

        Map<String, ContentTags> result = new HashMap<>();
        for (String extId : extIds) {
            result.put(extId, new ContentTags(
                    List.copyOf(categories.getOrDefault(extId, List.of())),
                    List.copyOf(events.getOrDefault(extId, List.of())),
                    Collections.unmodifiableMap(attributes.getOrDefault(extId, new LinkedHashMap<>())),
                    List.copyOf(links.getOrDefault(extId, List.of()))));
        }
        return result;
    }

    /**
     * Substitui o que o conteúdo guarda fora da própria tabela: a escrita é do agregado inteiro.
     * Imagens só quando {@code tags.media()} vem preenchido; nulo deixa as ligações como estão.
     */
    public void replace(String gameId, ContentKind kind, String extId, ContentTags tags, String actor) {
        deleteCategoriesEventsAttributes(gameId, kind, extId);

        List<String> categories = tags.categories();
        for (int ordinal = 0; ordinal < categories.size(); ordinal++) {
            jdbc.sql("""
                    INSERT INTO content_category (game_id, kind, ext_id, ordinal, category_ext_id)
                    VALUES (:game, :kind, :ext, :ordinal, :target)
                    """)
                    .param("game", gameId).param("kind", kind.code()).param("ext", extId)
                    .param("ordinal", ordinal).param("target", categories.get(ordinal))
                    .update();
        }

        for (String event : tags.events()) {
            jdbc.sql("""
                    INSERT INTO content_event (game_id, kind, ext_id, event_ext_id)
                    VALUES (:game, :kind, :ext, :target)
                    """)
                    .param("game", gameId).param("kind", kind.code()).param("ext", extId).param("target", event)
                    .update();
        }

        tags.attributes().forEach((key, value) -> jdbc.sql("""
                        INSERT INTO content_attribute (game_id, kind, ext_id, key, value_num, value_text, value_bool)
                        VALUES (:game, :kind, :ext, :key, :num, :text, :bool)
                        """)
                .param("game", gameId).param("kind", kind.code()).param("ext", extId).param("key", key)
                .param("num", value instanceof BigDecimal ? value : null, Types.NUMERIC)
                .param("text", value instanceof String ? value : null, Types.VARCHAR)
                .param("bool", value instanceof Boolean ? value : null, Types.BOOLEAN)
                .update());

        if (tags.media() != null) {
            media.replace(gameId, kind.code(), extId, tags.media(), actor);
        }
    }

    /**
     * Remove categorias, eventos e atributos do conteúdo. Ligações de mídia não: pertencem ao
     * código do registro e continuam valendo se ele for restaurado ou recriado.
     */
    public void deleteCategoriesEventsAttributes(String gameId, ContentKind kind, String extId) {
        for (String table : List.of("content_category", "content_event", "content_attribute")) {
            jdbc.sql("DELETE FROM " + table + " WHERE game_id = :game AND kind = :kind AND ext_id = :ext")
                    .param("game", gameId).param("kind", kind.code()).param("ext", extId)
                    .update();
        }
    }
}
