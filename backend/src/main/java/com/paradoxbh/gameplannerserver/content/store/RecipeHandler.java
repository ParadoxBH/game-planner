package com.paradoxbh.gameplannerserver.content.store;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.RecipeDocument;
import com.paradoxbh.gameplannerserver.content.model.RecipeModifier;
import com.paradoxbh.gameplannerserver.content.model.RecipeOutput;
import com.paradoxbh.gameplannerserver.content.model.RecipeStation;
import com.paradoxbh.gameplannerserver.content.model.RecipeUnlock;
import com.paradoxbh.gameplannerserver.content.model.Requirement;
import com.paradoxbh.gameplannerserver.content.store.ChildRows.Table;
import com.paradoxbh.gameplannerserver.query.FieldType;
import com.paradoxbh.gameplannerserver.query.QueryField;
import com.paradoxbh.gameplannerserver.query.QueryField.Option;

@Component
public class RecipeHandler extends AbstractContentHandler<RecipeDocument, RecipeHandler.Parts> {

    private static final Table STATIONS = Table.of("recipe_station", "recipe_ext_id");
    private static final Table INPUTS = Table.of("recipe_input", "recipe_ext_id");
    private static final Table OUTPUTS = Table.of("recipe_output", "recipe_ext_id");
    private static final Table UNLOCK = Table.of("recipe_unlock", "recipe_ext_id");
    private static final Table MODIFIERS = Table.of("recipe_modifier", "recipe_ext_id");

    /**
     * Receita de melhoria: um produto sai num nível e o mesmo item entra como ingrediente num nível menor (a espada
     * nível 1 vira a nível 2), ou a mesma categoria entra e sai (curinga: no Valheim, o Altar Ancestral sobe mais um
     * nível qualquer item da categoria do ídolo). Derivado das linhas, sem coluna própria; não pega receita que
     * consome e produz o mesmo item sem nível (no Valheim, pôr a comida na bandeja).
     */
    private static final String UPGRADE = "EXISTS (SELECT 1 FROM recipe_output o JOIN recipe_input i"
            + " ON i.game_id = o.game_id AND i.recipe_ext_id = o.recipe_ext_id AND i.target_ext_id = o.target_ext_id"
            + " AND (i.target_kind IS NULL OR o.target_kind IS NULL OR i.target_kind = o.target_kind)"
            + " WHERE o.game_id = t.game_id AND o.recipe_ext_id = t.ext_id"
            + " AND ((o.level IS NOT NULL AND o.level > COALESCE(i.level, 0))"
            + " OR (o.target_kind = 'category' AND i.target_kind = 'category')))";

    /**
     * Melhoria curinga que vale para o item pedido: a categoria entra e sai da receita, e o item está nela. O item
     * mostra essas receitas junto das melhorias dele.
     */
    private static QueryField wildcardUpgradeOf() {
        return QueryField.has("wildcardUpgradeOf", "Melhora pela categoria", FieldType.CODE, "item", match ->
                "EXISTS (SELECT 1 FROM recipe_output o JOIN recipe_input i ON i.game_id = o.game_id"
                        + " AND i.recipe_ext_id = o.recipe_ext_id AND i.target_ext_id = o.target_ext_id"
                        + " AND i.target_kind = 'category'"
                        + " JOIN content_category c ON c.game_id = o.game_id AND c.category_ext_id = o.target_ext_id"
                        + " AND c.kind = 'item'"
                        + " WHERE o.game_id = t.game_id AND o.recipe_ext_id = t.ext_id AND o.target_kind = 'category'"
                        + " AND " + match.code("c.ext_id") + ")");
    }

