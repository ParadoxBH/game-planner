package com.paradoxbh.gameplannerserver.content.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Bancada exigida por uma receita: o código da entidade e, quando o jogo tem bancada que sobe de
 * nível, o nível mínimo para usá-la (V14). Sem {@code level}, a bancada serve em qualquer nível.
 *
 * Na entrada, aceita também só o código como texto ("blackforge"), que é como os dados antigos e os
 * dataminers escrevem; na saída é sempre objeto.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record RecipeStation(String extId, Integer level) {

    /** Bancada escrita só com o código. */
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static RecipeStation of(String extId) {
        return new RecipeStation(extId, null);
    }

    RecipeStation canonical(String field) {
        if (level != null && level < 0) {
            throw ApiException.badRequest(field + ".level não pode ser negativo");
        }
        return new RecipeStation(ExtIds.require(extId, field + ".extId"), level);
    }
}
