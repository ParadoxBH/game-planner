package com.paradoxbh.gameplannerserver.content.web;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
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
import com.paradoxbh.gameplannerserver.content.store.AttributeDefinitionRepository.AttributeUsage;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;

/**
 * Definições de atributo do jogo: rótulo, tipo, unidade e ordem de exibição.
 * Opcionais — conteúdo aceita atributo sem definição; com definição, o tipo é conferido.
 */
@RestController
@RequestMapping("/api/v1/games/{gameId}/attributes")
public class AttributeDefinitionController {

    private static final Set<String> TYPES = Set.of("number", "text", "boolean");
    private static final int MAX_BULK = 1000;

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

    /** Toda chave de atributo usada no jogo, definida ou não, com quantos itens e entidades a têm. */
    @GetMapping("/usage")
    public List<AttributeUsage> usage(@PathVariable String gameId) {
        access.requireReadable(gameId);
        return definitions.usage(gameId);
    }

    @PutMapping("/{key}")
    public AttributeDefinition put(@PathVariable String gameId, @PathVariable String key,
                                   @RequestBody AttributeRequest request) {
        access.requireWritable(gameId);
        AttributeDefinition definition = definition(key, request, "");
        definitions.upsert(gameId, definition);
        return definition;
    }

    /**
     * Várias definições de uma vez, como o dataminer manda: cada uma cria ou substitui a da chave.
     * Tudo é validado antes de gravar; as que não vêm na lista ficam como estão. Responde quantas gravou.
     */
    @PutMapping
    @Transactional
    public BulkResult putAll(@PathVariable String gameId, @RequestBody List<BulkAttributeRequest> requests) {
        access.requireWritable(gameId);
        if (requests == null || requests.isEmpty() || requests.size() > MAX_BULK) {
            throw ApiException.badRequest("Envie de 1 a " + MAX_BULK + " definições");
        }
        List<AttributeDefinition> valid = new ArrayList<>(requests.size());
        for (int i = 0; i < requests.size(); i++) {
            BulkAttributeRequest request = requests.get(i);
            if (request == null) {
                throw ApiException.badRequest("[" + i + "] não pode ser nulo");
            }
            valid.add(definition(request.key(), new AttributeRequest(request.label(), request.dataType(),
                    request.unit(), request.group(), request.ordinal()), "[" + i + "]."));
        }
        valid.forEach(definition -> definitions.upsert(gameId, definition));
        return new BulkResult(valid.size());
    }

    private static AttributeDefinition definition(String key, AttributeRequest request, String path) {
        String validKey = ExtIds.require(key, path + "key");
        if (request.label() == null || request.label().isBlank()) {
            throw ApiException.badRequest(path + "label é obrigatório");
        }
        if (request.dataType() == null || !TYPES.contains(request.dataType())) {
            throw ApiException.badRequest(path + "dataType precisa ser number, text ou boolean");
        }
        return new AttributeDefinition(validKey, request.label().strip(), request.dataType(), blankToNull(request.unit()),
                blankToNull(request.group()), request.ordinal() == null ? 0 : request.ordinal());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    @DeleteMapping("/{key}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String gameId, @PathVariable String key) {
        access.requireModerator(gameId);
        if (!definitions.delete(gameId, ExtIds.require(key, "key"))) {
            throw ApiException.notFound("Atributo \"" + key + "\"");
        }
    }

    public record AttributeRequest(String label, String dataType, String unit, String group, Integer ordinal) {
    }

    public record BulkResult(int saved) {
    }

    public record BulkAttributeRequest(String key, String label, String dataType, String unit, String group,
                                       Integer ordinal) {
    }
}
