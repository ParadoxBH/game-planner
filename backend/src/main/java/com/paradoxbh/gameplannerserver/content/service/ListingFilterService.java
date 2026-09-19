package com.paradoxbh.gameplannerserver.content.service;

import static com.paradoxbh.gameplannerserver.content.ContentKind.CATEGORY;
import static com.paradoxbh.gameplannerserver.content.ContentKind.COLLECTION;
import static com.paradoxbh.gameplannerserver.content.ContentKind.COLLECTION_GROUP;
import static com.paradoxbh.gameplannerserver.content.ContentKind.ENTITY;
import static com.paradoxbh.gameplannerserver.content.ContentKind.EVENT;
import static com.paradoxbh.gameplannerserver.content.ContentKind.ITEM;
import static com.paradoxbh.gameplannerserver.content.ContentKind.LOCATION;
import static com.paradoxbh.gameplannerserver.content.ContentKind.MAP;
import static com.paradoxbh.gameplannerserver.content.ContentKind.RECIPE;
import static com.paradoxbh.gameplannerserver.content.ContentKind.REDEMPTION_CODE;
import static com.paradoxbh.gameplannerserver.content.ContentKind.SHOP;
import static com.paradoxbh.gameplannerserver.content.ContentKind.SHOP_CATEGORY;
import static com.paradoxbh.gameplannerserver.content.ContentKind.SPAWN_POINT;
import static com.paradoxbh.gameplannerserver.query.QueryJson.and;
import static com.paradoxbh.gameplannerserver.query.QueryJson.or;
import static com.paradoxbh.gameplannerserver.query.QueryJson.rule;

import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.store.ContentHandler;
import com.paradoxbh.gameplannerserver.identity.repo.GameRarityRepository;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;
import com.paradoxbh.gameplannerserver.query.ListingFilter;
import com.paradoxbh.gameplannerserver.query.ListingFilter.Display;
import com.paradoxbh.gameplannerserver.query.ListingFilter.Option;
import com.paradoxbh.gameplannerserver.query.ListingSchema;
import com.paradoxbh.gameplannerserver.query.Operator;
import com.paradoxbh.gameplannerserver.query.QueryBuilder;
import com.paradoxbh.gameplannerserver.query.QueryField;
import com.paradoxbh.gameplannerserver.query.QueryJson;

/**
 * Filtros de tela de cada listagem: a busca e os seletores que o front desenha acima da lista, com
 * o QueryJson de cada opção. Filtro ou opção nova se acrescenta aqui, e o front passa a mostrá-la
 * sem mudança. Opções que são dados do jogo (categorias, raridades, bancadas, tipos de evento) são
 * lidas a cada pedido: cadastrar uma categoria já a põe no filtro.
 *
 * Na subida, cada filtro é conferido contra os campos do QueryBuilder do tipo: campo que não
 * existe ou opção com QueryJson inválido impede a aplicação de subir.
 */
@Service
public class ListingFilterService {

    private static final List<String> SEARCH_FIELDS = List.of("name", "extId");

    /** O campo que o filtro global de eventos ativos usa. */
    private static final String EVENT_FIELD = "event";

    private static final Map<ContentKind, String> PLACEHOLDERS = new EnumMap<>(Map.ofEntries(
            Map.entry(ITEM, "Pesquisar itens..."),
            Map.entry(ENTITY, "Pesquisar entidades..."),
            Map.entry(CATEGORY, "Pesquisar categorias..."),
            Map.entry(EVENT, "Pesquisar eventos..."),
            Map.entry(RECIPE, "Pesquisar receitas pelo nome ou pelo produto..."),
            Map.entry(SHOP, "Pesquisar lojas..."),
            Map.entry(SHOP_CATEGORY, "Pesquisar categorias de loja..."),
            Map.entry(MAP, "Pesquisar mapas..."),
            Map.entry(LOCATION, "Pesquisar locais..."),
            Map.entry(SPAWN_POINT, "Pesquisar pontos de spawn..."),
            Map.entry(COLLECTION, "Pesquisar conjuntos..."),
            Map.entry(COLLECTION_GROUP, "Pesquisar grupos..."),
            Map.entry(REDEMPTION_CODE, "Pesquisar códigos...")));

    /** Rótulos dos tipos de evento conhecidos; tipo novo aparece com o próprio código. */
    private static final Map<String, String> EVENT_TYPES = Map.of(
            "clima", "Clima",
            "season", "Temporada",
            "mapa", "Mapa",
            "event", "Evento");

