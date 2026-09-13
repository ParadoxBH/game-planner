package com.paradoxbh.gameplannerserver.content.store;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.Reference;
import com.paradoxbh.gameplannerserver.content.model.ShopCategoryDocument;
import com.paradoxbh.gameplannerserver.content.model.ShopItem;
import com.paradoxbh.gameplannerserver.content.store.ChildRows.Table;

/** Categoria de loja e seus itens, que são linhas-filhas posicionais. */
@Component
public class ShopCategoryHandler extends AbstractContentHandler<ShopCategoryDocument, Map<String, List<ShopItem>>> {

    private static final Table ITEMS = Table.of("shop_category_item", "category_ext_id");

    private final ChildRows children;

    public ShopCategoryHandler(JdbcClient jdbc, ContentTagsRepository tags, ChildRows children) {
        super(jdbc, tags);
        this.children = children;
    }

    @Override
    public ContentKind kind() {
        return ContentKind.SHOP_CATEGORY;
    }

    @Override
    public Class<ShopCategoryDocument> documentType() {
        return ShopCategoryDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("shop_ext_id", "reset_type");
    }

    @Override
    protected List<Object> specificValues(ShopCategoryDocument category) {
        return Arrays.asList(category.shop(), category.resetType());
    }

    @Override
    protected ShopCategoryDocument map(Map<String, Object> row, ContentTags tags, Map<String, List<ShopItem>> items,
                                       ContentMeta meta) {
        String id = Rows.string(row, "ext_id");
        return new ShopCategoryDocument(
                id,
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                Rows.string(row, "shop_ext_id"),
                Rows.string(row, "reset_type"),
                tags.events(),
                items.getOrDefault(id, List.of()),
                meta);
    }

    /** Categoria de loja tem eventos e imagens; não tem categorias nem atributos. */
    @Override
    public ContentTags tagsOf(ShopCategoryDocument category) {
        return new ContentTags(List.of(), category.events(), Map.of(), category.media());
    }

    @Override
    protected Map<String, List<ShopItem>> loadChildren(String gameId, List<String> extIds) {
        return children.load(ITEMS, gameId, extIds, ShopCategoryHandler::item);
    }

    @Override
    protected void replaceChildren(String gameId, ShopCategoryDocument category) {
        children.replace(ITEMS, gameId, category.extId(),
                category.items().stream().map(ShopCategoryHandler::itemRow).toList());
    }

    @Override
    protected void deleteChildren(String gameId, String extId) {
        children.delete(ITEMS, gameId, extId);
    }

    /** shop é o código da loja; sells aceita "tipo:id" ou "id". */
    @Override
    protected Map<String, Filter> specificFilters() {
        return Map.of(
                "shop", codeColumn("t.shop_ext_id"),
                "sells", childReference("shop_category_item", "category_ext_id", null));
    }

    private static Map<String, Object> itemRow(ShopItem item) {
        Reference currency = item.currency();
        return ChildRows.row(
                "target_kind", item.target().kind(),
                "target_ext_id", item.target().extId(),
                "quantity", item.quantity(),
                "purchase_limit", item.purchaseLimit(),
                "price", item.price(),
                "currency_kind", currency == null ? null : currency.kind(),
                "currency_ext_id", currency == null ? null : currency.extId(),
                "reset_type", item.resetType(),
                "rarity_code", item.rarityCode());
    }

    private static ShopItem item(Map<String, Object> row) {
        return new ShopItem(
                Rows.reference(row, "target_kind", "target_ext_id"),
                Rows.decimal(row, "quantity"),
                Rows.integer(row, "purchase_limit"),
                Rows.decimal(row, "price"),
                Rows.reference(row, "currency_kind", "currency_ext_id"),
                Rows.string(row, "reset_type"),
                Rows.string(row, "rarity_code"));
    }
}
