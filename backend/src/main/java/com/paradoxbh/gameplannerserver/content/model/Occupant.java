package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;

import com.paradoxbh.gameplannerserver.common.ApiException;

/**
 * O que pode aparecer num ponto de spawn, com a própria chance de 0 a 1. A quantidade vai de
 * {@code amount} até {@code maxAmount}; as duas são opcionais, porque a origem nem sempre sabe.
 * {@code level} é o nível em que o alvo está ali (V14): é assim que o mapa marca onde fica a
 * bancada num nível, para casar com o que a receita exige.
 */
public record Occupant(Reference target, BigDecimal chance, BigDecimal amount, BigDecimal maxAmount, Integer level) {

    Occupant canonical(String field) {
        if (level != null && level < 0) {
            throw ApiException.badRequest(field + ".level não pode ser negativo");
        }
        BigDecimal min = Canon.optionalPositive(amount, field + ".amount");
        BigDecimal max = Canon.optionalPositive(maxAmount, field + ".maxAmount");
        if (min != null && max != null && max.compareTo(min) < 0) {
            throw ApiException.badRequest(field + ".maxAmount não pode ser menor que amount");
        }
        return new Occupant(Canon.target(target, field + ".target"), Canon.chance(chance, field + ".chance"), min, max,
                level);
    }
}
