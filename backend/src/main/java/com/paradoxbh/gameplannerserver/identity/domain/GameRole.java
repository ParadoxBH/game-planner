package com.paradoxbh.gameplannerserver.identity.domain;

/** Papel dentro de um jogo. A ordem importa: cada papel inclui os anteriores. */
public enum GameRole {
    EDITOR,
    MODERATOR,
    OWNER;

    public boolean atLeast(GameRole required) {
        return ordinal() >= required.ordinal();
    }

    public String code() {
        return name().toLowerCase();
    }

    public static GameRole fromCode(String code) {
        return valueOf(code.toUpperCase());
    }
}
