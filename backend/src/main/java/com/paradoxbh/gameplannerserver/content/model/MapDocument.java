package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Mapa de um jogo e como exibi-lo.
 *
 * {@code imageUrl} (imagem única) e {@code urlPattern} com {@code layers} (camadas ou tiles) são
 * caminhos ou URLs: imagem de mapa não passa pelo pipeline de mídia, que reduz tudo a 1920 px.
 * {@code bounds} está em coordenadas de jogo; {@code tiles}, em coordenadas de tile no zoom
 * {@code z}. {@code rotate} é quantos quartos de volta o norte do mapa está girado. {@code weathers}
 * são os eventos de clima que acontecem no mapa.
 */
public record MapDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        String mapType,
        String imageUrl,
        String urlPattern,
        Integer layers,
        Bounds bounds,
        Integer minZoom,
        Integer maxZoom,
        Tiles tiles,
        BigDecimal gridSize,
        Integer rotate,
        String defaultView,
        List<String> availableViews,
        Filters defaultFilters,
        List<String> weathers,
        List<String> events,
        ContentMeta meta) implements ContentDocument<MapDocument> {

    private static final Set<String> TYPES = Set.of("single", "layered", "tile", "procedural");

    /** Retângulo em coordenadas de jogo. */
    public record Bounds(BigDecimal minX, BigDecimal minY, BigDecimal maxX, BigDecimal maxY) {

        Bounds canonical(String field) {
            if (minX == null || minY == null || maxX == null || maxY == null) {
                throw ApiException.badRequest(field + " precisa de minX, minY, maxX e maxY");
            }
            if (minX.compareTo(maxX) > 0 || minY.compareTo(maxY) > 0) {
                throw ApiException.badRequest(field + ": o mínimo não pode passar do máximo");
            }
            return new Bounds(Canon.number(minX), Canon.number(minY), Canon.number(maxX), Canon.number(maxY));
        }
    }

    /** Faixa de tiles que cobre o mapa no zoom {@code z}, e os zooms em que há tile. */
    public record Tiles(Integer z, BigDecimal minX, BigDecimal minY, BigDecimal maxX, BigDecimal maxY,
                        Integer minZoom, Integer maxZoom) {

        Tiles canonical(String field) {
            if (z == null || minX == null || minY == null || maxX == null || maxY == null) {
                throw ApiException.badRequest(field + " precisa de z, minX, minY, maxX e maxY");
            }
            if (minZoom != null && maxZoom != null && minZoom > maxZoom) {
                throw ApiException.badRequest(field + ".minZoom não pode ser maior que maxZoom");
            }
            return new Tiles(z, Canon.number(minX), Canon.number(minY), Canon.number(maxX), Canon.number(maxY),
                    minZoom, maxZoom);
        }
    }

    /** Filtros ligados ao abrir o mapa: tipos de ponto e códigos de categoria e de entidade. */
    public record Filters(List<String> types, List<String> categories, List<String> entities) {

        Filters canonical() {
            return new Filters(
                    Canon.ids(types, "defaultFilters.types"),
                    Canon.ids(categories, "defaultFilters.categories"),
                    Canon.ids(entities, "defaultFilters.entities"));
        }
    }

    @Override
    public MapDocument canonical(String extId) {
        String type = Canon.text(mapType) == null ? "single" : mapType;
        if (!TYPES.contains(type)) {
            throw ApiException.badRequest("mapType precisa ser single, layered, tile ou procedural");
        }
        if (layers != null && layers < 1) {
            throw ApiException.badRequest("layers precisa ser maior que zero");
        }
        if (rotate != null && (rotate < 0 || rotate > 3)) {
            throw ApiException.badRequest("rotate é o número de quartos de volta, de 0 a 3");
        }
        if (minZoom != null && maxZoom != null && minZoom > maxZoom) {
            throw ApiException.badRequest("minZoom não pode ser maior que maxZoom");
        }
        return new MapDocument(
                ExtIds.require(extId, "extId"),
                Canon.required(name, "name"),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.MAP.code()),
                type,
                Canon.text(imageUrl),
                Canon.text(urlPattern),
                layers,
                bounds == null ? null : bounds.canonical("bounds"),
                minZoom,
                maxZoom,
                tiles == null ? null : tiles.canonical("tiles"),
                Canon.optionalPositive(gridSize, "gridSize"),
                rotate,
                Canon.code(defaultView, "defaultView", null),
                Canon.ids(availableViews, "availableViews"),
                (defaultFilters == null ? new Filters(null, null, null) : defaultFilters).canonical(),
                Canon.ids(weathers, "weathers"),
                Canon.ids(events, "events"),
                null);
    }

    @Override
    public MapDocument withMeta(ContentMeta meta) {
        return new MapDocument(extId, name, summary, description, media, mapType, imageUrl, urlPattern, layers, bounds,
                minZoom, maxZoom, tiles, gridSize, rotate, defaultView, availableViews, defaultFilters, weathers, events,
                meta);
    }

    @Override
    public MapDocument withMedia(List<MediaLink> media) {
        return new MapDocument(extId, name, summary, description, media, mapType, imageUrl, urlPattern, layers, bounds,
                minZoom, maxZoom, tiles, gridSize, rotate, defaultView, availableViews, defaultFilters, weathers, events,
                meta);
    }
}
