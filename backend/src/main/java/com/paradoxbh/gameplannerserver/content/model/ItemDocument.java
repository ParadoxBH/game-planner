package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Item. {@code variantOf} aponta para o item base quando este é uma variante
 * (ver doc/backend_plan.md 4.5); {@code currency} é a moeda dos preços base, que também
 * é conteúdo e pode ser item ou outra coisa.
 */
public record ItemDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        String rarityCode,
        Integer level,
        BigDecimal baseBuyPrice,
        BigDecimal baseSellPrice,
        Reference currency,
        String variantOf,
        List<String> categories,
        List<String> events,
        Map<String, Object> attributes,
        ContentMeta meta) implements ContentDocument<ItemDocument> {

    @Override
    public ItemDocument canonical(String extId) {
        String id = ExtIds.require(extId, "extId");
        String base = ExtIds.optional(variantOf, "variantOf");
        if (id.equals(base)) {
            throw ApiException.badRequest("Um item não pode ser variante de si mesmo");
        }
        return new ItemDocument(
                id,
                Canon.required(name, "name"),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.ITEM.code()),
                ExtIds.optional(rarityCode, "rarityCode"),
                level,
                Canon.number(baseBuyPrice),
                Canon.number(baseSellPrice),
                Canon.reference(currency, "currency"),
                base,
                Canon.ids(categories, "categories"),
                Canon.ids(events, "events"),
                Canon.attributes(attributes),
                null);
    }

    @Override
    public ItemDocument withMeta(ContentMeta meta) {
        return new ItemDocument(extId, name, summary, description, media, rarityCode, level, baseBuyPrice,
                baseSellPrice, currency, variantOf, categories, events, attributes, meta);
    }

    @Override
    public ItemDocument withMedia(List<MediaLink> media) {
        return new ItemDocument(extId, name, summary, description, media, rarityCode, level, baseBuyPrice,
                baseSellPrice, currency, variantOf, categories, events, attributes, meta);
    }
}
