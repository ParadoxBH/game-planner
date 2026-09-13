package com.paradoxbh.gameplannerserver.content.store;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentPage;

@Repository
public class RevisionRepository {

    public record RevisionSummary(int revision, String operation, String changedBy, Instant changedAt) {
    }

    public record Change(String kind, String extId, int revision, String operation, String changedBy,
                         Instant changedAt) {
    }

    private final JdbcClient jdbc;

    public RevisionRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public int next(String gameId, ContentKind kind, String extId) {
        return jdbc.sql("""
                SELECT coalesce(max(revision), 0) + 1 FROM content_revision
                WHERE game_id = :game AND kind = :kind AND ext_id = :ext
                """)
                .param("game", gameId).param("kind", kind.code()).param("ext", extId)
                .query(Integer.class).single();
    }

    public void record(String gameId, ContentKind kind, String extId, int revision, String operation,
                       String actor, String snapshot) {
        jdbc.sql("""
                INSERT INTO content_revision (game_id, kind, ext_id, revision, operation, changed_by, snapshot)
                VALUES (:game, :kind, :ext, :revision, :operation, :actor, CAST(:snapshot AS jsonb))
                """)
                .param("game", gameId).param("kind", kind.code()).param("ext", extId)
                .param("revision", revision).param("operation", operation).param("actor", actor)
                .param("snapshot", snapshot)
                .update();
    }

    /** Mais recente primeiro. Continua existindo depois que o conteúdo é apagado. */
    public List<RevisionSummary> list(String gameId, ContentKind kind, String extId) {
        return jdbc.sql("""
                SELECT revision, operation, changed_by, changed_at FROM content_revision
                WHERE game_id = :game AND kind = :kind AND ext_id = :ext
                ORDER BY revision DESC
                """)
                .param("game", gameId).param("kind", kind.code()).param("ext", extId)
                .query((rs, rowNum) -> new RevisionSummary(rs.getInt("revision"), rs.getString("operation"),
                        rs.getString("changed_by"), rs.getTimestamp("changed_at").toInstant()))
                .list();
    }

    public Optional<String> snapshot(String gameId, ContentKind kind, String extId, int revision) {
        return jdbc.sql("""
                SELECT snapshot::text FROM content_revision
                WHERE game_id = :game AND kind = :kind AND ext_id = :ext AND revision = :revision
                """)
                .param("game", gameId).param("kind", kind.code()).param("ext", extId).param("revision", revision)
                .query(String.class).optional();
    }

    /** Mudanças recentes do jogo, opcionalmente só de um autor — a base para desfazer estrago em massa. */
    public ContentPage<Change> changes(String gameId, Instant since, String changedBy, int page, int size) {
        Map<String, Object> params = new HashMap<>();
        params.put("game", gameId);
        StringBuilder where = new StringBuilder(" WHERE game_id = :game");
        if (since != null) {
            where.append(" AND changed_at >= :since");
            params.put("since", OffsetDateTime.ofInstant(since, ZoneOffset.UTC));
        }
        if (changedBy != null && !changedBy.isBlank()) {
            where.append(" AND changed_by = :by");
            params.put("by", changedBy);
        }

        long total = jdbc.sql("SELECT count(*) FROM content_revision" + where)
                .params(params).query(Long.class).single();

        params.put("limit", size);
        params.put("offset", (long) page * size);
        List<Change> content = jdbc.sql("SELECT kind, ext_id, revision, operation, changed_by, changed_at"
                        + " FROM content_revision" + where
                        + " ORDER BY changed_at DESC, kind, ext_id, revision DESC LIMIT :limit OFFSET :offset")
                .params(params)
                .query((rs, rowNum) -> new Change(rs.getString("kind"), rs.getString("ext_id"),
                        rs.getInt("revision"), rs.getString("operation"), rs.getString("changed_by"),
                        rs.getTimestamp("changed_at").toInstant()))
                .list();

        return ContentPage.of(content, page, size, total);
    }
}
