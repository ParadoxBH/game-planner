package com.paradoxbh.gameplannerserver.content.store;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.CategoryDocument;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;

@Component
public class CategoryHandler extends AbstractContentHandler<CategoryDocument, Void> {

    public CategoryHandler(JdbcClient jdbc, ContentTagsRepository tags) {
        super(jdbc, tags);
    }

    @Override
    public ContentKind kind() {
        return ContentKind.CATEGORY;
    }

    @Override
    public Class<CategoryDocument> documentType() {
        return CategoryDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("applies_to");
    }

    @Override
    protected List<Object> specificValues(CategoryDocument category) {
        return java.util.Collections.singletonList(category.appliesTo());
    }

    @Override
    protected CategoryDocument map(Map<String, Object> row, ContentTags tags, Void children, ContentMeta meta) {
        return new CategoryDocument(
                Rows.string(row, "ext_id"),
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                Rows.string(row, "applies_to"),
                tags.events(),
                meta);
    }

    /** Categoria pode estar ligada a eventos e ter mídias; não tem categorias nem atributos próprios. */
    @Override
    public ContentTags tagsOf(CategoryDocument category) {
        return new ContentTags(List.of(), category.events(), Map.of(), category.media());
    }

    /** appliesTo=item traz as categorias de item e as de ambos; both, só as de ambos. */
    @Override
    protected Map<String, Filter> specificFilters() {
        return Map.of("appliesTo", (name, value, param, params) -> {
            if (!Set.of("item", "entity", "both").contains(value)) {
                throw ApiException.badRequest("appliesTo precisa ser item, entity ou both");
            }
            params.put(param, value);
            return "t.applies_to IN (:" + param + ", 'both')";
        });
    }
}
