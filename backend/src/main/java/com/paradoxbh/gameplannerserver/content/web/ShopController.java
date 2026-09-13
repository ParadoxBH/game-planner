package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.ShopDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.ShopHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/shops")
public class ShopController extends ContentController<ShopDocument> {

    public ShopController(ContentService content, ShopHandler handler) {
        super(content, handler);
    }
}
