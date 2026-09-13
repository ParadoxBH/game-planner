package com.paradoxbh.gameplannerserver.content.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.model.ContentDocument;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.ContentPage;
import com.paradoxbh.gameplannerserver.content.model.ContentQuery;
import com.paradoxbh.gameplannerserver.content.model.MediaLink;
import com.paradoxbh.gameplannerserver.content.store.AttributeDefinitionRepository;
import com.paradoxbh.gameplannerserver.content.store.ContentHandler;
import com.paradoxbh.gameplannerserver.content.store.ContentMediaRepository;
import com.paradoxbh.gameplannerserver.content.store.ContentTags;
import com.paradoxbh.gameplannerserver.content.store.RevisionRepository;
import com.paradoxbh.gameplannerserver.content.store.RevisionRepository.RevisionSummary;
import com.paradoxbh.gameplannerserver.identity.service.CurrentUser;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;

import tools.jackson.databind.json.JsonMapper;

/**
 * Regras de escrita iguais para todo tipo de conteúdo: autorização, validação,
 * comparação com o que está gravado e histórico de revisões.
 */
@Service
public class ContentService {

    public enum Outcome { CREATED, UPDATED, UNCHANGED }

    public record WriteResult<D>(Outcome outcome, D document) {
    }

    public record BulkResult(int created, int updated, int unchanged) {
    }

    /** Resultado de anexar uma imagem: {@code created} false quando ela já estava ligada. */
    public record MediaWrite(boolean created, List<MediaLink> media) {
    }

    /** Documentos por requisição de lote. Acima disso, o cliente divide em várias chamadas. */
    public static final int MAX_BULK = 1000;

    private final GameAccess access;
    private final CurrentUser currentUser;
    private final RevisionRepository revisions;
    private final AttributeDefinitionRepository attributeDefinitions;
    private final ContentMediaRepository contentMedia;
    private final ReferenceService references;
    private final JsonMapper json;

    public ContentService(GameAccess access, CurrentUser currentUser, RevisionRepository revisions,
                          AttributeDefinitionRepository attributeDefinitions, ContentMediaRepository contentMedia,
                          ReferenceService references, JsonMapper json) {
        this.access = access;
        this.currentUser = currentUser;
        this.revisions = revisions;
        this.attributeDefinitions = attributeDefinitions;
        this.contentMedia = contentMedia;
        this.references = references;
        this.json = json;
    }

    /** Com references=true, a página traz também toda referência citada pelos documentos, já resolvida. */
    public <D extends ContentDocument<D>> ContentPage<D> list(ContentHandler<D> handler, String gameId,
                                                              ContentQuery query) {
        access.requireReadable(gameId);
        ContentPage<D> page = handler.list(gameId, query);
        if (!"true".equals(query.filters().get("references"))) {
            return page;
        }
        return page.withReferences(references.resolve(gameId, page.content().stream()
                .map(document -> new ReferenceService.Source(handler.kind(), document.extId()))
                .toList()));
    }

    /** Id não cadastrado responde 404 com quem aponta para ele. */
    public <D extends ContentDocument<D>> D get(ContentHandler<D> handler, String gameId, String extId) {
        access.requireReadable(gameId);
        String id = ExtIds.require(extId, "extId");
        return handler.find(gameId, id).orElseThrow(() -> references.unregistered(gameId, handler.kind(), id));
    }

    @Transactional
    public <D extends ContentDocument<D>> WriteResult<D> create(ContentHandler<D> handler, String gameId, D document) {
        String actor = writer(gameId);
        D canonical = canonical(handler, document, document.extId(), attributeDefinitions.types(gameId));
        if (handler.exists(gameId, canonical.extId())) {
            throw ApiException.conflict(handler.kind().label() + " \"" + canonical.extId()
                    + "\" já existe. Use PUT para substituir.");
        }
        return upsert(handler, gameId, canonical, actor, null);
    }

    /** Substitui o documento inteiro, ou cria se não existe. */
    @Transactional
    public <D extends ContentDocument<D>> WriteResult<D> put(ContentHandler<D> handler, String gameId, String extId,
                                                             D document) {
        String actor = writer(gameId);
        if (document.extId() != null && !document.extId().equals(extId)) {
            throw ApiException.badRequest("extId do corpo (\"" + document.extId() + "\") difere do caminho (\""
                    + extId + "\")");
        }
        D canonical = canonical(handler, document, extId, attributeDefinitions.types(gameId));
        return upsert(handler, gameId, canonical, actor, null);
    }

