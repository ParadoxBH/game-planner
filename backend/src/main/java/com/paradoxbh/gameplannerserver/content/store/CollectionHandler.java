package com.paradoxbh.gameplannerserver.content.store;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.CollectionDocument;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.Reference;

@Component
public class CollectionHandler extends AbstractContentHandler<CollectionDocument, Void> {

    public CollectionHandler(JdbcClient jdbc, ContentTagsRepository tags) {
        super(jdbc, tags);
    }

    @Override
    public ContentKind kind() {
        return ContentKind.COLLECTION;
    }

    @Override
    public Class<CollectionDocument> documentType() {
        return CollectionDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of();
    }

    @Override
    protected List<Object> specificValues(CollectionDocument collection) {
        return List.of();
    }

    @Override
    protected CollectionDocument map(Map<String, Object> row, ContentTags tags, Void children, ContentMeta meta) {
        return new CollectionDocument(
                Rows.string(row, "ext_id"),
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                tags.events(),
                meta);
    }

    /** Coleção tem eventos e imagens; não tem categorias nem atributos. */
    @Override
    public ContentTags tagsOf(CollectionDocument collection) {
        return new ContentTags(List.of(), collection.events(), Map.of(), collection.media());
    }

    /** member aceita "tipo:id" ou "id": coleções com um grupo que tem o alvo. */
    @Override
    protected Map<String, Filter> specificFilters() {
        return Map.of("member", (name, value, param, params) -> {
            Reference target = Reference.parse(value, name);
            params.put(param, target.extId());
            String kind = "";
            if (target.kind() != null) {
                kind = " AND (m.target_kind IS NULL OR m.target_kind = :" + param + "Kind)";
                params.put(param + "Kind", target.kind());
            }
            return "EXISTS (SELECT 1 FROM collection_group_collection gc JOIN collection_group_member m"
                    + " ON m.game_id = gc.game_id AND m.group_ext_id = gc.group_ext_id"
                    + " WHERE gc.game_id = t.game_id AND gc.collection_ext_id = t.ext_id"
                    + " AND m.target_ext_id = :" + param + kind + ")";
        });
    }
}
