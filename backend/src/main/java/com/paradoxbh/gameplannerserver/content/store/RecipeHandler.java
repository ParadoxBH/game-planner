package com.paradoxbh.gameplannerserver.content.store;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.RecipeDocument;
import com.paradoxbh.gameplannerserver.content.model.RecipeOutput;
import com.paradoxbh.gameplannerserver.content.model.RecipeUnlock;
import com.paradoxbh.gameplannerserver.content.model.Requirement;
import com.paradoxbh.gameplannerserver.content.store.ChildRows.Table;

@Component
public class RecipeHandler extends AbstractContentHandler<RecipeDocument, RecipeHandler.Parts> {

    private static final Table STATIONS = Table.of("recipe_station", "recipe_ext_id");
    private static final Table INPUTS = Table.of("recipe_input", "recipe_ext_id");
    private static final Table OUTPUTS = Table.of("recipe_output", "recipe_ext_id");
    private static final Table UNLOCK = Table.of("recipe_unlock", "recipe_ext_id");

    /** Linhas-filhas de uma página de receitas, por ext_id. */
    record Parts(Map<String, List<String>> stations, Map<String, List<Requirement>> inputs,
                 Map<String, List<RecipeOutput>> outputs, Map<String, List<RecipeUnlock>> unlock) {
    }

    private final ChildRows children;

    public RecipeHandler(JdbcClient jdbc, ContentTagsRepository tags, ChildRows children) {
        super(jdbc, tags);
        this.children = children;
    }

    @Override
    public ContentKind kind() {
        return ContentKind.RECIPE;
    }

    @Override
    public Class<RecipeDocument> documentType() {
        return RecipeDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("craft_time_seconds");
    }

    @Override
    protected List<Object> specificValues(RecipeDocument recipe) {
        return Collections.singletonList(recipe.craftTimeSeconds());
    }

    @Override
    protected RecipeDocument map(Map<String, Object> row, ContentTags tags, Parts parts, ContentMeta meta) {
        String id = Rows.string(row, "ext_id");
        return new RecipeDocument(
                id,
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                Rows.integer(row, "craft_time_seconds"),
                parts.stations().getOrDefault(id, List.of()),
                parts.inputs().getOrDefault(id, List.of()),
                parts.outputs().getOrDefault(id, List.of()),
                parts.unlock().getOrDefault(id, List.of()),
                tags.events(),
                meta);
    }

    /** Receita tem eventos e ícone; não tem categorias nem atributos. */
    @Override
    public ContentTags tagsOf(RecipeDocument recipe) {
        return new ContentTags(List.of(), recipe.events(), Map.of(), recipe.media());
    }

    @Override
    protected Parts loadChildren(String gameId, List<String> extIds) {
        return new Parts(
                children.load(STATIONS, gameId, extIds, row -> Rows.string(row, "station_ext_id")),
                children.load(INPUTS, gameId, extIds, ChildMappers::requirement),
                children.load(OUTPUTS, gameId, extIds, RecipeHandler::output),
                children.load(UNLOCK, gameId, extIds, RecipeHandler::unlock));
    }

    @Override
    protected void replaceChildren(String gameId, RecipeDocument recipe) {
        String id = recipe.extId();
        children.replace(STATIONS, gameId, id,
                recipe.stations().stream().map(station -> ChildRows.row("station_ext_id", station)).toList());
        children.replace(INPUTS, gameId, id, recipe.inputs().stream().map(ChildMappers::requirementRow).toList());
        children.replace(OUTPUTS, gameId, id, recipe.outputs().stream().map(RecipeHandler::outputRow).toList());
        children.replace(UNLOCK, gameId, id, recipe.unlock().stream().map(RecipeHandler::unlockRow).toList());
    }

    @Override
    protected void deleteChildren(String gameId, String extId) {
        for (Table table : List.of(STATIONS, INPUTS, OUTPUTS, UNLOCK)) {
            children.delete(table, gameId, extId);
        }
    }

    /** produces e consumes aceitam "tipo:id" ou "id"; station, o código da bancada. */
    @Override
    protected Map<String, Filter> specificFilters() {
        return Map.of(
                "produces", childReference("recipe_output", "recipe_ext_id", null),
                "consumes", childReference("recipe_input", "recipe_ext_id", null),
                "station", childCode("recipe_station", "recipe_ext_id", "station_ext_id"));
    }

    @Override
    protected Map<String, String> specificSortColumns() {
        return Map.of("craftTimeSeconds", "t.craft_time_seconds");
    }

    /** Sem nome próprio, vale o nome de exibição de content_ref: o do primeiro produto cadastrado. */
    @Override
    protected String nameExpression() {
        return "(SELECT c.name FROM content_ref c WHERE c.game_id = t.game_id AND c.kind = 'recipe'"
                + " AND c.ext_id = t.ext_id)";
    }

    private static Map<String, Object> outputRow(RecipeOutput output) {
        return ChildRows.row(
                "target_kind", output.target().kind(),
                "target_ext_id", output.target().extId(),
                "amount", output.amount(),
                "chance", output.chance(),
                "level", output.level());
    }

    private static RecipeOutput output(Map<String, Object> row) {
        return new RecipeOutput(Rows.reference(row, "target_kind", "target_ext_id"), Rows.decimal(row, "amount"),
                Rows.decimal(row, "chance"), Rows.integer(row, "level"));
    }

    private static Map<String, Object> unlockRow(RecipeUnlock unlock) {
        return ChildRows.row(
                "unlock_type", unlock.type(),
                "target_kind", unlock.target() == null ? null : unlock.target().kind(),
                "target_ext_id", unlock.target() == null ? null : unlock.target().extId(),
                "value", unlock.value());
    }

    private static RecipeUnlock unlock(Map<String, Object> row) {
        return new RecipeUnlock(Rows.string(row, "unlock_type"), Rows.reference(row, "target_kind", "target_ext_id"),
                Rows.string(row, "value"));
    }
}
