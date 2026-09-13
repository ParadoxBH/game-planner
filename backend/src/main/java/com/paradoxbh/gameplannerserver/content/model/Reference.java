package com.paradoxbh.gameplannerserver.content.model;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Referência textual a outro conteúdo, que pode ainda não estar cadastrado.
 * {@code kind} nulo quando a origem não sabe o tipo.
 */
public record Reference(String kind, String extId) {

    private static final Pattern KIND_PREFIX = Pattern.compile("([a-z_]{1,32}):(.+)");

    /**
     * Lê uma referência escrita em parâmetro de URL: "tipo:id", ou só "id" para casar com qualquer
     * tipo. Um id que comece com letras minúsculas seguidas de ":" é lido como tipo.
     */
    public static Reference parse(String value, String field) {
        if (value != null) {
            Matcher matcher = KIND_PREFIX.matcher(value);
            if (matcher.matches()) {
                return new Reference(matcher.group(1), ExtIds.require(matcher.group(2), field));
            }
        }
        return new Reference(null, ExtIds.require(value, field));
    }
}
