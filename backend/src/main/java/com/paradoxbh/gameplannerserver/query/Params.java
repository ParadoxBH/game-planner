package com.paradoxbh.gameplannerserver.query;

import java.util.Map;

/** Parâmetros SQL das regras, com nomes q0, q1... que não colidem com os que a consulta já tem. */
final class Params {

    private final Map<String, Object> values;
    private int next;

    Params(Map<String, Object> values) {
        this.values = values;
    }

    /** Guarda o valor e devolve o marcador para o SQL, ex.: ":q3". Lista vira lista de parâmetros. */
    String bind(Object value) {
        String name;
        do {
            name = "q" + next++;
        } while (values.containsKey(name));
        values.put(name, value);
        return ":" + name;
    }
}
