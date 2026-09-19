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
import com.paradoxbh.gameplannerserver.query.FieldType;
import com.paradoxbh.gameplannerserver.query.QueryBuilder;
import com.paradoxbh.gameplannerserver.query.QueryField;
import com.paradoxbh.gameplannerserver.query.QuerySchema;

/**
 * SQL comum a todos os tipos: colunas base, etiquetas, mídias, linhas-filhas, listagem e
 * ordenação. Cada tipo só declara suas colunas próprias, suas linhas-filhas, seus campos de
 * consulta e como montar o documento.
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

    protected final JdbcClient jdbc;
    private final ContentTagsRepository tags;
    private volatile QueryBuilder queryBuilder;

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

    /**
     * Campos de consulta próprios do tipo, depois dos comuns (nome, código, datas, raridade, categoria,
     * evento, atributo). Condições sobre a tabela {@code t}.
     */
    protected List<QueryField> specificFields() {
        return List.of();
    }

    /** O nome usado na busca e na ordenação por nome. */
    protected String nameExpression() {
        return "t.name";
    }

    /** Expressão que grava a coluna a partir do parâmetro, ex.: geometria a partir de WKB. */
    protected String writeValue(String column, String param) {
        return param;
    }

    /** Expressão que lê a coluna, com o nome dela como apelido. */
    protected String readValue(String column) {
        return "t." + column;
    }

    protected boolean hasRarity() {
        return false;
    }

    protected boolean hasCategories() {
        return false;
    }

    protected boolean hasEvents() {
        return true;
    }

    protected boolean hasAttributes() {
        return false;
    }

    /**
     * Linha-filha com o código na coluna, ex.: a bancada de uma receita. {@code kind} é o tipo do
     * código, para o front saber onde procurar os valores.
     */
    protected static QueryField childCode(String name, String label, String kind, String table, String parentColumn,
                                          String column) {
        return QueryField.has(name, label, FieldType.CODE, kind, match -> "EXISTS (SELECT 1 FROM " + table
                + " x WHERE x.game_id = t.game_id AND x." + parentColumn + " = t.ext_id AND "
                + match.code("x." + column) + ")");
    }

    /**
     * Linha-filha apontando para a referência, "tipo:id" ou só "id". Linha gravada sem tipo casa com
     * qualquer tipo pedido. {@code condition}, quando não nula, restringe as linhas, ex.: só os drops
     * de entidade.
     */
    protected static QueryField childReference(String name, String label, String table, String parentColumn,
                                               String condition) {
        return QueryField.has(name, label, FieldType.REFERENCE, null, match -> "EXISTS (SELECT 1 FROM " + table
                + " x WHERE x.game_id = t.game_id AND x." + parentColumn + " = t.ext_id AND "
                + match.reference("x.target_kind", "x.target_ext_id")
                + (condition == null ? "" : " AND " + condition) + ")");
    }

    @Override
    public QuerySchema querySchema() {
        return new QuerySchema(queryBuilder().fields(), List.copyOf(sortKeys()));
    }

    /** Montado uma vez: os campos não mudam depois que o handler existe. */
    @Override
    public QueryBuilder queryBuilder() {
        QueryBuilder builder = queryBuilder;
        if (builder == null) {
            builder = new QueryBuilder(queryFields());
            queryBuilder = builder;
        }
        return builder;
    }

    private List<QueryField> queryFields() {
        List<QueryField> fields = new ArrayList<>(List.of(
                QueryField.column("name", "Nome", FieldType.TEXT, nameExpression()),
                QueryField.column("extId", "Código", FieldType.TEXT, "t.ext_id"),
                QueryField.column("createdAt", "Criado em", FieldType.DATETIME, "t.created_at"),
                QueryField.column("updatedAt", "Alterado em", FieldType.DATETIME, "t.updated_at"),
                QueryField.column("createdBy", "Criado por", FieldType.TEXT, "t.created_by"),
                QueryField.column("updatedBy", "Alterado por", FieldType.TEXT, "t.updated_by")));
        if (hasRarity()) {
            fields.add(QueryField.code("rarity", "Raridade", "rarity", "t.rarity_code"));
        }
        if (hasCategories()) {
            fields.add(tag("category", "Categoria", "category", "content_category", "category_ext_id"));
        }
        if (hasEvents()) {
            fields.add(tag("event", "Evento", "event", "content_event", "event_ext_id"));
        }
        if (hasAttributes()) {
            fields.add(tag("attribute", "Atributo", "attribute", "content_attribute", "key"));
        }
        fields.addAll(specificFields());
        return fields;
    }

    /** Etiqueta do conteúdo, nas tabelas comuns a todos os tipos. */
    private static QueryField tag(String name, String label, String kind, String table, String column) {
        return QueryField.has(name, label, FieldType.CODE, kind, match -> "EXISTS (SELECT 1 FROM " + table
                + " x WHERE x.game_id = t.game_id AND x.kind = :kind AND x.ext_id = t.ext_id AND "
                + match.code("x." + column) + ")");
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
        String where = where(gameId, query, params);

        long total = jdbc.sql("SELECT count(*) FROM " + table() + " t" + where)
                .params(params).query(Long.class).single();

        params.put("limit", query.size());
        params.put("offset", (long) query.page() * query.size());
        List<D> content = fetch(gameId,
                selectSql() + where + orderBy(query.sort()) + " LIMIT :limit OFFSET :offset", params);

        return ContentPage.of(content, query.page(), query.size(), total);
    }

    /** Condição WHERE da listagem sobre a tabela {@code t}: o jogo e o filtro. Preenche {@code params}. */
    protected String where(String gameId, ContentQuery query, Map<String, Object> params) {
        params.put("game", gameId);
        params.put("kind", kind().code());
        return " WHERE t.game_id = :game AND " + queryBuilder().where(query.filter(), params);
    }

    @Override
    public void insert(String gameId, D document, String actor) {
        List<String> columns = writeColumns();
        String placeholders = IntStream.range(0, columns.size())
                .mapToObj(i -> writeValue(columns.get(i), ":v" + i)).collect(joining(", "));

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
                .mapToObj(i -> columns.get(i) + " = " + writeValue(columns.get(i), ":v" + i)).collect(joining(", "));

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
        writeColumns().forEach(column -> columns.add(readValue(column)));
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
            throw ApiException.badRequest("sort inválido: \"" + sort + "\". Use " + String.join(", ", sortKeys())
                    + ", com - na frente para decrescente");
        }
        return " ORDER BY " + column + (descending ? " DESC" : " ASC") + " NULLS LAST, t.ext_id";
    }

    private TreeSet<String> sortKeys() {
        TreeSet<String> keys = new TreeSet<>(BASE_SORT.keySet());
        keys.add("name");
        keys.addAll(specificSortColumns().keySet());
        return keys;
    }
}
