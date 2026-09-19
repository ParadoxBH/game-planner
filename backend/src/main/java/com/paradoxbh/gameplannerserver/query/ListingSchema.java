package com.paradoxbh.gameplannerserver.query;

import java.util.List;

/**
 * A barra de uma tela de listagem: a caixa de busca e os filtros, na ordem de exibição. A busca
 * procura o texto com contains em cada campo de {@code search.fields}, juntos com "or".
 *
 * {@code activeEvents} diz se a listagem segue o filtro global de eventos ativos do front: com ele,
 * toda consulta leva na raiz o grupo {@code event is_null or event in [ativos]}.
 */
public record ListingSchema(Search search, boolean activeEvents, List<ListingFilter> filters) {

    public record Search(String placeholder, List<String> fields) {
    }
}
