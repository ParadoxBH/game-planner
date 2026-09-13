package com.paradoxbh.gameplannerserver.content.store;

import static java.util.stream.Collectors.joining;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeSet;
import java.util.stream.IntStream;

import org.springframework.jdbc.core.simple.JdbcClient;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.model.ContentDocument;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.ContentPage;
import com.paradoxbh.gameplannerserver.content.model.ContentQuery;

/**
 * SQL comum a todos os tipos: colunas base, etiquetas, mídias, listagem e ordenação.
 * Cada tipo só declara suas colunas próprias e como montar o documento.
 *
 * Nomes de tabela e coluna vêm de código, nunca de entrada do usuário; valores sempre
 * por parâmetro.
 */
public abstract class AbstractContentHandler<D extends ContentDocument<D>> implements ContentHandler<D> {

    private static final List<String> BASE_COLUMNS = List.of("name", "summary", "description");

    private static final Map<String, String> BASE_SORT = Map.of(
            "name", "t.name",
            "extId", "t.ext_id",
            "createdAt", "t.created_at",
            "updatedAt", "t.updated_at");

    protected final JdbcClient jdbc;
    private final ContentTagsRepository tags;

    protected AbstractContentHandler(JdbcClient jdbc, ContentTagsRepository tags) {
        this.jdbc = jdbc;
        this.tags = tags;
    }

    /** Colunas próprias do tipo, na mesma ordem de {@link #specificValues}. */
    protected abstract List<String> specificColumns();

    protected abstract List<Object> specificValues(D document);

    protected abstract D map(Map<String, Object> row, ContentTags tags, ContentMeta meta);

    /** Chave de ordenação na API → coluna, além das básicas. */
    protected Map<String, String> specificSortColumns() {
        return Map.of();
    }

    protected boolean hasRarity() {
        return false;
    }

    @Override
    public Optional<D> find(String gameId, String extId) {
        return fetch(gameId, selectSql() + " WHERE t.game_id = :game AND t.ext_id = :ext",
                Map.of("game", gameId, "ext", extId)).stream().findFirst();
    }

