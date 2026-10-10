package com.paradoxbh.gameplannerserver.common;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Busca sem diferença de maiúscula e de acento. No banco, a comparação usa a função {@code search_fold} (V25), dos
 * dois lados; isto é o equivalente para o que se filtra em memória. As duas tiram acento e passam para minúsculas;
 * a do banco (unaccent) também troca ligaduras como "æ" por "ae", que aqui ficam como estão.
 */
public final class TextFold {

    private static final Pattern MARKS = Pattern.compile("\\p{M}+");

    private TextFold() {
    }

    public static String fold(String value) {
        if (value == null) {
            return null;
        }
        return MARKS.matcher(Normalizer.normalize(value, Normalizer.Form.NFD)).replaceAll("").toLowerCase(Locale.ROOT);
    }

    /** {@code text} contém {@code term}, os dois já sem acento e em minúsculas. Termo vazio casa com tudo. */
    public static boolean contains(String text, String term) {
        return term == null || term.isEmpty() || (text != null && fold(text).contains(fold(term)));
    }
}
