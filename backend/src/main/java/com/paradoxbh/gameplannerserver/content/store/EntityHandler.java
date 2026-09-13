package com.paradoxbh.gameplannerserver.content.store;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.EntityDocument;

@Component
public class EntityHandler extends AbstractContentHandler<EntityDocument> {

    public EntityHandler(JdbcClient jdbc, ContentTagsRepository tags) {
        super(jdbc, tags);
    }

    @Override
    public ContentKind kind() {
        return ContentKind.ENTITY;
    }

    @Override
    public Class<EntityDocument> documentType() {
        return EntityDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("rarity_code", "level", "respawn_delay_minutes", "base_buy_price", "base_sell_price",
                "variant_of_ext_id");
    }

    @Override
    protected List<Object> specificValues(EntityDocument entity) {
        return Arrays.asList(entity.rarityCode(), entity.level(), entity.respawnDelayMinutes(),
                entity.baseBuyPrice(), entity.baseSellPrice(), entity.variantOf());
    }

    @Override
    protected EntityDocument map(Map<String, Object> row, ContentTags tags, ContentMeta meta) {
        return new EntityDocument(
                Rows.string(row, "ext_id"),
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                Rows.string(row, "rarity_code"),
                Rows.integer(row, "level"),
                Rows.integer(row, "respawn_delay_minutes"),
                Rows.decimal(row, "base_buy_price"),
                Rows.decimal(row, "base_sell_price"),
                Rows.string(row, "variant_of_ext_id"),
                tags.categories(),
                tags.events(),
                tags.attributes(),
                meta);
    }

    @Override
    public ContentTags tagsOf(EntityDocument entity) {
        return new ContentTags(entity.categories(), entity.events(), entity.attributes(), entity.media());
    }

    @Override
    protected Map<String, String> specificSortColumns() {
        return Map.of("level", "t.level");
    }

    @Override
    protected boolean hasRarity() {
        return true;
    }
}
