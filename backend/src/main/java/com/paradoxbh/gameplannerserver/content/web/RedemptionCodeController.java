package com.paradoxbh.gameplannerserver.content.web;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.RedemptionCodeDocument;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.store.RedemptionCodeHandler;

@RestController
@RequestMapping("/api/v1/games/{gameId}/codes")
public class RedemptionCodeController extends ContentController<RedemptionCodeDocument> {

    public RedemptionCodeController(ContentService content, RedemptionCodeHandler handler) {
        super(content, handler);
    }
}