    /** O filtro e, quando as opções são dados do jogo, como lê-las. Sem {@code load}, as opções são fixas. */
    private record Spec(ListingFilter filter, Function<String, List<Option>> load) {

        ListingFilter build(String gameId) {
            return load == null ? filter : filter.withOptions(load.apply(gameId));
        }
    }

    private final GameAccess access;
    private final JdbcClient jdbc;
    private final ReferenceService references;
    private final GameRarityRepository rarities;
    private final Map<ContentKind, ContentHandler<?>> handlers = new EnumMap<>(ContentKind.class);
    private final Map<ContentKind, List<Spec>> specs = new EnumMap<>(ContentKind.class);

    public ListingFilterService(GameAccess access, JdbcClient jdbc, ReferenceService references,
                                GameRarityRepository rarities, List<ContentHandler<?>> handlers) {
        this.access = access;
        this.jdbc = jdbc;
        this.references = references;
        this.rarities = rarities;
        handlers.forEach(handler -> this.handlers.put(handler.kind(), handler));

        specs.put(ITEM, List.of(
                categories("category", "Categoria", Display.SELECT, "item"),
                categories("subCategory", "Sub-categoria", Display.MULTI, "item"),
                fixed(new ListingFilter("status", "Status", Display.SELECT, "trade", null, null, null, List.of(
                        Option.of("buyable", "Compráveis", and(rule("buyable", "equal", true))),
                        Option.of("sellable", "Vendíveis", and(rule("sellable", "equal", true))),
                        Option.of("traded", "Comercializados",
                                or(rule("buyable", "equal", true), rule("sellable", "equal", true))),
                        Option.of("untraded", "Não comercializados",
                                and(rule("buyable", "equal", false), rule("sellable", "equal", false)))))),
                rarity()));
        specs.put(ENTITY, List.of(
                categories("category", "Categoria", Display.SELECT, "entity"),
                categories("subCategory", "Sub-categoria", Display.MULTI, "entity"),
                rarity()));
        // Categoria "both" vale para item e para entidade.
        specs.put(CATEGORY, List.of(
                fixed(new ListingFilter("appliesTo", "Agrupa", Display.SELECT, null, "Tudo", null, null, List.of(
                        Option.of("item", "Itens", and(rule("appliesTo", "in", List.of("item", "both")))),
                        Option.of("entity", "Entidades", and(rule("appliesTo", "in", List.of("entity", "both")))))))));
        specs.put(RECIPE, List.of(
                new Spec(new ListingFilter("station", "Bancada", Display.SELECT, "station", "Todas as bancadas", "station",
                        null, List.of()), this::stations)));
        specs.put(EVENT, List.of(
                new Spec(new ListingFilter("type", "Tipo", Display.TABS, null, "Todos", "type", null, List.of()),
                        this::eventTypes)));
        specs.put(REDEMPTION_CODE, List.of(
                fixed(new ListingFilter("active", "Validade", Display.SWITCH, null, null, null, "true", List.of(
                        Option.of("true", "Ocultar expirados", and(rule("active", "equal", true))))))));

        this.handlers.forEach(this::validateSearch);
        specs.forEach((kind, list) -> list.forEach(spec -> validate(kind, spec)));
    }

    /**
     * A barra da listagem do recurso. Filtro sem opções vem assim mesmo: o front não o desenha, mas
     * ainda aplica um valor que chegue pela URL.
     */
    public ListingSchema schema(String gameId, String resource) {
        access.requireReadable(gameId);
        ContentKind kind = ContentKind.fromPath(resource)
                .orElseThrow(() -> ApiException.notFound("Recurso \"" + resource + "\""));
        boolean activeEvents = handlers.get(kind).queryBuilder().fields().stream()
                .anyMatch(field -> field.name().equals(EVENT_FIELD));
        return new ListingSchema(new ListingSchema.Search(PLACEHOLDERS.get(kind), SEARCH_FIELDS), activeEvents,
                specs.getOrDefault(kind, List.of()).stream().map(spec -> spec.build(gameId)).toList());
    }

    private static Spec fixed(ListingFilter filter) {
        return new Spec(filter, null);
    }

