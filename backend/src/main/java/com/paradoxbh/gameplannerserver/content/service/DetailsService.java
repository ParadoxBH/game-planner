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

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.model.ContentDocument;
import com.paradoxbh.gameplannerserver.content.model.ContentPage;
import com.paradoxbh.gameplannerserver.content.model.ContentQuery;
import com.paradoxbh.gameplannerserver.query.QueryJson;
import com.paradoxbh.gameplannerserver.content.model.ResolvedReference;
import com.paradoxbh.gameplannerserver.content.store.ContentHandler;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;

/**
 * O agregado de uma tela de detalhe numa chamada: o documento, os conteúdos ligados a ele por
 * relação (o que o produz, consome, vende, dropa...) e toda referência citada por eles, já com nome
 * e ícone. Substitui as varreduras que o front fazia em getItemDetails e companhia.
 */
@Service
public class DetailsService {

    /** Documentos por relação. Acima disso, a relação traz o total e o cliente pagina pela rota do tipo. */
    public static final int RELATED_LIMIT = ContentPage.MAX_SIZE;

    /**
     * {@code related} tem uma página por relação, sempre presente, mesmo vazia. {@code categoryMembers}
     * traz os itens e entidades das categorias usadas como ingrediente ou produto.
     */
    public record Details(String kind, ContentDocument<?> document, Map<String, ContentPage<?>> related,
                          List<ResolvedReference> references, Map<String, List<ResolvedReference>> categoryMembers) {
    }

    private record Relation(String name, ContentHandler<?> handler, Function<String, ContentQuery> query) {
    }

    private final GameAccess access;
    private final ReferenceService references;
    private final JdbcClient jdbc;
    private final Map<ContentKind, ContentHandler<?>> handlers = new EnumMap<>(ContentKind.class);
    private final Map<ContentKind, List<Relation>> relations = new EnumMap<>(ContentKind.class);

    public DetailsService(GameAccess access, ReferenceService references, JdbcClient jdbc,
                          List<ContentHandler<?>> handlers) {
        this.access = access;
        this.references = references;
        this.jdbc = jdbc;
        handlers.forEach(handler -> this.handlers.put(handler.kind(), handler));

        relations.put(ITEM, List.of(
                targeting("producedBy", RECIPE, "produces", ITEM),
                targeting("usedIn", RECIPE, "consumes", ITEM),
                targeting("droppedBy", ENTITY, "drops", ITEM),
                targeting("dropPoints", SPAWN_POINT, "drops", ITEM),
                targeting("spawnPoints", SPAWN_POINT, "occupant", ITEM),
                targeting("soldIn", SHOP_CATEGORY, "sells", ITEM),
                targeting("requiredBy", ENTITY, "requires", ITEM),
                targeting("rewardOf", REDEMPTION_CODE, "rewards", ITEM),
                targeting("collectionGroups", COLLECTION_GROUP, "member", ITEM),
                coded("variants", ITEM, "variantOf")));
        relations.put(ENTITY, List.of(
                targeting("producedBy", RECIPE, "produces", ENTITY),
                targeting("usedIn", RECIPE, "consumes", ENTITY),
                coded("craftedHere", RECIPE, "station"),
                targeting("droppedBy", ENTITY, "drops", ENTITY),
                targeting("spawnPoints", SPAWN_POINT, "occupant", ENTITY),
                targeting("soldIn", SHOP_CATEGORY, "sells", ENTITY),
                targeting("requiredBy", ENTITY, "requires", ENTITY),
                coded("shops", SHOP, "npc"),
                targeting("rewardOf", REDEMPTION_CODE, "rewards", ENTITY),
                targeting("collectionGroups", COLLECTION_GROUP, "member", ENTITY),
                coded("variants", ENTITY, "variantOf")));
        relations.put(RECIPE, List.of(
                targeting("soldIn", SHOP_CATEGORY, "sells", RECIPE),
                targeting("rewardOf", REDEMPTION_CODE, "rewards", RECIPE)));
        relations.put(CATEGORY, List.of(
                inCategory("items", ITEM),
                inCategory("entities", ENTITY),
                inCategory("shops", SHOP),
                targeting("producedBy", RECIPE, "produces", CATEGORY),
                targeting("usedIn", RECIPE, "consumes", CATEGORY)));
        relations.put(EVENT, List.of(
                inEvent("items", ITEM),
                inEvent("entities", ENTITY),
                inEvent("categories", CATEGORY),
                inEvent("recipes", RECIPE),
                inEvent("shops", SHOP),
                inEvent("shopCategories", SHOP_CATEGORY),
                inEvent("maps", MAP),
                coded("mapsWithWeather", MAP, "weather"),
                inEvent("locations", LOCATION),
                inEvent("spawnPoints", SPAWN_POINT),
                inEvent("collections", COLLECTION),
                inEvent("collectionGroups", COLLECTION_GROUP)));
        relations.put(SHOP, List.of(coded("categories", SHOP_CATEGORY, "shop")));
        relations.put(LOCATION, List.of(
                coded("spawnPoints", SPAWN_POINT, "location"),
                coded("children", LOCATION, "parent")));
        relations.put(SPAWN_POINT, List.of(coded("locations", LOCATION, "containing")));
        relations.put(MAP, List.of(coded("locations", LOCATION, "map")));
        relations.put(COLLECTION, List.of(coded("groups", COLLECTION_GROUP, "collection")));
    }

