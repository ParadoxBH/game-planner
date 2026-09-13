package com.paradoxbh.gameplannerserver.content.store;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.Geometries;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.LocationDocument;

@Component
public class LocationHandler extends AbstractContentHandler<LocationDocument, Void> {

    public LocationHandler(JdbcClient jdbc, ContentTagsRepository tags) {
        super(jdbc, tags);
    }

    @Override
    public ContentKind kind() {
        return ContentKind.LOCATION;
    }

    @Override
    public Class<LocationDocument> documentType() {
        return LocationDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("location_type", "parent_ext_id", "map_ext_id", "area");
    }

    @Override
    protected List<Object> specificValues(LocationDocument location) {
        return Arrays.asList(location.locationType(), location.parent(), location.map(),
                Geometries.toWkb(location.area()));
    }

    @Override
    protected String writeValue(String column, String param) {
        return column.equals("area") ? "ST_GeomFromEWKB(" + param + ")" : param;
    }

    @Override
    protected String readValue(String column) {
        return column.equals("area") ? "ST_AsEWKB(t.area) AS area" : super.readValue(column);
    }

    @Override
    protected LocationDocument map(Map<String, Object> row, ContentTags tags, Void children, ContentMeta meta) {
        return new LocationDocument(
                Rows.string(row, "ext_id"),
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                Rows.string(row, "location_type"),
                Rows.string(row, "parent_ext_id"),
                Rows.string(row, "map_ext_id"),
                Geometries.fromWkb(row.get("area")),
                tags.events(),
                meta);
    }

    /** Local tem eventos e imagens; não tem categorias nem atributos. */
    @Override
    public ContentTags tagsOf(LocationDocument location) {
        return new ContentTags(List.of(), location.events(), Map.of(), location.media());
    }

    /** type, parent e map são códigos; containing é o código de um ponto de spawn. */
    @Override
    protected Map<String, Filter> specificFilters() {
        return Map.of(
                "type", codeColumn("t.location_type"),
                "parent", codeColumn("t.parent_ext_id"),
                "map", codeColumn("t.map_ext_id"),
                "containing", containing());
    }

    /** Locais de um ponto: o ligado a ele pelo código e os que têm a posição dele dentro da área. */
    private static Filter containing() {
        return (name, value, param, params) -> {
            params.put(param, ExtIds.require(value, name));
            return "EXISTS (SELECT 1 FROM spawn_point p WHERE p.game_id = t.game_id AND p.ext_id = :" + param
                    + " AND (p.location_ext_id = t.ext_id OR (p.position IS NOT NULL AND t.area IS NOT NULL"
                    + " AND (p.map_ext_id IS NULL OR t.map_ext_id IS NULL OR p.map_ext_id = t.map_ext_id)"
                    + " AND ST_Within(p.position, t.area))))";
        };
    }
}
