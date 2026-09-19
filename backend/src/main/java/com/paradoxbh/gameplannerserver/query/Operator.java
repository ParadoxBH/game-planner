package com.paradoxbh.gameplannerserver.query;

import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonValue;

/** Operador de regra. {@link Arity} diz a forma do valor que ele espera. */
public enum Operator {
    EQUAL(Arity.ONE),
    NOT_EQUAL(Arity.ONE),
    IN(Arity.LIST),
    NOT_IN(Arity.LIST),
    CONTAINS(Arity.ONE),
    NOT_CONTAINS(Arity.ONE),
    BEGINS_WITH(Arity.ONE),
    ENDS_WITH(Arity.ONE),
    LESS(Arity.ONE),
    LESS_OR_EQUAL(Arity.ONE),
    GREATER(Arity.ONE),
    GREATER_OR_EQUAL(Arity.ONE),
    BETWEEN(Arity.PAIR),
    /** Geometria cruza o retângulo [minX, minY, maxX, maxY], em coordenadas de jogo. */
    INTERSECTS(Arity.BOX),
    /** Campo vazio. Em campo de lista (categorias, drops...), não ter nenhum. */
    IS_NULL(Arity.NONE),
    /** Campo preenchido. Em campo de lista, ter algum. */
    IS_NOT_NULL(Arity.NONE);

    /** Sem valor, um valor, lista de valores, [mínimo, máximo] ou [minX, minY, maxX, maxY]. */
    public enum Arity { NONE, ONE, LIST, PAIR, BOX }

    private final Arity arity;

    Operator(Arity arity) {
        this.arity = arity;
    }

    public Arity arity() {
        return arity;
    }

    /** Nome no JSON, ex.: "not_equal". */
    @JsonValue
    public String code() {
        return name().toLowerCase();
    }

    public static Optional<Operator> fromCode(String code) {
        for (Operator operator : values()) {
            if (operator.code().equals(code)) {
                return Optional.of(operator);
            }
        }
        return Optional.empty();
    }
}
