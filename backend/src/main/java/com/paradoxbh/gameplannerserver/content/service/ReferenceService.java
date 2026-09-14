package com.paradoxbh.gameplannerserver.content.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentPage;
import com.paradoxbh.gameplannerserver.content.model.Reference;
import com.paradoxbh.gameplannerserver.content.model.ResolvedReference;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;

/**
 * O lado útil de referência sem FK (doc/backend_plan.md 2.1): saber o que falta cadastrar
 * e quem depende de cada id ausente.
 */
@Service
public class ReferenceService {

    public record ReferenceSource(String kind, String extId, String field) {
    }

    public record PendingReference(String extId, String guessedKind, long referenceCount,
                                   List<ReferenceSource> referencedBy) {
    }

    /** Conteúdo cujas referências se quer resolver. */
    public record Source(ContentKind kind, String extId) {
    }

    /** Bancada citada por receitas, com nome e ícone quando está cadastrada como entidade. */
    public record RecipeStation(String extId, String name, String iconMediaId, boolean registered, long recipeCount) {
    }

    public record SearchHit(String kind, String extId, String name, String iconMediaId) {
    }

    /** Quantas origens listar por id ausente; a contagem total vem sempre completa. */
    private static final int MAX_SOURCES = 20;
    private static final Pattern KIND = Pattern.compile("[a-z_]{1,32}");

    /** Referências cujo alvo não existe. Alvo sem tipo casa com conteúdo de qualquer tipo. */
    private static final String PENDING = """
            SELECT r.target_ext_id, r.target_kind, count(*) AS reference_count
            FROM content_reference r
            WHERE r.game_id = :game
              AND NOT EXISTS (
                  SELECT 1 FROM content_ref c
                  WHERE c.game_id = r.game_id
                    AND c.ext_id = r.target_ext_id
                    AND (r.target_kind IS NULL OR c.kind = r.target_kind))
            """;

    private final JdbcClient jdbc;
    private final GameAccess access;

