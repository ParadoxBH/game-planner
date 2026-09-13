package com.paradoxbh.gameplannerserver.content.store;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.Drop;
import com.paradoxbh.gameplannerserver.content.model.EntityDocument;
import com.paradoxbh.gameplannerserver.content.model.Requirement;
import com.paradoxbh.gameplannerserver.content.store.ChildRows.Table;

@Component
public class EntityHandler extends AbstractContentHandler<EntityDocument, EntityHandler.Parts> {

    private static final Table REQUIREMENTS = Table.of("entity_requirement", "entity_ext_id");

    /** A mesma tabela guarda os drops de ponto de spawn (Fase 4); aqui, só os de entidade. */
    private static final Table DROPS = new Table("drop_entry", "source_ext_id", Map.of("source_kind", "entity"));

    /** Requisitos e drops de uma página de entidades, por ext_id. */
    record Parts(Map<String, List<Requirement>> requirements, Map<String, List<Drop>> drops) {
    }

    private final ChildRows children;

    public EntityHandler(JdbcClient jdbc, ContentTagsRepository tags, ChildRows children) {
        super(jdbc, tags);
        this.children = children;
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
    protected EntityDocument map(Map<String, Object> row, ContentTags tags, Parts parts, ContentMeta meta) {
        String id = Rows.string(row, "ext_id");
        return new EntityDocument(
                id,
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
                parts.requirements().getOrDefault(id, List.of()),
                parts.drops().getOrDefault(id, List.of()),
                meta);
    }

    @Override
    public ContentTags tagsOf(EntityDocument entity) {
        return new ContentTags(entity.categories(), entity.events(), entity.attributes(), entity.media());
    }

    @Override
    protected Parts loadChildren(String gameId, List<String> extIds) {
        return new Parts(
                children.load(REQUIREMENTS, gameId, extIds, ChildMappers::requirement),
                children.load(DROPS, gameId, extIds, ChildMappers::drop));
    }

    @Override
    protected void replaceChildren(String gameId, EntityDocument entity) {
        children.replace(REQUIREMENTS, gameId, entity.extId(),
                entity.requirements().stream().map(ChildMappers::requirementRow).toList());
        children.replace(DROPS, gameId, entity.extId(), entity.drops().stream().map(ChildMappers::dropRow).toList());
    }

    @Override
    protected void deleteChildren(String gameId, String extId) {
        children.delete(REQUIREMENTS, gameId, extId);
        children.delete(DROPS, gameId, extId);
    }

    /** drops e requires aceitam "tipo:id" ou "id". */
    @Override
    protected Map<String, Filter> specificFilters() {
        return Map.of(
                "drops", childReference("drop_entry", "source_ext_id", "x.source_kind = 'entity'"),
                "requires", childReference("entity_requirement", "entity_ext_id", null));
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
