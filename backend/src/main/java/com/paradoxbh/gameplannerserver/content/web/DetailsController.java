package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.service.DetailsService;
import com.paradoxbh.gameplannerserver.content.service.DetailsService.Details;

/** O agregado de detalhe de qualquer tipo de conteúdo: /items/madeira/details, /shops/blanc_shop/details... */
@RestController
@RequestMapping("/api/v1/games/{gameId}")
public class DetailsController {

    private final DetailsService details;

    public DetailsController(DetailsService details) {
        this.details = details;
    }

    @GetMapping("/{resource}/{extId}/details")
    public Details details(@PathVariable String gameId, @PathVariable String resource, @PathVariable String extId) {
        return details.details(gameId, resource, extId);
    }
}
