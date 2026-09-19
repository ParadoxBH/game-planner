package com.paradoxbh.gameplannerserver.media.domain;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Tamanhos de uma imagem. As dimensões máximas vêm da configuração. {@code icon}, {@code thumb} e
 * {@code full} são gerados para toda imagem; {@code large} só quando o upload pede, para imagem de mapa.
 */
public enum MediaVariant {
    ICON,
    THUMB,
    FULL,
    LARGE;

    /** Gerados em todo upload. */
    public static final List<MediaVariant> STANDARD = List.of(ICON, THUMB, FULL);

    public String code() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static Optional<MediaVariant> fromCode(String code) {
        for (MediaVariant variant : values()) {
            if (variant.code().equals(code)) {
                return Optional.of(variant);
            }
        }
        return Optional.empty();
    }
}
