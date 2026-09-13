package com.paradoxbh.gameplannerserver.content.store;

import static java.util.stream.Collectors.joining;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.IntStream;

import org.springframework.jdbc.core.simple.JdbcClient;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.model.ContentDocument;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.ContentPage;
import com.paradoxbh.gameplannerserver.content.model.ContentQuery;
import com.paradoxbh.gameplannerserver.content.model.Reference;

/**
 * SQL comum a todos os tipos: colunas base, etiquetas, mídias, linhas-filhas, listagem e
 * ordenação. Cada tipo só declara suas colunas próprias, suas linhas-filhas, seus filtros e como
 * montar o documento.
 *
 * {@code C} é o que o tipo carrega de linhas-filhas para uma página inteira de uma vez;
 * {@link Void} quando não tem.
 *
 * Nomes de tabela e coluna vêm de código, nunca de entrada do usuário; valores sempre
 * por parâmetro.
 */
public abstract class AbstractContentHandler<D extends ContentDocument<D>, C> implements ContentHandler<D> {

    private static final List<String> BASE_COLUMNS = List.of("name", "summary", "description");

    private static final Map<String, String> BASE_SORT = Map.of(
            "extId", "t.ext_id",
            "createdAt", "t.created_at",
            "updatedAt", "t.updated_at");

    /**
     * Filtro de listagem próprio do tipo. Recebe o nome e o valor do parâmetro da URL e um nome
     * livre para o parâmetro SQL; devolve a condição sobre a tabela {@code t}.
     */
    @FunctionalInterface
    protected interface Filter {
        String condition(String name, String value, String param, Map<String, Object> params);
    }

    protected final JdbcClient jdbc;
    private final ContentTagsRepository tags;

    protected AbstractContentHandler(JdbcClient jdbc, ContentTagsRepository tags) {
        this.jdbc = jdbc;
        this.tags = tags;
    }

    /** Colunas próprias do tipo, na mesma ordem de {@link #specificValues}. */
    protected abstract List<String> specificColumns();

    protected abstract List<Object> specificValues(D document);

    protected abstract D map(Map<String, Object> row, ContentTags tags, C children, ContentMeta meta);

    /** Linhas-filhas de vários conteúdos de uma vez. Tipo sem linha-filha devolve nulo. */
    protected C loadChildren(String gameId, List<String> extIds) {
        return null;
    }

    /** Regrava as linhas-filhas do documento: a escrita é do agregado inteiro. */
    protected void replaceChildren(String gameId, D document) {
    }

    protected void deleteChildren(String gameId, String extId) {
    }

    /** Chave de ordenação na API → coluna, além das básicas. */
    protected Map<String, String> specificSortColumns() {
        return Map.of();
    }

    /** Parâmetros de listagem próprios do tipo, pelo nome na URL. Os demais parâmetros são ignorados. */
    protected Map<String, Filter> specificFilters() {
        return Map.of();
    }

    /** O nome usado na busca e na ordenação por nome. */
    protected String nameExpression() {
        return "t.name";
    }

    protected boolean hasRarity() {
        return false;
    }

    /** Filtro por código numa coluna do próprio tipo, ex.: a loja de uma categoria de loja. */
    protected static Filter codeColumn(String column) {
        return (name, value, param, params) -> {
            params.put(param, ExtIds.require(value, name));
            return column + " = :" + param;
        };
    }

    /** Existe linha-filha com o código na coluna, ex.: a bancada de uma receita. */
    protected static Filter childCode(String table, String parentColumn, String column) {
        return (name, value, param, params) -> {
            params.put(param, ExtIds.require(value, name));
            return "EXISTS (SELECT 1 FROM " + table + " x WHERE x.game_id = t.game_id AND x." + parentColumn
                    + " = t.ext_id AND x." + column + " = :" + param + ")";
        };
    }

    /**
     * Existe linha-filha apontando para a referência do parâmetro, "tipo:id" ou só "id". Linha
     * gravada sem tipo casa com qualquer tipo pedido. {@code condition}, quando não nula, restringe
     * as linhas, ex.: só os drops de entidade.
     */
    protected static Filter childReference(String table, String parentColumn, String condition) {
        return (name, value, param, params) -> {
            Reference target = Reference.parse(value, name);
            StringBuilder sql = new StringBuilder("EXISTS (SELECT 1 FROM ").append(table)
                    .append(" x WHERE x.game_id = t.game_id AND x.").append(parentColumn).append(" = t.ext_id")
                    .append(" AND x.target_ext_id = :").append(param);
            params.put(param, target.extId());
            if (target.kind() != null) {
                sql.append(" AND (x.target_kind IS NULL OR x.target_kind = :").append(param).append("Kind)");
                params.put(param + "Kind", target.kind());
            }
            if (condition != null) {
                sql.append(" AND ").append(condition);
            }
            return sql.append(")").toString();
        };
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
            where.append(" AND (").append(nameExpression()).append(" ILIKE :search OR t.ext_id ILIKE :search)");
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
        int index = 0;
        for (Map.Entry<String, Filter> filter : new TreeMap<>(specificFilters()).entrySet()) {
            String value = query.filters().get(filter.getKey());
            if (value != null) {
                where.append(" AND ")
                        .append(filter.getValue().condition(filter.getKey(), value, "filter" + index++, params));
            }
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
        replaceChildren(gameId, document);
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
        replaceChildren(gameId, document);
    }

    @Override
    public void delete(String gameId, String extId) {
        // Ligações de mídia ficam: pertencem ao código do registro, não ao registro.
        tags.deleteCategoriesEventsAttributes(gameId, kind(), extId);
        deleteChildren(gameId, extId);
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
        List<String> extIds = rows.stream().map(row -> Rows.string(row, "ext_id")).toList();
        Map<String, ContentTags> tagsById = tags.load(gameId, kind(), extIds);
        C children = loadChildren(gameId, extIds);

        return rows.stream()
                .map(row -> map(row, tagsById.getOrDefault(Rows.string(row, "ext_id"), ContentTags.EMPTY), children,
                        meta(row)))
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
        String column = key.equals("name") ? nameExpression()
                : BASE_SORT.containsKey(key) ? BASE_SORT.get(key) : specificSortColumns().get(key);
        if (column == null) {
            TreeSet<String> options = new TreeSet<>(BASE_SORT.keySet());
            options.add("name");
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