    /** Linhas-filhas de uma página de receitas, por ext_id. */
    record Parts(Map<String, List<RecipeStation>> stations, Map<String, List<Requirement>> inputs,
                 Map<String, List<RecipeOutput>> outputs, Map<String, List<RecipeUnlock>> unlock,
                 Map<String, List<RecipeModifier>> modifiers) {
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
                parts.modifiers().getOrDefault(id, List.of()),
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
                children.load(STATIONS, gameId, extIds,
                        row -> new RecipeStation(Rows.string(row, "station_kind"), Rows.string(row, "station_ext_id"),
                                Rows.integer(row, "level"))),
                children.load(INPUTS, gameId, extIds, ChildMappers::requirement),
                children.load(OUTPUTS, gameId, extIds, RecipeHandler::output),
                children.load(UNLOCK, gameId, extIds, ChildMappers::unlock),
                children.load(MODIFIERS, gameId, extIds, RecipeHandler::modifier));
    }

    @Override
    protected void replaceChildren(String gameId, RecipeDocument recipe) {
        String id = recipe.extId();
        children.replace(STATIONS, gameId, id, recipe.stations().stream()
                .map(station -> ChildRows.row("station_kind", station.kind(), "station_ext_id", station.extId(),
                        "level", station.level()))
                .toList());
        children.replace(INPUTS, gameId, id, recipe.inputs().stream().map(ChildMappers::requirementRow).toList());
        children.replace(OUTPUTS, gameId, id, recipe.outputs().stream().map(RecipeHandler::outputRow).toList());
        children.replace(UNLOCK, gameId, id, recipe.unlock().stream().map(ChildMappers::unlockRow).toList());
        children.replace(MODIFIERS, gameId, id, recipe.modifiers().stream().map(RecipeHandler::modifierRow).toList());
    }

    @Override
    protected void deleteChildren(String gameId, String extId) {
        for (Table table : List.of(STATIONS, INPUTS, OUTPUTS, UNLOCK, MODIFIERS)) {
            children.delete(table, gameId, extId);
        }
    }

    /**
     * produces, consumes e modifies são "tipo:id" ou "id"; station é o código da bancada (entidade ou ferramenta);
     * type separa fabricação de melhoria. modifies só vê modificador com alvo explícito.
     */
    @Override
    protected List<QueryField> specificFields() {
        return List.of(
                QueryField.options("type", "Tipo", "CASE WHEN " + UPGRADE + " THEN 'upgrade' ELSE 'craft' END",
                        new Option("craft", "Fabricação"), new Option("upgrade", "Melhoria")),
                QueryField.column("craftTimeSeconds", "Tempo de preparo (s)", FieldType.NUMBER, "t.craft_time_seconds"),
                childReference("produces", "Produz", "recipe_output", "recipe_ext_id", null),
                childReference("consumes", "Consome", "recipe_input", "recipe_ext_id", null),
                childReference("modifies", "Modifica", "recipe_modifier", "recipe_ext_id", "x.target_ext_id IS NOT NULL"),
                wildcardUpgradeOf(),
                childCode("station", "Bancada", "entity", "recipe_station", "recipe_ext_id", "station_ext_id"));
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

    private static Map<String, Object> modifierRow(RecipeModifier modifier) {
        Object value = modifier.value();
        return ChildRows.row(
                "target_kind", modifier.target() == null ? null : modifier.target().kind(),
                "target_ext_id", modifier.target() == null ? null : modifier.target().extId(),
                "attribute_key", modifier.attribute(),
                "operation", modifier.operation(),
                "value_num", value instanceof BigDecimal number ? number : null,
                "value_text", value instanceof String text ? text : null,
                "value_bool", value instanceof Boolean bool ? bool : null);
    }

    private static RecipeModifier modifier(Map<String, Object> row) {
        Object value = Rows.decimal(row, "value_num");
        if (value == null) {
            value = Rows.string(row, "value_text");
        }
        if (value == null) {
            value = Rows.bool(row, "value_bool");
        }
        return new RecipeModifier(Rows.reference(row, "target_kind", "target_ext_id"), Rows.string(row, "attribute_key"),
                Rows.string(row, "operation"), value);
    }
}
