package com.paradoxbh.gameplannerserver.content.store;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.Geometries;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.RecipeUnlock;
import com.paradoxbh.gameplannerserver.content.model.Requirement;
import com.paradoxbh.gameplannerserver.content.model.ShortcutDocument;
import com.paradoxbh.gameplannerserver.content.model.ShortcutDocument.End;
import com.paradoxbh.gameplannerserver.content.store.ChildRows.Table;
import com.paradoxbh.gameplannerserver.query.FieldType;
import com.paradoxbh.gameplannerserver.query.QueryField;

@Component
public class ShortcutHandler extends AbstractContentHandler<ShortcutDocument, ShortcutHandler.Parts> {

    private static final Table REQUIREMENTS = Table.of("shortcut_requirement", "shortcut_ext_id");

    private static final Table UNLOCK = Table.of("shortcut_unlock", "shortcut_ext_id");

    private static final List<String> POSITIONS = List.of("origin_position", "destination_position");

    /** Requisitos e desbloqueios de uma página de atalhos, por ext_id. */
    record Parts(Map<String, List<Requirement>> requirements, Map<String, List<RecipeUnlock>> unlock) {
    }

    private final ChildRows children;

    public ShortcutHandler(JdbcClient jdbc, ContentTagsRepository tags, ChildRows children) {
        super(jdbc, tags);
        this.children = children;
    }

    @Override
    public ContentKind kind() {
        return ContentKind.SHORTCUT;
    }

    @Override
    public Class<ShortcutDocument> documentType() {
        return ShortcutDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("origin_map_ext_id", "origin_position", "destination_map_ext_id", "destination_position",
                "bidirectional");
    }

    @Override
    protected List<Object> specificValues(ShortcutDocument shortcut) {
        return Arrays.asList(shortcut.origin().map(), Geometries.toWkb(shortcut.origin().position()),
                shortcut.destination().map(), Geometries.toWkb(shortcut.destination().position()),
                shortcut.bidirectional());
    }

    @Override
    protected String writeValue(String column, String param) {
        return POSITIONS.contains(column) ? "ST_GeomFromEWKB(" + param + ")" : param;
    }

    @Override
    protected String readValue(String column) {
        return POSITIONS.contains(column) ? "ST_AsEWKB(t." + column + ") AS " + column : super.readValue(column);
    }

    @Override
    protected ShortcutDocument map(Map<String, Object> row, ContentTags tags, Parts parts, ContentMeta meta) {
        String id = Rows.string(row, "ext_id");
        return new ShortcutDocument(
                id,
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                new End(Rows.string(row, "origin_map_ext_id"), Geometries.fromWkb(row.get("origin_position"))),
                new End(Rows.string(row, "destination_map_ext_id"),
                        Geometries.fromWkb(row.get("destination_position"))),
                Rows.bool(row, "bidirectional"),
                parts.requirements().getOrDefault(id, List.of()),
                parts.unlock().getOrDefault(id, List.of()),
                tags.events(),
                meta);
    }

    /** Atalho tem eventos (o barco do festival) e imagens; não tem categorias nem atributos. */
    @Override
    public ContentTags tagsOf(ShortcutDocument shortcut) {
        return new ContentTags(List.of(), shortcut.events(), Map.of(), shortcut.media());
    }

    @Override
    protected Parts loadChildren(String gameId, List<String> extIds) {
        return new Parts(
                children.load(REQUIREMENTS, gameId, extIds, ChildMappers::requirement),
                children.load(UNLOCK, gameId, extIds, ChildMappers::unlock));
    }

    @Override
    protected void replaceChildren(String gameId, ShortcutDocument shortcut) {
        children.replace(REQUIREMENTS, gameId, shortcut.extId(),
                shortcut.requirements().stream().map(ChildMappers::requirementRow).toList());
        children.replace(UNLOCK, gameId, shortcut.extId(),
                shortcut.unlock().stream().map(ChildMappers::unlockRow).toList());
    }

    @Override
    protected void deleteChildren(String gameId, String extId) {
        children.delete(REQUIREMENTS, gameId, extId);
        children.delete(UNLOCK, gameId, extId);
    }

    /**
     * map é o mapa de qualquer das pontas; departsFrom, o mapa de onde se pega o atalho (a origem, e
     * também o destino quando é de ida e volta); arrivesAt, o mapa aonde ele leva (o destino, e também a
     * origem quando é de ida e volta). requires e unlockTarget são "tipo:id" ou "id"; unlock é o tipo do
     * desbloqueio.
     */
    @Override
    protected List<QueryField> specificFields() {
        String origin = "t.origin_map_ext_id";
        String destination = "t.destination_map_ext_id";
        return List.of(
                QueryField.has("map", "Mapa", FieldType.CODE, "map",
                        match -> "(" + match.code(origin) + " OR " + match.code(destination) + ")"),
                QueryField.code("originMap", "Mapa de origem", "map", origin),
                QueryField.code("destinationMap", "Mapa de destino", "map", destination),
                QueryField.has("departsFrom", "Sai de", FieldType.CODE, "map",
                        match -> "(" + match.code(origin) + " OR (t.bidirectional AND " + match.code(destination)
                                + "))"),
                QueryField.has("arrivesAt", "Chega em", FieldType.CODE, "map",
                        match -> "(" + match.code(destination) + " OR (t.bidirectional AND " + match.code(origin)
                                + "))"),
                QueryField.column("bidirectional", "Ida e volta", FieldType.BOOLEAN, "t.bidirectional"),
                childReference("requires", "Requer", "shortcut_requirement", "shortcut_ext_id", null),
                childCode("unlock", "Desbloqueio", null, "shortcut_unlock", "shortcut_ext_id", "unlock_type"),
                childReference("unlockTarget", "Alvo do desbloqueio", "shortcut_unlock", "shortcut_ext_id",
                        "x.target_ext_id IS NOT NULL"));
    }

    /** Sem nome próprio, vale o nome de exibição de content_ref: o código. */
    @Override
    protected String nameExpression() {
        return "coalesce(t.name, t.ext_id)";
    }
}
