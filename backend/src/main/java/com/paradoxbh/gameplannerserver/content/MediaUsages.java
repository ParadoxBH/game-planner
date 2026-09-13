package com.paradoxbh.gameplannerserver.content;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Lista fechada de usos de mídia e onde cada um vale. O CHECK de content_media (V5) tem a
 * lista completa; aqui fica também a restrição por tipo de conteúdo.
 */
public final class MediaUsages {

    /** Tipo de conteúdo do próprio jogo na tabela content_media. */
    public static final String GAME_KIND = "game";

    /** Ordem de exibição dos usos. */
    public static final List<String> ORDER = List.of("icon", "capsule", "thumbnail", "banner", "screenshot");

    private static final Map<String, Set<String>> ALLOWED = Map.of(
            GAME_KIND, Set.of("icon", "capsule", "thumbnail", "banner"),
            ContentKind.ITEM.code(), Set.of("icon", "screenshot"),
            ContentKind.ENTITY.code(), Set.of("icon", "screenshot"),
            ContentKind.CATEGORY.code(), Set.of("icon", "banner"),
            ContentKind.EVENT.code(), Set.of("icon", "banner"));

    private MediaUsages() {
    }

    public static boolean isAllowed(String kind, String usage) {
        return ALLOWED.getOrDefault(kind, Set.of()).contains(usage);
    }

    /** Usos permitidos para o tipo, na ordem de exibição, para mensagens de erro. */
    public static String describeAllowed(String kind) {
        Set<String> allowed = ALLOWED.getOrDefault(kind, Set.of());
        return ORDER.stream().filter(allowed::contains).collect(Collectors.joining(", "));
    }

    public static int position(String usage) {
        return ORDER.indexOf(usage);
    }
}
