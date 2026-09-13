package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Categoria de uma loja, com os itens à venda. {@code shop} é o código da loja e pode apontar para
 * loja ainda não cadastrada. {@code resetType} vale para a categoria; cada item pode ter o seu.
 */
public record ShopCategoryDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        String shop,
        String resetType,
        List<String> events,
        List<ShopItem> items,
        ContentMeta meta) implements ContentDocument<ShopCategoryDocument> {

    @Override
    public ShopCategoryDocument canonical(String extId) {
        return new ShopCategoryDocument(
                ExtIds.require(extId, "extId"),
                Canon.required(name, "name"),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.SHOP_CATEGORY.code()),
                ExtIds.optional(shop, "shop"),
                Canon.code(resetType, "resetType", null),
                Canon.ids(events, "events"),
                Canon.rows(items, "items", ShopItem::canonical),
                null);
    }

    @Override
    public ShopCategoryDocument withMeta(ContentMeta meta) {
        return new ShopCategoryDocument(extId, name, summary, description, media, shop, resetType, events, items, meta);
    }

    @Override
    public ShopCategoryDocument withMedia(List<MediaLink> media) {
        return new ShopCategoryDocument(extId, name, summary, description, media, shop, resetType, events, items, meta);
    }
}