    @Override
    public boolean exists(String gameId, String extId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM " + table() + " WHERE game_id = :game AND ext_id = :ext)")
                .param("game", gameId).param("ext", extId)
                .query(Boolean.class).single();
    }

    @Override
    public ContentPage<D> list(String gameId, ContentQuery query) {
        Map<String, Object> params = new HashMap<>();
        params.put("game", gameId);
        params.put("kind", kind().code());

        StringBuilder where = new StringBuilder(" WHERE t.game_id = :game");
        if (query.search() != null) {
            where.append(" AND (t.name ILIKE :search OR t.ext_id ILIKE :search)");
            params.put("search", "%" + escapeLike(query.search()) + "%");
        }
        List<String> categories = query.categories();
        for (int i = 0; i < categories.size(); i++) {
            where.append(" AND EXISTS (SELECT 1 FROM content_category c WHERE c.game_id = t.game_id")
                    .append(" AND c.kind = :kind AND c.ext_id = t.ext_id AND c.category_ext_id = :category")
                    .append(i).append(")");
            params.put("category" + i, categories.get(i));
        }
        if (query.event() != null) {
            where.append(" AND EXISTS (SELECT 1 FROM content_event e WHERE e.game_id = t.game_id")
                    .append(" AND e.kind = :kind AND e.ext_id = t.ext_id AND e.event_ext_id = :event)");
            params.put("event", query.event());
        }
        if (query.rarity() != null) {
            if (!hasRarity()) {
                throw ApiException.badRequest(kind().label() + " não tem raridade para filtrar");
            }
            where.append(" AND t.rarity_code = :rarity");
            params.put("rarity", query.rarity());
        }

        long total = jdbc.sql("SELECT count(*) FROM " + table() + " t" + where)
                .params(params).query(Long.class).single();

        params.put("limit", query.size());
        params.put("offset", (long) query.page() * query.size());
        List<D> content = fetch(gameId,
                selectSql() + where + orderBy(query.sort()) + " LIMIT :limit OFFSET :offset", params);

        return ContentPage.of(content, query.page(), query.size(), total);
    }

    @Override
    public void insert(String gameId, D document, String actor) {
        List<String> columns = writeColumns();
        String placeholders = IntStream.range(0, columns.size()).mapToObj(i -> ":v" + i).collect(joining(", "));

        jdbc.sql("INSERT INTO " + table() + " (game_id, ext_id, " + String.join(", ", columns)
                        + ", created_by, updated_by) VALUES (:game, :ext, " + placeholders + ", :actor, :actor)")
                .params(writeParams(gameId, document, actor))
                .update();
        tags.replace(gameId, kind(), document.extId(), tagsOf(document), actor);
    }

    @Override
    public void update(String gameId, D document, String actor) {
        List<String> columns = writeColumns();
        String assignments = IntStream.range(0, columns.size())
                .mapToObj(i -> columns.get(i) + " = :v" + i).collect(joining(", "));

        jdbc.sql("UPDATE " + table() + " SET " + assignments
                        + ", updated_by = :actor, updated_at = now() WHERE game_id = :game AND ext_id = :ext")
                .params(writeParams(gameId, document, actor))
                .update();
        tags.replace(gameId, kind(), document.extId(), tagsOf(document), actor);
    }

    @Override
    public void delete(String gameId, String extId) {
        // Ligações de mídia ficam: pertencem ao código do registro, não ao registro.
        tags.deleteCategoriesEventsAttributes(gameId, kind(), extId);
        jdbc.sql("DELETE FROM " + table() + " WHERE game_id = :game AND ext_id = :ext")
                .param("game", gameId).param("ext", extId)
                .update();
    }

    private String table() {
        return kind().table();
    }

    private List<String> writeColumns() {
        List<String> columns = new ArrayList<>(BASE_COLUMNS);
        columns.addAll(specificColumns());
        return columns;
    }

    private Map<String, Object> writeParams(String gameId, D document, String actor) {
        List<Object> values = new ArrayList<>(Arrays.asList(document.name(), document.summary(), document.description()));
        values.addAll(specificValues(document));

        Map<String, Object> params = new HashMap<>();
        params.put("game", gameId);
        params.put("ext", document.extId());
        params.put("actor", actor);
        for (int i = 0; i < values.size(); i++) {
            params.put("v" + i, values.get(i));
        }
        return params;
    }

    private String selectSql() {
        List<String> columns = new ArrayList<>(List.of("t.game_id", "t.ext_id"));
        writeColumns().forEach(column -> columns.add("t." + column));
        columns.addAll(List.of("t.created_by", "t.updated_by", "t.created_at", "t.updated_at"));
        columns.add("(SELECT coalesce(max(r.revision), 0) FROM content_revision r WHERE r.game_id = t.game_id"
                + " AND r.kind = '" + kind().code() + "' AND r.ext_id = t.ext_id) AS revision");
        return "SELECT " + String.join(", ", columns) + " FROM " + table() + " t";
    }

    private List<D> fetch(String gameId, String sql, Map<String, ?> params) {
        List<Map<String, Object>> rows = jdbc.sql(sql).params(params).query().listOfRows();
        Map<String, ContentTags> tagsById = tags.load(gameId, kind(),
                rows.stream().map(row -> Rows.string(row, "ext_id")).toList());

        return rows.stream()
                .map(row -> map(row, tagsById.getOrDefault(Rows.string(row, "ext_id"), ContentTags.EMPTY), meta(row)))
                .toList();
    }

    private static ContentMeta meta(Map<String, Object> row) {
        return new ContentMeta(
                Rows.string(row, "created_by"),
                Rows.string(row, "updated_by"),
                Rows.instant(row, "created_at"),
                Rows.instant(row, "updated_at"),
                Rows.integer(row, "revision"));
    }

    private String orderBy(String sort) {
        boolean descending = sort.startsWith("-");
        String key = descending ? sort.substring(1) : sort;
        String column = BASE_SORT.containsKey(key) ? BASE_SORT.get(key) : specificSortColumns().get(key);
        if (column == null) {
            TreeSet<String> options = new TreeSet<>(BASE_SORT.keySet());
            options.addAll(specificSortColumns().keySet());
            throw ApiException.badRequest("sort inválido: \"" + sort + "\". Use " + String.join(", ", options)
                    + ", com - na frente para decrescente");
        }
        return " ORDER BY " + column + (descending ? " DESC" : " ASC") + " NULLS LAST, t.ext_id";
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
