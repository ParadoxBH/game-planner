package com.paradoxbh.gameplannerserver.content.store;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.ShopDocument;

/** Loja. Os itens ficam nas categorias da loja (ShopCategoryHandler). */
@Component
public class ShopHandler extends AbstractContentHandler<ShopDocument, Void> {

    public ShopHandler(JdbcClient jdbc, ContentTagsRepository tags) {
        super(jdbc, tags);
    }

    @Override
    public ContentKind kind() {
        return ContentKind.SHOP;
    }

    @Override
    public Class<ShopDocument> documentType() {
        return ShopDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("npc_ext_id", "reset_type");
    }

    @Override
    protected List<Object> specificValues(ShopDocument shop) {
        return Arrays.asList(shop.npc(), shop.resetType());
    }

    @Override
    protected ShopDocument map(Map<String, Object> row, ContentTags tags, Void children, ContentMeta meta) {
        return new ShopDocument(
                Rows.string(row, "ext_id"),
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                Rows.string(row, "npc_ext_id"),
                Rows.string(row, "reset_type"),
                tags.categories(),
                tags.events(),
                meta);
    }

    @Override
    public ContentTags tagsOf(ShopDocument shop) {
        return new ContentTags(shop.categories(), shop.events(), Map.of(), shop.media());
    }

    @Override
    protected Map<String, Filter> specificFilters() {
        return Map.of("npc", codeColumn("t.npc_ext_id"));
    }
}