    public Details details(String gameId, String resource, String extId) {
        access.requireReadable(gameId);
        ContentKind kind = ContentKind.fromPath(resource)
                .orElseThrow(() -> ApiException.notFound("Recurso \"" + resource + "\""));
        String id = ExtIds.require(extId, "extId");
        ContentDocument<?> document = handlers.get(kind).find(gameId, id)
                .orElseThrow(() -> references.unregistered(gameId, kind, id));

        Map<String, ContentPage<?>> related = new LinkedHashMap<>();
        List<ReferenceService.Source> sources = new ArrayList<>(List.of(new ReferenceService.Source(kind, id)));
        for (Relation relation : relations.getOrDefault(kind, List.of())) {
            ContentPage<? extends ContentDocument<?>> page = relation.handler().list(gameId, relation.query().apply(id));
            related.put(relation.name(), page);
            page.content().forEach(doc -> sources.add(new ReferenceService.Source(relation.handler().kind(), doc.extId())));
        }

        return new Details(kind.code(), document, related, references.resolve(gameId, sources), categoryMembers(gameId, kind, id));
    }

    /** Membros cadastrados das categorias que o documento usa como ingrediente ou produto. */
    private Map<String, List<ResolvedReference>> categoryMembers(String gameId, ContentKind kind, String extId) {
        List<String> categories = jdbc.sql("""
                SELECT DISTINCT target_ext_id FROM content_reference
                WHERE game_id = :game AND source_kind = :kind AND source_ext_id = :ext
                  AND field IN ('inputs', 'outputs') AND target_kind = 'category'
                ORDER BY target_ext_id
                """)
                .param("game", gameId).param("kind", kind.code()).param("ext", extId)
                .query(String.class).list();
        if (categories.isEmpty()) {
            return Map.of();
        }

        Map<String, List<ResolvedReference>> members = new LinkedHashMap<>();
        categories.forEach(category -> members.put(category, new ArrayList<>()));
        jdbc.sql("""
                SELECT m.category_ext_id, m.kind, m.ext_id, c.name, c.icon_media_id
                FROM content_category m
                JOIN content_ref c ON c.game_id = m.game_id AND c.kind = m.kind AND c.ext_id = m.ext_id
                WHERE m.game_id = :game AND m.category_ext_id IN (:categories) AND m.kind IN ('item', 'entity')
                ORDER BY m.category_ext_id, c.name, m.ext_id
                """)
                .param("game", gameId).param("categories", categories)
                .query(rs -> {
                    members.get(rs.getString("category_ext_id")).add(new ResolvedReference(rs.getString("kind"),
                            rs.getString("ext_id"), rs.getString("kind"), rs.getString("name"),
                            rs.getString("icon_media_id")));
                });
        return members;
    }

    /** Conteúdos de {@code kind} cujo campo de referência aponta para "tipoAlvo:id". */
    private Relation targeting(String name, ContentKind kind, String field, ContentKind target) {
        return related(name, kind, field, id -> target.code() + ":" + id);
    }

    /** Conteúdos de {@code kind} cujo campo de código tem o id. */
    private Relation coded(String name, ContentKind kind, String field) {
        return related(name, kind, field, id -> id);
    }

    private Relation inCategory(String name, ContentKind kind) {
        return coded(name, kind, "category");
    }

    private Relation inEvent(String name, ContentKind kind) {
        return coded(name, kind, "event");
    }

    private Relation related(String name, ContentKind kind, String field, Function<String, String> value) {
        return new Relation(name, handler(kind), id -> new ContentQuery(
                QueryJson.and(QueryJson.rule(field, "equal", value.apply(id))), 0, RELATED_LIMIT, "name", false));
    }

    private ContentHandler<?> handler(ContentKind kind) {
        ContentHandler<?> handler = handlers.get(kind);
        if (handler == null) {
            throw new IllegalStateException("Sem handler para " + kind);
        }
        return handler;
    }
}
