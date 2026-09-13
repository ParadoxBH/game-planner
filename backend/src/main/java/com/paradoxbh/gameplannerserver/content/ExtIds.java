package com.paradoxbh.gameplannerserver.content;

import java.util.regex.Pattern;

import com.paradoxbh.gameplannerserver.common.ApiException;

/**
 * Formato de id textual de conteúdo — o mesmo critério da função is_valid_ext_id (V4).
 *
 * Aceita espaço e parênteses no meio, porque a base real tem ids assim ("lox bite",
 * "Hound (1)_..."). Recusa só o que quebra um caminho HTTP.
 */
public final class ExtIds {

    private static final Pattern VALID = Pattern.compile("[^/\\\\?#%;\\p{Cntrl}]{1,128}");

    private ExtIds() {
    }

    public static String require(String value, String field) {
        if (value == null || value.isEmpty()) {
            throw ApiException.badRequest(field + " é obrigatório");
        }
        if (!VALID.matcher(value).matches() || !value.equals(value.trim())) {
            throw ApiException.badRequest(field + " inválido: \"" + value + "\". Use até 128 caracteres, "
                    + "sem / \\ ? # % ; e sem espaço no início ou no fim.");
        }
        return value;
    }

    /** Nulo ou em branco vira nulo; qualquer outro valor precisa ser válido. */
    public static String optional(String value, String field) {
        return value == null || value.isBlank() ? null : require(value, field);
    }
}
