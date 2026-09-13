package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Loja. Os itens à venda ficam nas categorias da loja ({@link ShopCategoryDocument}), que
 * apontam para ela pelo código. {@code npc} é o código da entidade que atende.
 */
public record ShopDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        String npc,
        String resetType,
        List<String> categories,
        List<String> events,
        ContentMeta meta) implements ContentDocument<ShopDocument> {

    @Override
    public ShopDocument canonical(String extId) {
        return new ShopDocument(
                ExtIds.require(extId, "extId"),
                Canon.required(name, "name"),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.SHOP.code()),
                ExtIds.optional(npc, "npc"),
                Canon.code(resetType, "resetType", null),
                Canon.ids(categories, "categories"),
                Canon.ids(events, "events"),
                null);
    }

    @Override
    public ShopDocument withMeta(ContentMeta meta) {
        return new ShopDocument(extId, name, summary, description, media, npc, resetType, categories, events, meta);
    }

    @Override
    public ShopDocument withMedia(List<MediaLink> media) {
        return new ShopDocument(extId, name, summary, description, media, npc, resetType, categories, events, meta);
    }
}
