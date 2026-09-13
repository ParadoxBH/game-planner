package com.paradoxbh.gameplannerserver.media.domain;

import java.util.Locale;
import java.util.Optional;

/** Tamanhos gerados para toda imagem. As dimensões máximas vêm da configuração. */
public enum MediaVariant {
    ICON,
    THUMB,
    FULL;

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
