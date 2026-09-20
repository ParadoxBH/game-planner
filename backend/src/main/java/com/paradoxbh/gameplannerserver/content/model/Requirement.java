package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;
import java.util.Set;

import com.paradoxbh.gameplannerserver.common.ApiException;

/**
 * Quantidade de um alvo exigida por algo: ingrediente de receita, requisito para coletar uma
 * entidade. {@code notConsumed} true para o que é exigido mas não gasto; padrão false.
 * O alvo pode se repetir na lista: cada linha é um slot (ver doc/backend_plan.md 3.7).
 *
 * {@code level} exige o alvo num nível, e {@code levelOperator} diz como comparar com o nível
 * dele: {@code exact} (=), {@code min} (>=) ou {@code max} (<=); sem operador, vale exact. Sem
 * {@code level}, o requisito serve em qualquer nível.
 */
public record Requirement(Reference target, BigDecimal amount, Boolean notConsumed, Integer level,
                          String levelOperator) {

    /** Operadores de nível aceitos; o mesmo CHECK está em recipe_input e entity_requirement (V13). */
    public static final Set<String> LEVEL_OPERATORS = Set.of("exact", "min", "max");

    /** Vale quando o requisito não pede nível, ou quando o nível do alvo satisfaz o operador. */
    public boolean acceptsLevel(Integer targetLevel) {
        return accepts(level, levelOperator, targetLevel);
    }

    /**
     * O nível encontrado satisfaz o exigido. Sem nível exigido, tudo serve; alvo sem nível conta
     * como zero. Usado também pela árvore de crafting, que escolhe a receita pelo nível do produto.
     */
    public static boolean accepts(Integer required, String operator, Integer found) {
        if (required == null) {
            return true;
        }
        int level = found == null ? 0 : found;
        return switch (operator == null ? "exact" : operator) {
            case "min" -> level >= required;
            case "max" -> level <= required;
            default -> level == required;
        };
    }

    Requirement canonical(String field) {
        if (level != null && level < 0) {
            throw ApiException.badRequest(field + ".level não pode ser negativo");
        }
        String operator = Canon.code(levelOperator, field + ".levelOperator", null);
        if (operator != null && !LEVEL_OPERATORS.contains(operator)) {
            throw ApiException.badRequest(field + ".levelOperator precisa ser exact, min ou max");
        }
        if (operator != null && level == null) {
            throw ApiException.badRequest(field + ".levelOperator só vale com level");
        }
        return new Requirement(
                Canon.target(target, field + ".target"),
                Canon.positive(amount, field + ".amount"),
                notConsumed != null && notConsumed,
                level,
                level == null ? null : (operator == null ? "exact" : operator));
    }
}
