package com.paradoxbh.gameplannerserver.content.model;

import java.time.Instant;
import java.util.List;

/**
 * Mídia ligada a um conteúdo ou ao jogo (tabela content_media).
 *
 * {@code usage} diz como a imagem é usada: icon, capsule, thumbnail, banner, screenshot.
 * {@code addedBy} e {@code addedAt} são do servidor: ignorados na escrita e preservados
 * enquanto a mesma imagem continuar no mesmo uso. A ordem da lista é a de exibição.
 */
public record MediaLink(String usage, String mediaId, String addedBy, Instant addedAt) {

    /** Valida para o tipo de conteúdo, remove duplicatas e ordena por uso mantendo a ordem dentro de cada uso. */
    public static List<MediaLink> canonical(List<MediaLink> links, String kind) {
        return Canon.media(links, kind);
    }
}
