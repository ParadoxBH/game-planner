package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;

import com.paradoxbh.gameplannerserver.common.ApiException;

/**
 * O que pode aparecer num ponto de spawn, com a própria chance de 0 a 1. A quantidade vai de
 * {@code amount} até {@code maxAmount}; as duas são opcionais, porque a origem nem sempre sabe.
 */
public record Occupant(Reference target, BigDecimal chance, BigDecimal amount, BigDecimal maxAmount) {

    Occupant canonical(String field) {
        BigDecimal min = Canon.optionalPositive(amount, field + ".amount");
        BigDecimal max = Canon.optionalPositive(maxAmount, field + ".maxAmount");
        if (min != null && max != null && max.compareTo(min) < 0) {
            throw ApiException.badRequest(field + ".maxAmount não pode ser menor que amount");
        }
        return new Occupant(Canon.target(target, field + ".target"), Canon.chance(chance, field + ".chance"), min, max);
    }
}
