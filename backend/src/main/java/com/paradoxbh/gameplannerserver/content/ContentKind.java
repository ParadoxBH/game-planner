package com.paradoxbh.gameplannerserver.content;

import java.util.Optional;

/**
 * Tipos de conteúdo de jogo. {@code code} é o que aparece em referências e no histórico;
 * {@code path}, o nome do recurso na URL.
 */
public enum ContentKind {
    ITEM("item", "item", "Item", "items"),
    ENTITY("entity", "entity", "Entidade", "entities"),
    CATEGORY("category", "category", "Categoria", "categories"),
    EVENT("event", "game_event", "Evento", "events"),
    RECIPE("recipe", "recipe", "Receita", "recipes"),
    SHOP("shop", "shop", "Loja", "shops"),
    SHOP_CATEGORY("shop_category", "shop_category", "Categoria de loja", "shop-categories"),
    MAP("map", "game_map", "Mapa", "maps"),
    LOCATION("location", "location", "Local", "locations"),
    SPAWN_POINT("spawn_point", "spawn_point", "Ponto de spawn", "spawn-points"),
    COLLECTION("collection", "collection", "Coleção", "collections"),
    COLLECTION_GROUP("collection_group", "collection_group", "Grupo de coleção", "collection-groups"),
    REDEMPTION_CODE("redemption_code", "redemption_code", "Código de resgate", "codes");

    private final String code;
    private final String table;
    private final String label;
    private final String path;

    ContentKind(String code, String table, String label, String path) {
        this.code = code;
        this.table = table;
        this.label = label;
        this.path = path;
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

    public String path() {
        return path;
    }

    public static Optional<ContentKind> fromCode(String code) {
        for (ContentKind kind : values()) {
            if (kind.code.equals(code)) {
                return Optional.of(kind);
            }
        }
        return Optional.empty();
    }

    public static Optional<ContentKind> fromPath(String path) {
        for (ContentKind kind : values()) {
            if (kind.path.equals(path)) {
                return Optional.of(kind);
            }
        }
        return Optional.empty();
    }
}
