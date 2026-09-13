package com.paradoxbh.gameplannerserver.content.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;

import com.paradoxbh.gameplannerserver.content.model.ContentDocument;
import com.paradoxbh.gameplannerserver.content.model.ContentPage;
import com.paradoxbh.gameplannerserver.content.model.ContentQuery;
import com.paradoxbh.gameplannerserver.content.model.MediaLink;
import com.paradoxbh.gameplannerserver.content.service.ContentService;
import com.paradoxbh.gameplannerserver.content.service.ContentService.BulkResult;
import com.paradoxbh.gameplannerserver.content.service.ContentService.MediaWrite;
import com.paradoxbh.gameplannerserver.content.service.ContentService.Outcome;
import com.paradoxbh.gameplannerserver.content.service.ContentService.WriteResult;
import com.paradoxbh.gameplannerserver.content.store.ContentHandler;
import com.paradoxbh.gameplannerserver.content.store.RevisionRepository.RevisionSummary;

/**
 * Rotas iguais para todo tipo de conteúdo. Cada subclasse só fixa o caminho e o tipo.
 * Leitura pública; escrita autorizada por jogo (ver ContentService).
 */
public abstract class ContentController<D extends ContentDocument<D>> {

    private final ContentService content;
    private final ContentHandler<D> handler;

    protected ContentController(ContentService content, ContentHandler<D> handler) {
        this.content = content;
        this.handler = handler;
    }

    @GetMapping
    public ContentPage<D> list(@PathVariable String gameId,
                               @RequestParam(required = false) String search,
                               @RequestParam(required = false) List<String> category,
                               @RequestParam(required = false) String event,
                               @RequestParam(required = false) String rarity,
                               @RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "50") int size,
                               @RequestParam(defaultValue = "name") String sort) {
        return content.list(handler, gameId, new ContentQuery(search, category, event, rarity, page, size, sort));
    }

    @GetMapping("/{extId}")
    public D get(@PathVariable String gameId, @PathVariable String extId) {
        return content.get(handler, gameId, extId);
    }

    /** Cria. 409 se o id já existe. */
    @PostMapping
    public ResponseEntity<D> create(@PathVariable String gameId, @RequestBody D document) {
        return ResponseEntity.status(HttpStatus.CREATED).body(content.create(handler, gameId, document).document());
    }

    /** Substitui o documento inteiro, ou cria. 201 se criou, 200 se atualizou ou nada mudou. */
    @PutMapping("/{extId}")
    public ResponseEntity<D> put(@PathVariable String gameId, @PathVariable String extId, @RequestBody D document) {
        WriteResult<D> result = content.put(handler, gameId, extId, document);
        return ResponseEntity.status(result.outcome() == Outcome.CREATED ? HttpStatus.CREATED : HttpStatus.OK)
                .body(result.document());
    }

    /** Lote: cria ou substitui cada documento, numa transação só. */
    @PutMapping
    public BulkResult putAll(@PathVariable String gameId, @RequestBody List<D> documents) {
        return content.putAll(handler, gameId, documents);
    }

    @DeleteMapping("/{extId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String gameId, @PathVariable String extId) {
        content.delete(handler, gameId, extId);
    }

    @GetMapping("/{extId}/revisions")
    public List<RevisionSummary> revisions(@PathVariable String gameId, @PathVariable String extId) {
        return content.revisions(handler, gameId, extId);
    }

    @GetMapping("/{extId}/revisions/{revision}")
    public D revision(@PathVariable String gameId, @PathVariable String extId, @PathVariable int revision) {
        return content.revision(handler, gameId, extId, revision);
    }

    @PostMapping("/{extId}/revisions/{revision}/restore")
    public D restore(@PathVariable String gameId, @PathVariable String extId, @PathVariable int revision) {
        return content.restore(handler, gameId, extId, revision).document();
    }

    // ---- Imagens do código. Não exigem que o registro exista. ----

    @GetMapping("/{extId}/media")
    public List<MediaLink> media(@PathVariable String gameId, @PathVariable String extId) {
        return content.media(handler, gameId, extId);
    }

    /** Anexa { usage, mediaId } no fim do uso. 201 se ligou agora, 200 se já estava ligada. */
    @PostMapping("/{extId}/media")
    public ResponseEntity<List<MediaLink>> addMedia(@PathVariable String gameId, @PathVariable String extId,
                                                    @RequestBody MediaLink link) {
        MediaWrite result = content.addMedia(handler, gameId, extId, link);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.media());
    }

    /** Substitui ou reordena a lista inteira; quem já estava mantém a autoria. */
    @PutMapping("/{extId}/media")
    public List<MediaLink> replaceMedia(@PathVariable String gameId, @PathVariable String extId,
                                        @RequestBody List<MediaLink> links) {
        return content.replaceMedia(handler, gameId, extId, links);
    }

    @DeleteMapping("/{extId}/media/{usage}/{mediaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMedia(@PathVariable String gameId, @PathVariable String extId,
                            @PathVariable String usage, @PathVariable String mediaId) {
        content.removeMedia(handler, gameId, extId, usage, mediaId);
    }
}
