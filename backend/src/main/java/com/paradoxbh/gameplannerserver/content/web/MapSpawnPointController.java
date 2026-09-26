package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.ContentQuery;
import com.paradoxbh.gameplannerserver.content.service.WorldService;
import com.paradoxbh.gameplannerserver.content.store.SpawnPointHandler.Markers;
import com.paradoxbh.gameplannerserver.query.QueryJson;
import com.paradoxbh.gameplannerserver.query.QuerySchema;

/** Os pontos de um mapa no formato compacto do desenho, sem paginação. */
@RestController
@RequestMapping("/api/v1/games/{gameId}/maps/{mapId}/spawn-points")
public class MapSpawnPointController {

    private final WorldService world;

    public MapSpawnPointController(WorldService world) {
        this.world = world;
    }

    /** Filtra pelo QueryJson do corpo, com os mesmos campos de /spawn-points; sem corpo, traz todos. */
    @PostMapping("/query")
    public Markers markers(@PathVariable String gameId,
                           @PathVariable String mapId,
                           @RequestBody(required = false) QueryJson query,
                           @RequestParam(defaultValue = "5000") int limit,
                           @RequestParam(defaultValue = "false") boolean conditions) {
        // Página e ordenação não se aplicam aqui: o limite é o de pontos desenhados.
        return world.markers(gameId, mapId, new ContentQuery(query, 0, 1, "extId", false), limit, conditions);
    }

    /**
     * As regras do mapa: os mesmos pontos e filtros, mas sem exigir posição e já com as condições.
     * É o que o mundo procedural tem — regra por bioma, sem coordenada.
     */
    @PostMapping("/rules")
    public Markers rules(@PathVariable String gameId,
                         @PathVariable String mapId,
                         @RequestBody(required = false) QueryJson query,
                         @RequestParam(defaultValue = "5000") int limit) {
        return world.rules(gameId, mapId, new ContentQuery(query, 0, 1, "extId", false), limit);
    }

    @GetMapping("/query/fields")
    public QuerySchema queryFields(@PathVariable String gameId) {
        return world.markerFields(gameId);
    }
}
