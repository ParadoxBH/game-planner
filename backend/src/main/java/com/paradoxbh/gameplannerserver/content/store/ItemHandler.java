package com.paradoxbh.gameplannerserver.content.store;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.ItemDocument;
import com.paradoxbh.gameplannerserver.content.model.Reference;

@Component
public class ItemHandler extends AbstractContentHandler<ItemDocument, Void> {

    public ItemHandler(JdbcClient jdbc, ContentTagsRepository tags) {
        super(jdbc, tags);
    }

    @Override
    public ContentKind kind() {
        return ContentKind.ITEM;
    }

    @Override
    public Class<ItemDocument> documentType() {
        return ItemDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("rarity_code", "level", "base_buy_price", "base_sell_price",
                "currency_kind", "currency_ext_id", "variant_of_ext_id");
    }

    @Override
    protected List<Object> specificValues(ItemDocument item) {
        Reference currency = item.currency();
        return Arrays.asList(item.rarityCode(), item.level(), item.baseBuyPrice(), item.baseSellPrice(),
                currency == null ? null : currency.kind(),
                currency == null ? null : currency.extId(),
                item.variantOf());
    }

    @Override
    protected ItemDocument map(Map<String, Object> row, ContentTags tags, Void children, ContentMeta meta) {
        String currencyExtId = Rows.string(row, "currency_ext_id");
        return new ItemDocument(
                Rows.string(row, "ext_id"),
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                Rows.string(row, "rarity_code"),
                Rows.integer(row, "level"),
                Rows.decimal(row, "base_buy_price"),
                Rows.decimal(row, "base_sell_price"),
                currencyExtId == null ? null : new Reference(Rows.string(row, "currency_kind"), currencyExtId),
                Rows.string(row, "variant_of_ext_id"),
                tags.categories(),
                tags.events(),
                tags.attributes(),
                meta);
    }

    @Override
    public ContentTags tagsOf(ItemDocument item) {
        return new ContentTags(item.categories(), item.events(), item.attributes(), item.media());
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
