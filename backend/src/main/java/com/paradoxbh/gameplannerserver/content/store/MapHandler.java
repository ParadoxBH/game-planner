package com.paradoxbh.gameplannerserver.content.store;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.MapDocument;
import com.paradoxbh.gameplannerserver.content.model.MapDocument.Bounds;
import com.paradoxbh.gameplannerserver.content.model.MapDocument.Filters;
import com.paradoxbh.gameplannerserver.content.model.MapDocument.Tiles;
import com.paradoxbh.gameplannerserver.content.store.ChildRows.Table;

@Component
public class MapHandler extends AbstractContentHandler<MapDocument, MapHandler.Lists> {

    /** As listas de códigos do mapa ficam todas em game_map_list, separadas pela coluna list. */
    private static final Table VIEWS = list("view");
    private static final Table TYPES = list("default_type");
    private static final Table CATEGORIES = list("default_category");
    private static final Table ENTITIES = list("default_entity");
    private static final Table WEATHERS = list("weather");

    /** Listas de uma página de mapas, por ext_id. */
    record Lists(Map<String, List<String>> views, Map<String, List<String>> types,
                 Map<String, List<String>> categories, Map<String, List<String>> entities,
                 Map<String, List<String>> weathers) {
    }

    private final ChildRows children;

    public MapHandler(JdbcClient jdbc, ContentTagsRepository tags, ChildRows children) {
        super(jdbc, tags);
        this.children = children;
    }

    @Override
    public ContentKind kind() {
        return ContentKind.MAP;
    }

    @Override
    public Class<MapDocument> documentType() {
        return MapDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("map_type", "image_url", "url_pattern", "layers",
                "bounds_min_x", "bounds_min_y", "bounds_max_x", "bounds_max_y", "min_zoom", "max_zoom",
                "tile_z", "tile_min_x", "tile_min_y", "tile_max_x", "tile_max_y", "tile_min_zoom", "tile_max_zoom",
                "grid_size", "rotate", "default_view");
    }

    @Override
    protected List<Object> specificValues(MapDocument map) {
        Bounds bounds = map.bounds();
        Tiles tiles = map.tiles();
        return Arrays.asList(map.mapType(), map.imageUrl(), map.urlPattern(), map.layers(),
                bounds == null ? null : bounds.minX(),
                bounds == null ? null : bounds.minY(),
                bounds == null ? null : bounds.maxX(),
                bounds == null ? null : bounds.maxY(),
                map.minZoom(), map.maxZoom(),
                tiles == null ? null : tiles.z(),
                tiles == null ? null : tiles.minX(),
                tiles == null ? null : tiles.minY(),
                tiles == null ? null : tiles.maxX(),
                tiles == null ? null : tiles.maxY(),
                tiles == null ? null : tiles.minZoom(),
                tiles == null ? null : tiles.maxZoom(),
                map.gridSize(), map.rotate(), map.defaultView());
    }

    @Override
    protected MapDocument map(Map<String, Object> row, ContentTags tags, Lists lists, ContentMeta meta) {
        String id = Rows.string(row, "ext_id");
        BigDecimal boundsMinX = Rows.decimal(row, "bounds_min_x");
        Integer tileZ = Rows.integer(row, "tile_z");
        return new MapDocument(
                id,
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                Rows.string(row, "map_type"),
                Rows.string(row, "image_url"),
                Rows.string(row, "url_pattern"),
                Rows.integer(row, "layers"),
                boundsMinX == null ? null : new Bounds(boundsMinX, Rows.decimal(row, "bounds_min_y"),
                        Rows.decimal(row, "bounds_max_x"), Rows.decimal(row, "bounds_max_y")),
                Rows.integer(row, "min_zoom"),
                Rows.integer(row, "max_zoom"),
                tileZ == null ? null : new Tiles(tileZ, Rows.decimal(row, "tile_min_x"), Rows.decimal(row, "tile_min_y"),
                        Rows.decimal(row, "tile_max_x"), Rows.decimal(row, "tile_max_y"),
                        Rows.integer(row, "tile_min_zoom"), Rows.integer(row, "tile_max_zoom")),
                Rows.decimal(row, "grid_size"),
                Rows.integer(row, "rotate"),
                Rows.string(row, "default_view"),
                lists.views().getOrDefault(id, List.of()),
                new Filters(lists.types().getOrDefault(id, List.of()), lists.categories().getOrDefault(id, List.of()),
                        lists.entities().getOrDefault(id, List.of())),
                lists.weathers().getOrDefault(id, List.of()),
                tags.events(),
                meta);
    }

    /** Mapa tem eventos e imagens; não tem categorias nem atributos. */
    @Override
    public ContentTags tagsOf(MapDocument map) {
        return new ContentTags(List.of(), map.events(), Map.of(), map.media());
    }

    @Override
    protected Lists loadChildren(String gameId, List<String> extIds) {
        return new Lists(load(VIEWS, gameId, extIds), load(TYPES, gameId, extIds), load(CATEGORIES, gameId, extIds),
                load(ENTITIES, gameId, extIds), load(WEATHERS, gameId, extIds));
    }

    @Override
    protected void replaceChildren(String gameId, MapDocument map) {
        replace(VIEWS, gameId, map.extId(), map.availableViews());
        replace(TYPES, gameId, map.extId(), map.defaultFilters().types());
        replace(CATEGORIES, gameId, map.extId(), map.defaultFilters().categories());
        replace(ENTITIES, gameId, map.extId(), map.defaultFilters().entities());
        replace(WEATHERS, gameId, map.extId(), map.weathers());
    }

    @Override
    protected void deleteChildren(String gameId, String extId) {
        for (Table table : List.of(VIEWS, TYPES, CATEGORIES, ENTITIES, WEATHERS)) {
            children.delete(table, gameId, extId);
        }
    }

    /** weather é o código de um evento de clima do mapa. */
    @Override
    protected Map<String, Filter> specificFilters() {
        return Map.of("weather", (name, value, param, params) -> {
            params.put(param, ExtIds.require(value, name));
            return "EXISTS (SELECT 1 FROM game_map_list x WHERE x.game_id = t.game_id AND x.map_ext_id = t.ext_id"
                    + " AND x.list = 'weather' AND x.value = :" + param + ")";
        });
    }

    private static Table list(String name) {
        return new Table("game_map_list", "map_ext_id", Map.of("list", name));
    }

    private Map<String, List<String>> load(Table table, String gameId, List<String> extIds) {
        return children.load(table, gameId, extIds, row -> Rows.string(row, "value"));
    }

    private void replace(Table table, String gameId, String extId, List<String> values) {
        children.replace(table, gameId, extId, values.stream().map(value -> ChildRows.row("value", value)).toList());
    }
}
