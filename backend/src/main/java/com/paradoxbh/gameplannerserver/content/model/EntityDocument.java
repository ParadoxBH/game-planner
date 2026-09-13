package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/** Entidade: criatura, NPC, estrutura, recurso coletável, bancada. */
public record EntityDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        String rarityCode,
        Integer level,
        Integer respawnDelayMinutes,
        BigDecimal baseBuyPrice,
        BigDecimal baseSellPrice,
        String variantOf,
        List<String> categories,
        List<String> events,
        Map<String, Object> attributes,
        ContentMeta meta) implements ContentDocument<EntityDocument> {

    @Override
    public EntityDocument canonical(String extId) {
        String id = ExtIds.require(extId, "extId");
        String base = ExtIds.optional(variantOf, "variantOf");
        if (id.equals(base)) {
            throw ApiException.badRequest("Uma entidade não pode ser variante de si mesma");
        }
        return new EntityDocument(
                id,
                Canon.required(name, "name"),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.ENTITY.code()),
                ExtIds.optional(rarityCode, "rarityCode"),
                level,
                respawnDelayMinutes,
                Canon.number(baseBuyPrice),
                Canon.number(baseSellPrice),
                base,
                Canon.ids(categories, "categories"),
                Canon.ids(events, "events"),
                Canon.attributes(attributes),
                null);
    }

    @Override
    public EntityDocument withMeta(ContentMeta meta) {
        return new EntityDocument(extId, name, summary, description, media, rarityCode, level, respawnDelayMinutes,
                baseBuyPrice, baseSellPrice, variantOf, categories, events, attributes, meta);
    }

    @Override
    public EntityDocument withMedia(List<MediaLink> media) {
        return new EntityDocument(extId, name, summary, description, media, rarityCode, level, respawnDelayMinutes,
                baseBuyPrice, baseSellPrice, variantOf, categories, events, attributes, meta);
    }
}
