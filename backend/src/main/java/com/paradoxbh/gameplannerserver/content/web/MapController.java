package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.MapDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.MapHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/maps")
public class MapController extends ContentController<MapDocument> {

    public MapController(ContentService content, MapHandler handler) {
        super(content, handler);
    }
}
