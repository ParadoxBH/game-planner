package com.paradoxbh.gameplannerserver.content.web;

import java.time.Instant;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.ContentPage;
import com.paradoxbh.gameplannerserver.content.service.ReferenceService;
import com.paradoxbh.gameplannerserver.content.service.ReferenceService.PendingReference;
import com.paradoxbh.gameplannerserver.content.service.ReferenceService.ReferenceSource;
import com.paradoxbh.gameplannerserver.content.service.ReferenceService.SearchHit;
import com.paradoxbh.gameplannerserver.content.store.RevisionRepository;
import com.paradoxbh.gameplannerserver.content.store.RevisionRepository.Change;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;

/** Visões do jogo inteiro, atravessando os tipos de conteúdo. */
@RestController
@RequestMapping("/api/v1/games/{gameId}")
public class GameContentController {

    private final GameAccess access;
    private final RevisionRepository revisions;
    private final ReferenceService references;

    public GameContentController(GameAccess access, RevisionRepository revisions, ReferenceService references) {
        this.access = access;
        this.revisions = revisions;
        this.references = references;
    }

    /** Mudanças recentes. {@code by} filtra por autor; {@code since} em ISO-8601, ex.: 2026-09-01T00:00:00Z. */
    @GetMapping("/changes")
    public ContentPage<Change> changes(@PathVariable String gameId,
                                       @RequestParam(required = false) Instant since,
                                       @RequestParam(required = false) String by,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "50") int size) {
        access.requireReadable(gameId);
        ContentPage.requireValid(page, size);
        return revisions.changes(gameId, since, by, page, size);
    }

    /** O que falta cadastrar, do mais referenciado para o menos. */
    @GetMapping("/pending-references")
    public ContentPage<PendingReference> pendingReferences(@PathVariable String gameId,
                                                           @RequestParam(required = false) String kind,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "50") int size) {
        return references.pending(gameId, kind, page, size);
    }

    /**
     * Quem aponta para um alvo, cadastrado ou não. {@code target} é "tipo:id" ou "id";
     * {@code field} filtra pelo campo de origem. Ex.: target=item:madeira&field=drops.
     */
    @GetMapping("/references")
    public ContentPage<ReferenceSource> referencedBy(@PathVariable String gameId,
                                                     @RequestParam String target,
                                                     @RequestParam(required = false) String field,
                                                     @RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "50") int size) {
        return references.referencedBy(gameId, target, field, page, size);
    }

    @GetMapping("/search")
    public List<SearchHit> search(@PathVariable String gameId,
                                  @RequestParam String q,
                                  @RequestParam(required = false) String kind,
                                  @RequestParam(defaultValue = "20") int limit) {
        return references.search(gameId, q, kind, limit);
    }
}
