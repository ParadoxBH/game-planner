package com.paradoxbh.gameplannerserver.content.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.model.ContentQuery;
import com.paradoxbh.gameplannerserver.content.store.SpawnPointHandler;
import com.paradoxbh.gameplannerserver.content.store.SpawnPointHandler.Markers;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;
import com.paradoxbh.gameplannerserver.query.QuerySchema;

/** Leituras do mundo que não cabem na listagem paginada de conteúdo. */
@Service
public class WorldService {

    /** Pontos por chamada. O maior mapa da base atual tem 2.354. */
    public static final int MAX_MARKERS = 10_000;

    private final GameAccess access;
    private final SpawnPointHandler spawnPoints;

    public WorldService(GameAccess access, SpawnPointHandler spawnPoints) {
        this.access = access;
        this.spawnPoints = spawnPoints;
    }

    /** Os campos de /spawn-points; os marcadores não ordenam, então não há sort. */
    public QuerySchema markerFields(String gameId) {
        access.requireReadable(gameId);
        return new QuerySchema(spawnPoints.querySchema().fields(), List.of());
    }

    public Markers markers(String gameId, String mapId, ContentQuery query, int limit) {
        access.requireReadable(gameId);
        if (limit < 1 || limit > MAX_MARKERS) {
            throw ApiException.badRequest("limit precisa estar entre 1 e " + MAX_MARKERS);
        }
        return spawnPoints.markers(gameId, ExtIds.require(mapId, "mapId"), query, limit);
    }
}
