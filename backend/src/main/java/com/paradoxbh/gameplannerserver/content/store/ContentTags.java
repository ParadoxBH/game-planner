package com.paradoxbh.gameplannerserver.content.store;

import java.util.List;
import java.util.Map;

import com.paradoxbh.gameplannerserver.content.model.MediaLink;

/**
 * O que um conteúdo guarda fora da própria tabela: categorias, eventos, atributos e mídias.
 * {@code media} nula na escrita deixa as ligações de imagem como estão.
 */
public record ContentTags(List<String> categories, List<String> events, Map<String, Object> attributes,
                          List<MediaLink> media) {

    public static final ContentTags EMPTY = new ContentTags(List.of(), List.of(), Map.of(), List.of());
}
