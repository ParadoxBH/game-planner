package com.paradoxbh.gameplannerserver.content;

import java.util.Optional;

/** Tipos de conteúdo de jogo. {@code code} é o que aparece em referências e no histórico. */
public enum ContentKind {
    ITEM("item", "item", "Item"),
    ENTITY("entity", "entity", "Entidade"),
    CATEGORY("category", "category", "Categoria"),
    EVENT("event", "game_event", "Evento");

    private final String code;
    private final String table;
    private final String label;

    ContentKind(String code, String table, String label) {
        this.code = code;
        this.table = table;
        this.label = label;
    }

    public String code() {
        return code;
    }

    /** Nome da tabela. Vem só deste enum, nunca de entrada do usuário. */
    public String table() {
        return table;
    }

    public String label() {
        return label;
    }

    public static Optional<ContentKind> fromCode(String code) {
        for (ContentKind kind : values()) {
            if (kind.code.equals(code)) {
                return Optional.of(kind);
            }
        }
        return Optional.empty();
    }
}
