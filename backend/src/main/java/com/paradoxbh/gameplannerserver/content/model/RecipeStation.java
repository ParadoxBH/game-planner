package com.paradoxbh.gameplannerserver.content.model;

import java.util.Set;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Bancada exigida por uma receita: o tipo e o código do conteúdo e, quando o jogo tem bancada que
 * sobe de nível, o nível mínimo para usá-la (V14). Sem {@code level}, a bancada serve em qualquer
 * nível. {@code kind} é "entity" (a bancada construída) ou "item" (a ferramenta que se segura para
 * construir, como o martelo do Valheim — V19); sem ele, vale entidade.
 *
 * Na entrada, aceita também só o código como texto ("blackforge"), que é como os dados antigos e os
 * dataminers escrevem; na saída é sempre objeto.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RecipeStation(String kind, String extId, Integer level) {

    public static final String ENTITY = "entity";
    public static final String ITEM = "item";
    private static final Set<String> KINDS = Set.of(ENTITY, ITEM);

    /** Bancada escrita só com o código: entidade. */
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static RecipeStation of(String extId) {
        return new RecipeStation(ENTITY, extId, null);
    }

    public Reference reference() {
        return new Reference(kind, extId);
    }

    RecipeStation canonical(String field) {
        String canonicalKind = kind == null || kind.isBlank() ? ENTITY : kind.trim();
        if (!KINDS.contains(canonicalKind)) {
            throw ApiException.badRequest(field + ".kind deve ser entity ou item");
        }
        if (level != null && level < 0) {
            throw ApiException.badRequest(field + ".level não pode ser negativo");
        }
        return new RecipeStation(canonicalKind, ExtIds.require(extId, field + ".extId"), level);
    }
}
