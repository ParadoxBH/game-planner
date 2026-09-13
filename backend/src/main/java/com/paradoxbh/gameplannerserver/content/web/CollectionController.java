package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.CollectionDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.CollectionHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/collections")
public class CollectionController extends ContentController<CollectionDocument> {

    public CollectionController(ContentService content, CollectionHandler handler) {
        super(content, handler);
    }
}