    /**
     * Grava um lote numa transação: ou entra tudo, ou nada. Tudo é validado antes da primeira
     * gravação, e o erro diz qual documento falhou.
     */
    @Transactional
    public <D extends ContentDocument<D>> BulkResult putAll(ContentHandler<D> handler, String gameId, List<D> documents) {
        String actor = writer(gameId);
        if (documents == null || documents.isEmpty()) {
            throw ApiException.badRequest("Envie uma lista com ao menos um documento");
        }
        if (documents.size() > MAX_BULK) {
            throw ApiException.badRequest("Lote com " + documents.size() + " documentos passa do limite de "
                    + MAX_BULK);
        }

        Map<String, String> definitions = attributeDefinitions.types(gameId);
        List<D> canonicals = new ArrayList<>(documents.size());
        Set<String> seen = new HashSet<>();
        for (int index = 0; index < documents.size(); index++) {
            D document = documents.get(index);
            try {
                if (document == null) {
                    throw ApiException.badRequest("documento nulo");
                }
                D canonical = canonical(handler, document, document.extId(), definitions);
                if (!seen.add(canonical.extId())) {
                    throw ApiException.badRequest("extId repetido no lote: \"" + canonical.extId() + "\"");
                }
                canonicals.add(canonical);
            } catch (ApiException ex) {
                Map<String, Object> properties = new LinkedHashMap<>(ex.properties());
                properties.put("index", index);
                throw new ApiException(ex.status(), ex.type(), "Documento " + index + ": " + ex.getMessage(),
                        properties);
            }
        }

        int created = 0;
        int updated = 0;
        int unchanged = 0;
        for (D canonical : canonicals) {
            switch (upsert(handler, gameId, canonical, actor, null).outcome()) {
                case CREATED -> created++;
                case UPDATED -> updated++;
                case UNCHANGED -> unchanged++;
            }
        }
        return new BulkResult(created, updated, unchanged);
    }

    /** Apaga o registro. As ligações de imagem ficam: pertencem ao código, não ao registro. */
    @Transactional
    public <D extends ContentDocument<D>> void delete(ContentHandler<D> handler, String gameId, String extId) {
        access.requireModerator(gameId);
        String actor = currentUser.require().getUsername();
        String id = ExtIds.require(extId, "extId");
        D current = handler.find(gameId, id)
                .orElseThrow(() -> ApiException.notFound(handler.kind().label() + " \"" + id + "\""));

        // O snapshot da remoção guarda o último estado: é o que permite restaurar depois.
        revisions.record(gameId, handler.kind(), id, revisions.next(gameId, handler.kind(), id), "delete", actor,
                snapshot(current));
        handler.delete(gameId, id);
    }

    public <D extends ContentDocument<D>> List<RevisionSummary> revisions(ContentHandler<D> handler, String gameId,
                                                                          String extId) {
        access.requireReadable(gameId);
        return revisions.list(gameId, handler.kind(), ExtIds.require(extId, "extId"));
    }

    public <D extends ContentDocument<D>> D revision(ContentHandler<D> handler, String gameId, String extId,
                                                     int revision) {
        access.requireReadable(gameId);
        String id = ExtIds.require(extId, "extId");
        return revisions.snapshot(gameId, handler.kind(), id, revision)
                .map(snapshot -> json.readValue(snapshot, handler.documentType()))
                .orElseThrow(() -> ApiException.notFound("Revisão " + revision));
    }

    /**
     * Aplica o snapshot de uma revisão como nova escrita, com operação "restore".
     * O histórico não é reescrito. Funciona também para conteúdo já apagado.
     */
    @Transactional
    public <D extends ContentDocument<D>> WriteResult<D> restore(ContentHandler<D> handler, String gameId,
                                                                 String extId, int revision) {
        access.requireModerator(gameId);
        String actor = currentUser.require().getUsername();
        String id = ExtIds.require(extId, "extId");
        String snapshot = revisions.snapshot(gameId, handler.kind(), id, revision)
                .orElseThrow(() -> ApiException.notFound("Revisão " + revision));

        D document = json.readValue(snapshot, handler.documentType());
        D canonical = canonical(handler, document, id, attributeDefinitions.types(gameId));
        return upsert(handler, gameId, canonical, actor, "restore");
    }

    /** Imagens de um código de conteúdo. Funciona antes de o registro existir. */
    public <D extends ContentDocument<D>> List<MediaLink> media(ContentHandler<D> handler, String gameId,
                                                                String extId) {
        access.requireReadable(gameId);
        return contentMedia.list(gameId, handler.kind().code(), ExtIds.require(extId, "extId"));
    }

