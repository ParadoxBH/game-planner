package com.paradoxbh.gameplannerserver.content.store;

import java.sql.Types;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.MediaUsages;
import com.paradoxbh.gameplannerserver.content.model.MediaLink;

/**
 * A tabela content_media: qual mídia está em qual conteúdo (ou jogo), com qual uso, em que
 * posição, e quem a ligou e quando.
 */
@Repository
public class ContentMediaRepository {

    /** Onde uma mídia está sendo usada. */
    public record MediaUse(String gameId, String kind, String extId, String usage) {
    }

    /** Ordena por uso na ordem de exibição; estável, então preserva a posição dentro do uso. */
    private static final Comparator<MediaLink> BY_USAGE =
            Comparator.comparingInt((MediaLink link) -> MediaUsages.position(link.usage()));

    private final JdbcClient jdbc;

    public ContentMediaRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Mídias de vários conteúdos do mesmo tipo num jogo, por ext_id. */
    public Map<String, List<MediaLink>> load(String gameId, String kind, Collection<String> extIds) {
        if (extIds.isEmpty()) {
            return Map.of();
        }
        Map<String, List<MediaLink>> result = new HashMap<>();
        jdbc.sql("""
                SELECT ext_id, usage, media_id, added_by, added_at FROM content_media
                WHERE game_id = :game AND kind = :kind AND ext_id IN (:ids)
                ORDER BY ext_id, usage, ordinal
                """)
                .param("game", gameId).param("kind", kind).param("ids", extIds)
                .query(rs -> {
                    result.computeIfAbsent(rs.getString("ext_id"), key -> new ArrayList<>())
                            .add(new MediaLink(rs.getString("usage"), rs.getString("media_id"),
                                    rs.getString("added_by"), rs.getTimestamp("added_at").toInstant()));
                });
        result.values().forEach(links -> links.sort(BY_USAGE));
        return result;
    }

    /** Mídias do próprio jogo, para vários jogos de uma vez, por game_id. */
    public Map<String, List<MediaLink>> loadForGames(Collection<String> gameIds) {
        if (gameIds.isEmpty()) {
            return Map.of();
        }
        Map<String, List<MediaLink>> result = new HashMap<>();
        jdbc.sql("""
                SELECT game_id, usage, media_id, added_by, added_at FROM content_media
                WHERE kind = :kind AND game_id IN (:ids)
                ORDER BY game_id, usage, ordinal
                """)
                .param("kind", MediaUsages.GAME_KIND).param("ids", gameIds)
                .query(rs -> {
                    result.computeIfAbsent(rs.getString("game_id"), key -> new ArrayList<>())
                            .add(new MediaLink(rs.getString("usage"), rs.getString("media_id"),
                                    rs.getString("added_by"), rs.getTimestamp("added_at").toInstant()));
                });
        result.values().forEach(links -> links.sort(BY_USAGE));
        return result;
    }

    /**
     * Substitui as ligações do conteúdo pela lista dada, já canônica.
     *
     * A escrita é do documento inteiro, mas a autoria de cada foto não pode ser zerada a cada
     * edição: a mesma imagem no mesmo uso mantém quem a adicionou e quando. Só o que é novo
     * leva o autor e a hora desta escrita.
     */
    public void replace(String gameId, String kind, String extId, List<MediaLink> links, String actor) {
        Map<String, MediaLink> previous = new HashMap<>();
        jdbc.sql("""
                SELECT usage, media_id, added_by, added_at FROM content_media
                WHERE game_id = :game AND kind = :kind AND ext_id = :ext
                """)
                .param("game", gameId).param("kind", kind).param("ext", extId)
                .query(rs -> {
                    previous.put(key(rs.getString("usage"), rs.getString("media_id")),
                            new MediaLink(rs.getString("usage"), rs.getString("media_id"),
                                    rs.getString("added_by"), rs.getTimestamp("added_at").toInstant()));
                });

        deleteAll(gameId, kind, extId);

        Map<String, Integer> nextOrdinal = new HashMap<>();
        for (MediaLink link : links) {
            int ordinal = nextOrdinal.merge(link.usage(), 1, Integer::sum) - 1;
            MediaLink kept = previous.get(key(link.usage(), link.mediaId()));
            jdbc.sql("""
                    INSERT INTO content_media (game_id, kind, ext_id, usage, media_id, ordinal, added_by, added_at)
                    VALUES (:game, :kind, :ext, :usage, :media, :ordinal, :addedBy, coalesce(:addedAt, now()))
                    """)
                    .param("game", gameId).param("kind", kind).param("ext", extId)
                    .param("usage", link.usage()).param("media", link.mediaId()).param("ordinal", ordinal)
                    .param("addedBy", kept != null ? kept.addedBy() : actor)
                    .param("addedAt", kept != null ? OffsetDateTime.ofInstant(kept.addedAt(), ZoneOffset.UTC) : null,
                            Types.TIMESTAMP_WITH_TIMEZONE)
                    .update();
        }
    }

