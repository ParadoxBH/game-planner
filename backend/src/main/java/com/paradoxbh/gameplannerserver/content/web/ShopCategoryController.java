package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.ShopCategoryDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.ShopCategoryHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/shop-categories")
public class ShopCategoryController extends ContentController<ShopCategoryDocument> {

    public ShopCategoryController(ContentService content, ShopCategoryHandler handler) {
        super(content, handler);
    }
}