    /** Categorias que agrupam o tipo, incluindo as de ambos, pelo nome. */
    private Spec categories(String key, String label, Display display, String appliesTo) {
        return new Spec(new ListingFilter(key, label, display, null, null, "category", null, List.of()),
                gameId -> jdbc.sql("""
                        SELECT c.ext_id, r.name, r.icon_media_id
                        FROM category c
                        JOIN content_ref r ON r.game_id = c.game_id AND r.kind = 'category' AND r.ext_id = c.ext_id
                        WHERE c.game_id = :game AND c.applies_to IN (:appliesTo, 'both')
                        ORDER BY r.name, c.ext_id
                        """)
                        .param("game", gameId).param("appliesTo", appliesTo)
                        .query((rs, rowNum) -> new Option(rs.getString("ext_id"),
                                labelOr(rs.getString("name"), rs.getString("ext_id")), rs.getString("icon_media_id"),
                                null, null, null))
                        .list());
    }

    private Spec rarity() {
        return new Spec(new ListingFilter("rarity", "Raridade", Display.SELECT, null, null, "rarity", null, List.of()),
                gameId -> rarities.findByGameIdOrderByOrdinal(gameId).stream()
                        .map(rarity -> Option.of(rarity.getCode(), rarity.getName()))
                        .toList());
    }

    /** Bancadas citadas por receitas, com quantas receitas cada uma tem. */
    private List<Option> stations(String gameId) {
        return references.recipeStations(gameId).stream()
                .map(station -> new Option(station.extId(), labelOr(station.name(), station.extId()),
                        station.iconMediaId(), station.recipeCount(), null, null))
                .toList();
    }

    /** Tipos de evento em uso no jogo, pelo rótulo. */
    private List<Option> eventTypes(String gameId) {
        return jdbc.sql("SELECT event_type, count(*) AS total FROM game_event WHERE game_id = :game GROUP BY event_type")
                .param("game", gameId)
                .query((rs, rowNum) -> {
                    String type = rs.getString("event_type");
                    return new Option(type, EVENT_TYPES.getOrDefault(type, type), null, rs.getLong("total"), null, null);
                })
                .list().stream()
                .sorted(Comparator.comparing(Option::label))
                .toList();
    }

    private static String labelOr(String label, String code) {
        return label == null || label.isBlank() ? code : label;
    }

    private void validateSearch(ContentKind kind, ContentHandler<?> handler) {
        List<String> names = handler.queryBuilder().fields().stream().map(QueryField.Info::name).toList();
        if (!names.containsAll(SEARCH_FIELDS) || !PLACEHOLDERS.containsKey(kind)) {
            throw new IllegalStateException(kind.path() + ": busca sem campo " + SEARCH_FIELDS + " ou sem placeholder");
        }
    }

    private void validate(ContentKind kind, Spec spec) {
        ListingFilter filter = spec.filter();
        String where = kind.path() + "." + filter.key();
        ContentHandler<?> handler = handlers.get(kind);
        if (handler == null) {
            throw new IllegalStateException(where + ": não há listagem de " + kind.path());
        }
        QueryBuilder builder = handler.queryBuilder();
        boolean multi = filter.display() == Display.MULTI;

        if (filter.field() != null) {
            QueryField.Info field = builder.fields().stream()
                    .filter(info -> info.name().equals(filter.field()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException(where + ": campo " + filter.field() + " não existe"));
            if (!field.operators().contains(Operator.EQUAL)
                    || (multi && !field.operators().contains(Operator.NOT_EQUAL))) {
                throw new IllegalStateException(where + ": campo " + filter.field() + " não aceita equal"
                        + (multi ? " e not_equal" : ""));
            }
        } else if (spec.load() != null) {
            throw new IllegalStateException(where + ": opções lidas do jogo precisam de field");
        }
        if (filter.display() == Display.SWITCH && filter.options().size() != 1) {
            throw new IllegalStateException(where + ": switch tem uma opção só");
        }
        for (Option option : filter.options()) {
            if (filter.field() == null && (option.query() == null || (multi && option.exclude() == null))) {
                throw new IllegalStateException(where + ": opção " + option.value() + " sem field precisa de query"
                        + (multi ? " e exclude" : ""));
            }
            check(builder, option.query(), where);
            check(builder, option.exclude(), where);
        }
    }

    private static void check(QueryBuilder builder, QueryJson query, String where) {
        if (query == null) {
            return;
        }
        try {
            builder.where(query, new HashMap<>());
        } catch (ApiException ex) {
            throw new IllegalStateException(where + ": " + ex.getMessage(), ex);
        }
    }
}
