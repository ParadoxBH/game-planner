package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.LocationDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.LocationHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/locations")
public class LocationController extends ContentController<LocationDocument> {

    public LocationController(ContentService content, LocationHandler handler) {
        super(content, handler);
    }
}
