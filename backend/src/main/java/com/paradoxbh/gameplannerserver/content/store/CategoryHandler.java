package com.paradoxbh.gameplannerserver.content.store;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.CategoryDocument;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.query.FieldType;
import com.paradoxbh.gameplannerserver.query.QueryField;
import com.paradoxbh.gameplannerserver.query.QueryField.Option;

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
        return List.of("applies_to", "is_primary");
    }

    @Override
    protected List<Object> specificValues(CategoryDocument category) {
        return java.util.Arrays.asList(category.appliesTo(), category.primary());
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
                Rows.bool(row, "is_primary"),
                tags.events(),
                meta);
    }

    /** Categoria pode estar ligada a eventos e ter mídias; não tem categorias nem atributos próprios. */
    @Override
    public ContentTags tagsOf(CategoryDocument category) {
        return new ContentTags(List.of(), category.events(), Map.of(), category.media());
    }

    /**
     * appliesTo "both" vale para item e entidade: categorias de item são appliesTo in [item, both]. primary é a
     * categoria principal.
     */
    @Override
    protected List<QueryField> specificFields() {
        return List.of(
                QueryField.options("appliesTo", "Aplica-se a", "t.applies_to",
                        new Option("item", "Item"), new Option("entity", "Entidade"), new Option("both", "Ambos")),
                QueryField.column("primary", "Principal", FieldType.BOOLEAN, "t.is_primary"));
    }
}
