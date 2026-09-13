package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.SpawnPointDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.SpawnPointHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/spawn-points")
public class SpawnPointController extends ContentController<SpawnPointDocument> {

    public SpawnPointController(ContentService content, SpawnPointHandler handler) {
        super(content, handler);
    }
}
