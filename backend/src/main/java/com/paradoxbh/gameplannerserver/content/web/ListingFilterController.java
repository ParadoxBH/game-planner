package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.service.ListingFilterService;
import com.paradoxbh.gameplannerserver.query.ListingSchema;

/** A barra de filtros de cada tela de listagem, para o front desenhar sem saber os filtros de antemão. */
@RestController
@RequestMapping("/api/v1/games/{gameId}")
public class ListingFilterController {

    private final ListingFilterService filters;

    public ListingFilterController(ListingFilterService filters) {
        this.filters = filters;
    }

    /** Busca (placeholder e campos) e filtros com as opções do jogo, na ordem de exibição. */
    @GetMapping("/{resource}/query/filters")
    public ListingSchema filters(@PathVariable String gameId, @PathVariable String resource) {
        return filters.schema(gameId, resource);
    }
}
