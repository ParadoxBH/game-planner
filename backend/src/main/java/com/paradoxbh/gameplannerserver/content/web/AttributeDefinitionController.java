package com.paradoxbh.gameplannerserver.content.web;

import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.store.AttributeDefinitionRepository;
import com.paradoxbh.gameplannerserver.content.store.AttributeDefinitionRepository.AttributeDefinition;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;

/**
 * Definições de atributo do jogo: rótulo, tipo, unidade e ordem de exibição.
 * Opcionais — conteúdo aceita atributo sem definição; com definição, o tipo é conferido.
 */
@RestController
@RequestMapping("/api/v1/games/{gameId}/attributes")
public class AttributeDefinitionController {

    private static final Set<String> TYPES = Set.of("number", "text", "boolean");

    private final AttributeDefinitionRepository definitions;
    private final GameAccess access;

    public AttributeDefinitionController(AttributeDefinitionRepository definitions, GameAccess access) {
        this.definitions = definitions;
        this.access = access;
    }

    @GetMapping
    public List<AttributeDefinition> list(@PathVariable String gameId) {
        access.requireReadable(gameId);
        return definitions.list(gameId);
    }

    @PutMapping("/{key}")
    public AttributeDefinition put(@PathVariable String gameId, @PathVariable String key,
                                   @RequestBody AttributeRequest request) {
        access.requireWritable(gameId);
        String validKey = ExtIds.require(key, "key");
        if (request.label() == null || request.label().isBlank()) {
            throw ApiException.badRequest("label é obrigatório");
        }
        if (request.dataType() == null || !TYPES.contains(request.dataType())) {
            throw ApiException.badRequest("dataType precisa ser number, text ou boolean");
        }

        AttributeDefinition definition = new AttributeDefinition(validKey, request.label(), request.dataType(),
                request.unit() == null || request.unit().isBlank() ? null : request.unit(),
                request.ordinal() == null ? 0 : request.ordinal());
        definitions.upsert(gameId, definition);
        return definition;
    }

    @DeleteMapping("/{key}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String gameId, @PathVariable String key) {
        access.requireModerator(gameId);
        if (!definitions.delete(gameId, ExtIds.require(key, "key"))) {
            throw ApiException.notFound("Atributo \"" + key + "\"");
        }
    }

    public record AttributeRequest(String label, String dataType, String unit, Integer ordinal) {
    }
}