    public ReferenceService(JdbcClient jdbc, GameAccess access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    /** O 404 de conteúdo não cadastrado, carregando quem aponta para ele. */
    public ApiException unregistered(String gameId, ContentKind kind, String extId) {
        List<ReferenceSource> sources = jdbc.sql("""
                SELECT source_kind, source_ext_id, field FROM content_reference
                WHERE game_id = :game AND target_ext_id = :ext AND (target_kind IS NULL OR target_kind = :kind)
                ORDER BY source_kind, source_ext_id, field
                """)
                .param("game", gameId).param("ext", extId).param("kind", kind.code())
                .query((rs, rowNum) -> new ReferenceSource(rs.getString("source_kind"),
                        rs.getString("source_ext_id"), rs.getString("field")))
                .list();

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("gameId", gameId);
        details.put("kind", kind.code());
        details.put("extId", extId);
        details.put("referenceCount", sources.size());
        details.put("referencedBy", new ArrayList<>(sources.subList(0, Math.min(sources.size(), MAX_SOURCES))));

        return new ApiException(HttpStatus.NOT_FOUND, "unregistered-content",
                kind.label() + " não cadastrado: \"" + extId + "\"", details);
    }

    /** Fila de cadastro: o id mais referenciado primeiro. */
    public ContentPage<PendingReference> pending(String gameId, String kind, int page, int size) {
        access.requireReadable(gameId);
        ContentPage.requireValid(page, size);

        Map<String, Object> params = new HashMap<>();
        params.put("game", gameId);
        String filter = "";
        if (kind != null && !kind.isBlank()) {
            if (!KIND.matcher(kind).matches()) {
                throw ApiException.badRequest("kind inválido: \"" + kind + "\"");
            }
            filter = " AND r.target_kind = :kind";
            params.put("kind", kind);
        }
        String grouped = PENDING + filter + " GROUP BY r.target_ext_id, r.target_kind";

        long total = jdbc.sql("SELECT count(*) FROM (" + grouped + ") pending")
                .params(params).query(Long.class).single();

        params.put("limit", size);
        params.put("offset", (long) page * size);
        record Row(String extId, String kind, long count) {
        }
        List<Row> rows = jdbc.sql(grouped + " ORDER BY reference_count DESC, r.target_ext_id LIMIT :limit OFFSET :offset")
                .params(params)
                .query((rs, rowNum) -> new Row(rs.getString("target_ext_id"), rs.getString("target_kind"),
                        rs.getLong("reference_count")))
                .list();

        if (rows.isEmpty()) {
            return ContentPage.of(List.of(), page, size, total);
        }

        Map<String, List<ReferenceSource>> sourcesByTarget = new HashMap<>();
        jdbc.sql("""
                SELECT target_ext_id, target_kind, source_kind, source_ext_id, field FROM content_reference
                WHERE game_id = :game AND target_ext_id IN (:ids)
                ORDER BY source_kind, source_ext_id, field
                """)
                .param("game", gameId).param("ids", rows.stream().map(Row::extId).distinct().toList())
                .query(rs -> {
                    sourcesByTarget.computeIfAbsent(targetKey(rs.getString("target_ext_id"), rs.getString("target_kind")),
                                    key -> new ArrayList<>())
                            .add(new ReferenceSource(rs.getString("source_kind"), rs.getString("source_ext_id"),
                                    rs.getString("field")));
                });

        List<PendingReference> content = rows.stream().map(row -> {
            List<ReferenceSource> sources = sourcesByTarget.getOrDefault(targetKey(row.extId(), row.kind()), List.of());
            return new PendingReference(row.extId(), row.kind(), row.count(),
                    List.copyOf(sources.subList(0, Math.min(sources.size(), MAX_SOURCES))));
        }).toList();

        return ContentPage.of(content, page, size, total);
    }

    /** Busca por nome ou id em todos os tipos cadastrados. Nome exato vem primeiro. */
    public List<SearchHit> search(String gameId, String term, String kind, int limit) {
        access.requireReadable(gameId);
        if (term == null || term.isBlank()) {
            throw ApiException.badRequest("q é obrigatório");
        }
        if (limit < 1 || limit > 50) {
            throw ApiException.badRequest("limit precisa estar entre 1 e 50");
        }

        Map<String, Object> params = new HashMap<>();
        params.put("game", gameId);
        params.put("pattern", "%" + term.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        params.put("exact", term.strip());
        params.put("limit", limit);
        String filter = "";
        if (kind != null && !kind.isBlank()) {
            filter = " AND kind = :kind";
            params.put("kind", kind);
        }

        return jdbc.sql("SELECT kind, ext_id, name, icon_media_id FROM content_ref"
                        + " WHERE game_id = :game AND (name ILIKE :pattern OR ext_id ILIKE :pattern)" + filter
                        + " ORDER BY (lower(name) = lower(:exact)) DESC, name, kind LIMIT :limit")
                .params(params)
                .query((rs, rowNum) -> new SearchHit(rs.getString("kind"), rs.getString("ext_id"),
                        rs.getString("name"), rs.getString("icon_media_id")))
                .list();
    }

    /**
     * Quem aponta para um alvo, cadastrado ou não: receitas que o produzem ou consomem, categorias
     * de loja que o vendem, entidades que o dropam. {@code target} é "tipo:id" ou "id";
     * {@code field} restringe ao campo de origem (inputs, outputs, drops, items...).
     */
    public ContentPage<ReferenceSource> referencedBy(String gameId, String target, String field, int page, int size) {
        access.requireReadable(gameId);
        ContentPage.requireValid(page, size);
        Reference reference = Reference.parse(target, "target");

        Map<String, Object> params = new HashMap<>();
        params.put("game", gameId);
        params.put("ext", reference.extId());
        StringBuilder where = new StringBuilder(" WHERE game_id = :game AND target_ext_id = :ext");
        if (reference.kind() != null) {
            where.append(" AND (target_kind IS NULL OR target_kind = :kind)");
            params.put("kind", reference.kind());
        }
        if (field != null && !field.isBlank()) {
            where.append(" AND field = :field");
            params.put("field", field);
        }
        // Slots repetidos da mesma origem contam como uma origem só.
        String sources = "SELECT DISTINCT source_kind, source_ext_id, field FROM content_reference" + where;

        long total = jdbc.sql("SELECT count(*) FROM (" + sources + ") s")
                .params(params).query(Long.class).single();

        params.put("limit", size);
        params.put("offset", (long) page * size);
        List<ReferenceSource> content = jdbc.sql(sources
                        + " ORDER BY source_kind, source_ext_id, field LIMIT :limit OFFSET :offset")
                .params(params)
                .query((rs, rowNum) -> new ReferenceSource(rs.getString("source_kind"),
                        rs.getString("source_ext_id"), rs.getString("field")))
                .list();

        return ContentPage.of(content, page, size, total);
    }

    /** Toda referência citada pelas origens, resolvida contra content_ref numa consulta só. */
    public List<ResolvedReference> resolve(String gameId, List<Source> sources) {
        if (sources.isEmpty()) {
            return List.of();
        }
        Map<String, Object> params = new HashMap<>();
        params.put("game", gameId);
        StringBuilder values = new StringBuilder();
        int index = 0;
        for (Source source : new LinkedHashSet<>(sources)) {
            if (index > 0) {
                values.append(", ");
            }
            values.append("(CAST(:k").append(index).append(" AS text), CAST(:e").append(index).append(" AS text))");
            params.put("k" + index, source.kind().code());
            params.put("e" + index, source.extId());
            index++;
        }
        return jdbc.sql("""
                SELECT DISTINCT r.target_kind, r.target_ext_id, c.kind AS resolved_kind, c.name, c.icon_media_id
                FROM content_reference r
                JOIN (VALUES %s) AS s(kind, ext_id) ON r.source_kind = s.kind AND r.source_ext_id = s.ext_id
                LEFT JOIN LATERAL (
                    SELECT x.kind, x.name, x.icon_media_id FROM content_ref x
                    WHERE x.game_id = r.game_id AND x.ext_id = r.target_ext_id
                      AND (r.target_kind IS NULL OR x.kind = r.target_kind)
                    ORDER BY x.kind
                    LIMIT 1) c ON true
                WHERE r.game_id = :game
                ORDER BY r.target_kind NULLS FIRST, r.target_ext_id
                """.formatted(values))
                .params(params)
                .query((rs, rowNum) -> new ResolvedReference(rs.getString("target_kind"), rs.getString("target_ext_id"),
                        rs.getString("resolved_kind"), rs.getString("name"), rs.getString("icon_media_id")))
                .list();
    }

    /** Bancadas citadas por receitas do jogo, com quantas receitas cada uma tem, pelo nome. */
    public List<RecipeStation> recipeStations(String gameId) {
        access.requireReadable(gameId);
        return jdbc.sql("""
                SELECT s.station_ext_id, count(DISTINCT s.recipe_ext_id) AS recipe_count,
                       max(c.name) AS name, max(c.icon_media_id) AS icon_media_id,
                       bool_or(c.ext_id IS NOT NULL) AS registered
                FROM recipe_station s
                LEFT JOIN content_ref c ON c.game_id = s.game_id AND c.kind = 'entity' AND c.ext_id = s.station_ext_id
                WHERE s.game_id = :game
                GROUP BY s.station_ext_id
                ORDER BY coalesce(max(c.name), s.station_ext_id), s.station_ext_id
                """)
                .param("game", gameId)
                .query((rs, rowNum) -> new RecipeStation(rs.getString("station_ext_id"), rs.getString("name"),
                        rs.getString("icon_media_id"), rs.getBoolean("registered"), rs.getLong("recipe_count")))
                .list();
    }

    /** Quantos conteúdos o jogo tem de cada tipo, pelo código do tipo; tipo sem conteúdo fica de fora. */
    public Map<String, Long> contentCounts(String gameId) {
        access.requireReadable(gameId);
        Map<String, Long> counts = new TreeMap<>();
        jdbc.sql("SELECT kind, count(*) AS total FROM content_ref WHERE game_id = :game GROUP BY kind")
                .param("game", gameId)
                .query(rs -> {
                    counts.put(rs.getString("kind"), rs.getLong("total"));
                });
        return counts;
    }

    private static String targetKey(String extId, String kind) {
        return extId + " " + Objects.requireNonNullElse(kind, "");
    }
}
