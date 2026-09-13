package com.paradoxbh.gameplannerserver.content;

import java.util.Optional;

/** Tipos de conteúdo de jogo. {@code code} é o que aparece em referências e no histórico. */
public enum ContentKind {
    ITEM("item", "item", "Item"),
    ENTITY("entity", "entity", "Entidade"),
    CATEGORY("category", "category", "Categoria"),
    EVENT("event", "game_event", "Evento"),
    RECIPE("recipe", "recipe", "Receita"),
    SHOP("shop", "shop", "Loja"),
    SHOP_CATEGORY("shop_category", "shop_category", "Categoria de loja"),
    MAP("map", "game_map", "Mapa"),
    LOCATION("location", "location", "Local"),
    SPAWN_POINT("spawn_point", "spawn_point", "Ponto de spawn"),
    COLLECTION("collection", "collection", "Coleção"),
    COLLECTION_GROUP("collection_group", "collection_group", "Grupo de coleção"),
    REDEMPTION_CODE("redemption_code", "redemption_code", "Código de resgate");

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
