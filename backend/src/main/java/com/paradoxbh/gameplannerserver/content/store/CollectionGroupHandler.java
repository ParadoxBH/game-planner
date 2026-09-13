package com.paradoxbh.gameplannerserver.content.store;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.CollectionGroupDocument;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.Reference;
import com.paradoxbh.gameplannerserver.content.store.ChildRows.Table;

@Component
public class CollectionGroupHandler extends AbstractContentHandler<CollectionGroupDocument, CollectionGroupHandler.Parts> {

    private static final Table COLLECTIONS = Table.of("collection_group_collection", "group_ext_id");
    private static final Table MEMBERS = Table.of("collection_group_member", "group_ext_id");

    /** Coleções e membros de uma página de grupos, por ext_id. */
    record Parts(Map<String, List<String>> collections, Map<String, List<Reference>> members) {
    }

    private final ChildRows children;

    public CollectionGroupHandler(JdbcClient jdbc, ContentTagsRepository tags, ChildRows children) {
        super(jdbc, tags);
        this.children = children;
    }

    @Override
    public ContentKind kind() {
        return ContentKind.COLLECTION_GROUP;
    }

    @Override
    public Class<CollectionGroupDocument> documentType() {
        return CollectionGroupDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of();
    }

    @Override
    protected List<Object> specificValues(CollectionGroupDocument group) {
        return List.of();
    }

    @Override
    protected CollectionGroupDocument map(Map<String, Object> row, ContentTags tags, Parts parts, ContentMeta meta) {
        String id = Rows.string(row, "ext_id");
        return new CollectionGroupDocument(
                id,
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                parts.collections().getOrDefault(id, List.of()),
                parts.members().getOrDefault(id, List.of()),
                tags.events(),
                meta);
    }

    /** Grupo tem eventos e imagens; não tem categorias nem atributos. */
    @Override
    public ContentTags tagsOf(CollectionGroupDocument group) {
        return new ContentTags(List.of(), group.events(), Map.of(), group.media());
    }

    @Override
    protected Parts loadChildren(String gameId, List<String> extIds) {
        return new Parts(
                children.load(COLLECTIONS, gameId, extIds, row -> Rows.string(row, "collection_ext_id")),
                children.load(MEMBERS, gameId, extIds, row -> Rows.reference(row, "target_kind", "target_ext_id")));
    }

    @Override
    protected void replaceChildren(String gameId, CollectionGroupDocument group) {
        children.replace(COLLECTIONS, gameId, group.extId(), group.collections().stream()
                .map(collection -> ChildRows.row("collection_ext_id", collection)).toList());
        children.replace(MEMBERS, gameId, group.extId(), group.members().stream()
                .map(member -> ChildRows.row("target_kind", member.kind(), "target_ext_id", member.extId())).toList());
    }

    @Override
    protected void deleteChildren(String gameId, String extId) {
        children.delete(COLLECTIONS, gameId, extId);
        children.delete(MEMBERS, gameId, extId);
    }

    /** collection é o código da coleção; member aceita "tipo:id" ou "id". */
    @Override
    protected Map<String, Filter> specificFilters() {
        return Map.of(
                "collection", childCode("collection_group_collection", "group_ext_id", "collection_ext_id"),
                "member", childReference("collection_group_member", "group_ext_id", null));
    }
}
