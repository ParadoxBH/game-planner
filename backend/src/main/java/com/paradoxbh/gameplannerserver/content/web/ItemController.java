package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.ItemDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.ItemHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/items")
public class ItemController extends ContentController<ItemDocument> {

    public ItemController(ContentService content, ItemHandler handler) {
        super(content, handler);
    }
}
