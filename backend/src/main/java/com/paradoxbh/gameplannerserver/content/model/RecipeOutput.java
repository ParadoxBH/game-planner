package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;

/**
 * Produto de uma receita. {@code chance} de 0 a 1 quando o produto não sai sempre;
 * {@code level} quando ele sai num nível.
 */
public record RecipeOutput(Reference target, BigDecimal amount, BigDecimal chance, Integer level) {

    RecipeOutput canonical(String field) {
        return new RecipeOutput(
                Canon.target(target, field + ".target"),
                Canon.positive(amount, field + ".amount"),
                Canon.chance(chance, field + ".chance"),
                level);
    }
}
