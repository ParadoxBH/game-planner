package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.EventDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.EventHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/events")
public class EventController extends ContentController<EventDocument> {

    public EventController(ContentService content, EventHandler handler) {
        super(content, handler);
    }
}