    /** Imagens de um código de conteúdo, exista o registro ou não. */
    public List<MediaLink> list(String gameId, String kind, String extId) {
        return load(gameId, kind, List.of(extId)).getOrDefault(extId, List.of());
    }

    /**
     * Acrescenta a imagem no fim do uso. Idempotente: a mesma imagem no mesmo uso não é ligada
     * de novo e mantém a autoria original. Devolve true se ligou agora.
     */
    public boolean add(String gameId, String kind, String extId, String usage, String mediaId, String actor) {
        return jdbc.sql("""
                INSERT INTO content_media (game_id, kind, ext_id, usage, media_id, ordinal, added_by)
                SELECT :game, :kind, :ext, :usage, :media,
                       coalesce((SELECT max(ordinal) + 1 FROM content_media
                                  WHERE game_id = :game AND kind = :kind AND ext_id = :ext AND usage = :usage), 0),
                       :actor
                ON CONFLICT (game_id, kind, ext_id, usage, media_id) DO NOTHING
                """)
                .param("game", gameId).param("kind", kind).param("ext", extId)
                .param("usage", usage).param("media", mediaId).param("actor", actor)
                .update() > 0;
    }

    /** Desfaz uma ligação. Devolve false se ela não existia. */
    public boolean remove(String gameId, String kind, String extId, String usage, String mediaId) {
        return jdbc.sql("""
                DELETE FROM content_media
                WHERE game_id = :game AND kind = :kind AND ext_id = :ext AND usage = :usage AND media_id = :media
                """)
                .param("game", gameId).param("kind", kind).param("ext", extId)
                .param("usage", usage).param("media", mediaId)
                .update() > 0;
    }

    public void deleteAll(String gameId, String kind, String extId) {
        jdbc.sql("DELETE FROM content_media WHERE game_id = :game AND kind = :kind AND ext_id = :ext")
                .param("game", gameId).param("kind", kind).param("ext", extId)
                .update();
    }

    public List<MediaUse> usesOf(String mediaId) {
        return jdbc.sql("""
                SELECT game_id, kind, ext_id, usage FROM content_media
                WHERE media_id = :media ORDER BY game_id, kind, ext_id, usage
                """)
                .param("media", mediaId)
                .query((rs, rowNum) -> new MediaUse(rs.getString("game_id"), rs.getString("kind"),
                        rs.getString("ext_id"), rs.getString("usage")))
                .list();
    }

    /** 422 listando as mídias que não existem. Ligar mídia exige que ela tenha sido enviada antes. */
    public void requireExisting(Collection<String> mediaIds) {
        if (mediaIds.isEmpty()) {
            return;
        }
        Set<String> found = jdbc.sql("SELECT id FROM media WHERE id IN (:ids)")
                .param("ids", mediaIds)
                .query(String.class).set();
        List<String> missing = mediaIds.stream().filter(id -> !found.contains(id)).distinct().toList();
        if (!missing.isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "media-not-found",
                    "Mídia não encontrada: " + String.join(", ", missing)
                            + ". Envie a imagem em POST /api/v1/media antes de ligá-la.",
                    Map.of("missingMedia", missing));
        }
    }

    private static String key(String usage, String mediaId) {
        return usage + " " + mediaId;
    }
}
