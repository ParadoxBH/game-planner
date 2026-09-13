package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;

/**
 * Quantidade de um alvo exigida por algo: ingrediente de receita, requisito para coletar uma
 * entidade. {@code notConsumed} true para o que é exigido mas não gasto; padrão false.
 * O alvo pode se repetir na lista: cada linha é um slot (ver doc/backend_plan.md 3.7).
 */
public record Requirement(Reference target, BigDecimal amount, Boolean notConsumed) {

    Requirement canonical(String field) {
        return new Requirement(
                Canon.target(target, field + ".target"),
                Canon.positive(amount, field + ".amount"),
                notConsumed != null && notConsumed);
    }
}