    /**
     * Anexa uma imagem a um código de conteúdo, exista o registro ou não: durante o cadastro, o
     * usuário pode enviar imagens antes de criar o registro, já que o código não se repete.
     */
    @Transactional
    public <D extends ContentDocument<D>> MediaWrite addMedia(ContentHandler<D> handler, String gameId, String extId,
                                                              MediaLink link) {
        String actor = writer(gameId);
        String id = ExtIds.require(extId, "extId");
        if (link == null) {
            throw ApiException.badRequest("Envie { usage, mediaId }");
        }
        MediaLink valid = MediaLink.canonical(List.of(link), handler.kind().code()).getFirst();
        contentMedia.requireExisting(List.of(valid.mediaId()));

        boolean created = contentMedia.add(gameId, handler.kind().code(), id, valid.usage(), valid.mediaId(), actor);
        return new MediaWrite(created, contentMedia.list(gameId, handler.kind().code(), id));
    }

    /** Substitui ou reordena as imagens do código. Lista vazia remove todas. */
    @Transactional
    public <D extends ContentDocument<D>> List<MediaLink> replaceMedia(ContentHandler<D> handler, String gameId,
                                                                       String extId, List<MediaLink> links) {
        String actor = writer(gameId);
        String id = ExtIds.require(extId, "extId");
        if (links == null) {
            throw ApiException.badRequest("Envie a lista de imagens; lista vazia remove todas");
        }
        List<MediaLink> valid = MediaLink.canonical(links, handler.kind().code());
        contentMedia.requireExisting(valid.stream().map(MediaLink::mediaId).toList());

        contentMedia.replace(gameId, handler.kind().code(), id, valid, actor);
        return contentMedia.list(gameId, handler.kind().code(), id);
    }

    @Transactional
    public <D extends ContentDocument<D>> void removeMedia(ContentHandler<D> handler, String gameId, String extId,
                                                           String usage, String mediaId) {
        writer(gameId);
        String id = ExtIds.require(extId, "extId");
        if (!contentMedia.remove(gameId, handler.kind().code(), id, usage, mediaId)) {
            throw ApiException.notFound("Imagem " + mediaId + " no uso " + usage + " de \"" + id + "\"");
        }
    }

    private <D extends ContentDocument<D>> WriteResult<D> upsert(ContentHandler<D> handler, String gameId,
                                                                 D canonical, String actor, String operation) {
        String id = canonical.extId();
        Optional<D> current = handler.find(gameId, id);

        Outcome outcome;
        if (current.isPresent()) {
            D currentCanonical = current.get().canonical(id);
            // Documento sem "media" não mexe nas imagens, então a comparação também as ignora.
            if (canonical.media() == null) {
                currentCanonical = currentCanonical.withMedia(null);
            }
            // Igual ao que está gravado: não escreve e não gera revisão. Reimportar a base inteira
            // não pode encher o histórico de revisões vazias.
            if (currentCanonical.equals(canonical)) {
                return new WriteResult<>(Outcome.UNCHANGED, current.get());
            }
            handler.update(gameId, canonical, actor);
            outcome = Outcome.UPDATED;
        } else {
            handler.insert(gameId, canonical, actor);
            outcome = Outcome.CREATED;
        }

        D stored = handler.find(gameId, id).orElseThrow();
        int revision = revisions.next(gameId, handler.kind(), id);
        String recorded = operation != null ? operation : outcome == Outcome.CREATED ? "create" : "update";
        revisions.record(gameId, handler.kind(), id, revision, recorded, actor, snapshot(stored));

        ContentMeta meta = stored.meta();
        return new WriteResult<>(outcome, stored.withMeta(
                new ContentMeta(meta.createdBy(), meta.updatedBy(), meta.createdAt(), meta.updatedAt(), revision)));
    }

    /**
     * Valida o documento, confere atributos contra as definições do jogo quando existem, e
     * exige que toda mídia ligada já tenha sido enviada.
     */
    private <D extends ContentDocument<D>> D canonical(ContentHandler<D> handler, D document, String extId,
                                                       Map<String, String> definitions) {
        D canonical = document.canonical(extId);
        ContentTags tags = handler.tagsOf(canonical);
        tags.attributes().forEach((key, value) -> {
            String expected = definitions.get(key);
            if (expected != null && !expected.equals(typeOf(value))) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "attribute-type",
                        "attributes." + key + " precisa ser " + expected + ", conforme a definição do atributo");
            }
        });
        if (tags.media() != null) {
            contentMedia.requireExisting(tags.media().stream().map(MediaLink::mediaId).toList());
        }
        return canonical;
    }

    private static String typeOf(Object value) {
        if (value instanceof BigDecimal) {
            return "number";
        }
        return value instanceof Boolean ? "boolean" : "text";
    }

    private String snapshot(ContentDocument<?> document) {
        return json.writeValueAsString(document.withMeta(null));
    }

    private String writer(String gameId) {
        access.requireWritable(gameId);
        return currentUser.require().getUsername();
    }
}
