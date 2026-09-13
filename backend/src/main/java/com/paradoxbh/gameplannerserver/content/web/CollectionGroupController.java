package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.CollectionGroupDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.CollectionGroupHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/collection-groups")
public class CollectionGroupController extends ContentController<CollectionGroupDocument> {

    public CollectionGroupController(ContentService content, CollectionGroupHandler handler) {
        super(content, handler);
    }
}
