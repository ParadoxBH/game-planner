package com.paradoxbh.gameplannerserver.content.web;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.ContentQuery;
import com.paradoxbh.gameplannerserver.content.service.WorldService;
import com.paradoxbh.gameplannerserver.content.store.SpawnPointHandler.Markers;

/** Os pontos de um mapa no formato compacto do desenho, sem paginação. */
@RestController
@RequestMapping("/api/v1/games/{gameId}/maps/{mapId}/spawn-points")
public class MapSpawnPointController {

    private final WorldService world;

    public MapSpawnPointController(WorldService world) {
        this.world = world;
    }

    /** Aceita os filtros de /spawn-points: bbox, occupant, occupantCategory, drops, location, event e search. */
    @GetMapping
    public Markers markers(@PathVariable String gameId,
                           @PathVariable String mapId,
                           @RequestParam(required = false) String search,
                           @RequestParam(required = false) String event,
                           @RequestParam(defaultValue = "5000") int limit,
                           @RequestParam Map<String, String> parameters) {
        // Página e ordenação não se aplicam aqui: o limite é o de pontos desenhados.
        return world.markers(gameId, mapId, new ContentQuery(search, null, event, null, 0, 1, "extId", parameters),
                limit);
    }
}
