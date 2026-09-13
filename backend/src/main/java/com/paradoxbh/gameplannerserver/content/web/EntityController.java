package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.EntityDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.EntityHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/entities")
public class EntityController extends ContentController<EntityDocument> {

    public EntityController(ContentService content, EntityHandler handler) {
        super(content, handler);
    }
}
