package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;
import java.util.Set;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.Geometries;

/**
 * Local: bioma, região, POI, dungeon ({@code locationType}, código aberto, padrão region).
 * {@code area} é WKT em coordenadas de jogo — polígono para região, ponto para POI — e é opcional,
 * porque bioma de mundo procedural não tem. {@code parent} é o local que o contém. São do local os
 * pontos de spawn ligados a ele e os que têm posição dentro da área.
 */
public record LocationDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        String locationType,
        String parent,
        String map,
        String area,
        List<String> events,
        ContentMeta meta) implements ContentDocument<LocationDocument> {

    @Override
    public LocationDocument canonical(String extId) {
        String id = ExtIds.require(extId, "extId");
        String parentId = ExtIds.optional(parent, "parent");
        if (id.equals(parentId)) {
            throw ApiException.badRequest("Um local não pode estar dentro de si mesmo");
        }
        return new LocationDocument(
                id,
                Canon.required(name, "name"),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.LOCATION.code()),
                Canon.code(locationType, "locationType", "region"),
                parentId,
                ExtIds.optional(map, "map"),
                Geometries.canonical(area, "area", Set.of("Polygon", "MultiPolygon", "Point")),
                Canon.ids(events, "events"),
                null);
    }

    @Override
    public LocationDocument withMeta(ContentMeta meta) {
        return new LocationDocument(extId, name, summary, description, media, locationType, parent, map, area, events,
                meta);
    }

    @Override
    public LocationDocument withMedia(List<MediaLink> media) {
        return new LocationDocument(extId, name, summary, description, media, locationType, parent, map, area, events,
                meta);
    }
}
