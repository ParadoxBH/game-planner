package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;
import java.util.Set;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Categoria. {@code appliesTo}: item, entity ou both (padrão). {@code primary}: categoria principal, a que
 * abre a listagem de itens e entidades; as demais são sub-categorias. Padrão false.
 */
public record CategoryDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        String appliesTo,
        Boolean primary,
        List<String> events,
        ContentMeta meta) implements ContentDocument<CategoryDocument> {

    private static final Set<String> TARGETS = Set.of("item", "entity", "both");

    @Override
    public CategoryDocument canonical(String extId) {
        String target = Canon.text(appliesTo) == null ? "both" : appliesTo;
        if (!TARGETS.contains(target)) {
            throw ApiException.badRequest("appliesTo precisa ser item, entity ou both");
        }
        return new CategoryDocument(
                ExtIds.require(extId, "extId"),
                Canon.required(name, "name"),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.CATEGORY.code()),
                target,
                primary != null && primary,
                Canon.ids(events, "events"),
                null);
    }

    @Override
    public CategoryDocument withMeta(ContentMeta meta) {
        return new CategoryDocument(extId, name, summary, description, media, appliesTo, primary, events, meta);
    }

    @Override
    public CategoryDocument withMedia(List<MediaLink> media) {
        return new CategoryDocument(extId, name, summary, description, media, appliesTo, primary, events, meta);
    }
}
