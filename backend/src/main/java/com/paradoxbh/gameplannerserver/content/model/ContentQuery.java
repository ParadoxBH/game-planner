package com.paradoxbh.gameplannerserver.content.model;

import com.paradoxbh.gameplannerserver.query.QueryJson;

/**
 * Listagem: o filtro, a página e a ordenação. {@code filter} nulo não filtra nada.
 * {@code sort} aceita "-" na frente para ordem decrescente, ex.: "-updatedAt".
 * {@code references} pede, junto da página, toda referência citada pelos documentos.
 */
public record ContentQuery(QueryJson filter, int page, int size, String sort, boolean references) {

    public ContentQuery {
        ContentPage.requireValid(page, size);
        sort = sort == null || sort.isBlank() ? "name" : sort;
    }
}
