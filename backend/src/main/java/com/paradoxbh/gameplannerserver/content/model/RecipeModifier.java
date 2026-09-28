package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;
import java.util.Set;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * O que uma receita muda num atributo de um item ao ser feita: {@code add} soma o valor, {@code percent}
 * soma essa porcentagem do valor atual e {@code set} fixa o valor (número, texto ou booleano). Ex.: Pistola +3,
 * dano vira 33; pente estendido na pistola, munição por pente vira 17.
 *
 * {@code target} nulo é o item que a receita melhora (o produto que também entra como ingrediente), senão o
 * primeiro produto.
 */
public record RecipeModifier(Reference target, String attribute, String operation, Object value) {

    /** Operações aceitas; o mesmo CHECK está em recipe_modifier (V22). */
    public static final Set<String> OPERATIONS = Set.of("add", "percent", "set");

    RecipeModifier canonical(String field) {
        String op = Canon.code(operation, field + ".operation", "set");
        if (!OPERATIONS.contains(op)) {
            throw ApiException.badRequest(field + ".operation precisa ser add, percent ou set");
        }
        if (value == null) {
            throw ApiException.badRequest(field + ".value é obrigatório");
        }
        Object canonicalValue = Canon.scalar(value, field + ".value");
        if (!op.equals("set") && !(canonicalValue instanceof BigDecimal)) {
            throw ApiException.badRequest(field + ".value precisa ser número em " + op);
        }
        return new RecipeModifier(
                Canon.reference(target, field + ".target"),
                ExtIds.require(attribute, field + ".attribute"),
                op,
                canonicalValue);
    }
}
