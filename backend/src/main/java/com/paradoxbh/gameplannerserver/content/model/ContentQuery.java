package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;
import java.util.Map;

import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Filtros de listagem. Várias categorias combinam com E: o conteúdo precisa ter todas.
 * {@code sort} aceita "-" na frente para ordem decrescente, ex.: "-updatedAt".
 * {@code filters} traz os parâmetros da URL; cada tipo lê só os seus (produces, sells, drops...).
 */
public record ContentQuery(String search, List<String> categories, String event, String rarity,
                           int page, int size, String sort, Map<String, String> filters) {

    public ContentQuery {
        search = Canon.text(search);
        categories = Canon.ids(categories, "category");
        event = ExtIds.optional(event, "event");
        rarity = ExtIds.optional(rarity, "rarity");
        ContentPage.requireValid(page, size);
        sort = sort == null || sort.isBlank() ? "name" : sort;
        filters = filters == null ? Map.of() : Map.copyOf(filters);
    }
}
