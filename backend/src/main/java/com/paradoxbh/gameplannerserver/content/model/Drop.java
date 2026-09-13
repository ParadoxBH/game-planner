package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;

import com.paradoxbh.gameplannerserver.common.ApiException;

/**
 * Entrada de tabela de drop, com a própria chance de 0 a 1. O mesmo alvo pode aparecer em mais
 * de uma entrada (ver doc/backend_plan.md 3.7). A quantidade vai de {@code amount} até
 * {@code maxAmount}, quando varia.
 */
public record Drop(Reference target, BigDecimal chance, BigDecimal amount, BigDecimal maxAmount) {

    Drop canonical(String field) {
        BigDecimal min = Canon.positive(amount, field + ".amount");
        BigDecimal max = Canon.optionalPositive(maxAmount, field + ".maxAmount");
        if (max != null && max.compareTo(min) < 0) {
            throw ApiException.badRequest(field + ".maxAmount não pode ser menor que amount");
        }
        return new Drop(Canon.target(target, field + ".target"), Canon.chance(chance, field + ".chance"), min, max);
    }
}
