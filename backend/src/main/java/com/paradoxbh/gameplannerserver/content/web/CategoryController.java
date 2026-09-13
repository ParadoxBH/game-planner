package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.CategoryDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.CategoryHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/categories")
public class CategoryController extends ContentController<CategoryDocument> {

    public CategoryController(ContentService content, CategoryHandler handler) {
        super(content, handler);
    }
}
