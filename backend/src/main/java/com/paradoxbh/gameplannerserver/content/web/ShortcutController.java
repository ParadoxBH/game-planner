package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.ShortcutDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.ShortcutHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/shortcuts")
public class ShortcutController extends ContentController<ShortcutDocument> {

    public ShortcutController(ContentService content, ShortcutHandler handler) {
        super(content, handler);
    }
}
