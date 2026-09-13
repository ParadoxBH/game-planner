package com.paradoxbh.gameplannerserver.content.model;

import com.paradoxbh.gameplannerserver.common.ApiException;

/**
 * Requisito para desbloquear uma receita. {@code type} é código aberto: event, quest,
 * station_level... {@code target} aponta para o conteúdo envolvido (o evento, o NPC da quest) e
 * {@code value} guarda o que não é conteúdo (o nome da quest, o nível). Ao menos um dos dois.
 */
public record RecipeUnlock(String type, Reference target, String value) {

    RecipeUnlock canonical(String field) {
        String code = Canon.code(type, field + ".type", null);
        if (code == null) {
            throw ApiException.badRequest(field + ".type é obrigatório");
        }
        Reference reference = Canon.reference(target, field + ".target");
        String text = Canon.text(value);
        if (reference == null && text == null) {
            throw ApiException.badRequest(field + " precisa de target ou value");
        }
        return new RecipeUnlock(code, reference, text);
    }
}
