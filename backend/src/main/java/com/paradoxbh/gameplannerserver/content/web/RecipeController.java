package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.RecipeDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.RecipeHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/recipes")
public class RecipeController extends ContentController<RecipeDocument> {

    public RecipeController(ContentService content, RecipeHandler handler) {
        super(content, handler);
    }
}
