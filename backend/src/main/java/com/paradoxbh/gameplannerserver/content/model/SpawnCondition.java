package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;

import com.paradoxbh.gameplannerserver.common.ApiException;

/**
 * Condição para o ponto de spawn valer. {@code type} é código aberto (altitude, time_of_day,
 * weather...), documentado em doc/spawn_and_spatial.md e não validado aqui.
 *
 * A linha carrega uma de quatro formas: faixa ({@code min} e {@code max}, inclusiva, nulo é sem
 * limite), código ({@code value}), referência ({@code target}) ou só o tipo (bandeira). Grandeza
 * única, como um intervalo de 20 s, vai com {@code min} igual a {@code max}.
 *
 * Linhas de tipos diferentes valem juntas (E); linhas do mesmo tipo, basta uma (OU) — é assim que
 * se expressa conjunto, ex.: três linhas weather são "clima em {a, b, c}". {@code negated} inverte
 * a linha: por tipo, vale quando alguma positiva casa (ou não há positiva) e nenhuma negativa casa.
 */
public record SpawnCondition(String type, String value, Reference target, BigDecimal min, BigDecimal max,
                             Boolean negated) {

    SpawnCondition canonical(String field) {
        String code = Canon.code(type, field + ".type", null);
        if (code == null) {
            throw ApiException.badRequest(field + ".type é obrigatório");
        }
        // Texto e não código: chave global de jogo tem maiúscula e dígito (KilledTroll).
        String text = Canon.text(value);
        BigDecimal low = Canon.number(min);
        BigDecimal high = Canon.number(max);
        if (low != null && high != null && high.compareTo(low) < 0) {
            throw ApiException.badRequest(field + ".max não pode ser menor que min");
        }
        // false e nulo viram a mesma coisa: senão toda reimportação pareceria mudança.
        return new SpawnCondition(code, text, Canon.reference(target, field + ".target"), low, high,
                Boolean.TRUE.equals(negated) ? Boolean.TRUE : null);
    }
}
