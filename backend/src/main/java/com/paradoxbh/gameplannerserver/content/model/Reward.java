package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;

/** Recompensa de um código de resgate: o alvo e a quantidade. */
public record Reward(Reference target, BigDecimal amount) {

    Reward canonical(String field) {
        return new Reward(Canon.target(target, field + ".target"), Canon.positive(amount, field + ".amount"));
    }
}
