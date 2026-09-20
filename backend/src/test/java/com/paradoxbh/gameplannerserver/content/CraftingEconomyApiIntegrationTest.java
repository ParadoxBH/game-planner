package com.paradoxbh.gameplannerserver.content;

import static com.paradoxbh.gameplannerserver.query.QueryJson.and;
import static com.paradoxbh.gameplannerserver.query.QueryJson.or;
import static com.paradoxbh.gameplannerserver.query.QueryJson.rule;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;

import com.paradoxbh.gameplannerserver.support.ContentApiTest;

/**
 * Crafting e economia: receitas, lojas com categorias e itens, drops e requisitos de entidade.
 * Linhas-filhas posicionais (o mesmo alvo se repete), referências sem FK e as consultas inversas:
 * o que produz, consome, vende ou dropa um alvo.
 */
class CraftingEconomyApiIntegrationTest extends ContentApiTest {

    private static final String RECIPES = "/api/v1/games/{game}/recipes";
    private static final String RECIPE = RECIPES + "/{id}";
    private static final String ENTITIES = "/api/v1/games/{game}/entities";
    private static final String SHOPS = "/api/v1/games/{game}/shops";
    private static final String SHOP_CATEGORIES = "/api/v1/games/{game}/shop-categories";
    private static final String REFERENCES = "/api/v1/games/{game}/references";

    private static final String PEDRA_MANA_SLOT = "{ 'target': { 'kind': 'item', 'extId': 'pedra_mana' }, 'amount': 1 },";

    /** No estilo Outward: três slots com o mesmo item, um ingrediente que é categoria e um que não é gasto. */
    private static final String VERNIZ = """
            { 'extId': 'verniz', 'craftTimeSeconds': 30, 'stations': ['Alchemy'],
              'inputs': [
                { 'target': { 'kind': 'item', 'extId': 'pedra_mana' }, 'amount': 1 },
                { 'target': { 'kind': 'item', 'extId': 'pedra_mana' }, 'amount': 1 },
                { 'target': { 'kind': 'item', 'extId': 'pedra_mana' }, 'amount': 1 },
                { 'target': { 'kind': 'category', 'extId': 'vegetal' }, 'amount': 2 },
                { 'target': { 'kind': 'item', 'extId': 'dente_leao' }, 'amount': 1, 'notConsumed': true } ],
              'outputs': [ { 'target': { 'kind': 'item', 'extId': 'verniz_voltaico' }, 'amount': 1, 'level': 2 } ],
              'unlock': [
                { 'type': 'event', 'target': { 'kind': 'event', 'extId': 'gala' } },
                { 'type': 'quest', 'target': { 'kind': 'entity', 'extId': 'massimo' }, 'value': 'As aventuras' },
                { 'type': 'station_level', 'value': 1 } ] }
            """;

    /** Melhoria de equipamento: entra a espada no nível 1, sai a espada no nível 2 (V13). */
    private static final String MELHORAR_ESPADA = """
            { 'extId': 'melhorar_espada',
              'inputs': [
                { 'target': { 'kind': 'item', 'extId': 'espada' }, 'amount': 1, 'level': 1 },
                { 'target': { 'kind': 'item', 'extId': 'ferro' }, 'amount': 5, 'level': 2, 'levelOperator': 'min' } ],
              'outputs': [ { 'target': { 'kind': 'item', 'extId': 'espada' }, 'amount': 1, 'level': 2 } ] }
            """;

    @Test
    void requirementKeepsTheLevelAndDefaultsTheOperatorToExact() throws Exception {
        send(post(RECIPES, game), "editor", json(MELHORAR_ESPADA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inputs[0].level").value(1))
                .andExpect(jsonPath("$.inputs[0].levelOperator").value("exact"))
                .andExpect(jsonPath("$.inputs[1].level").value(2))
                .andExpect(jsonPath("$.inputs[1].levelOperator").value("min"))
                .andExpect(jsonPath("$.outputs[0].level").value(2));

        mvc.perform(get(RECIPE, game, "melhorar_espada"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inputs[0].levelOperator").value("exact"));
    }

    @Test
    void requirementWithoutLevelHasNoOperator() throws Exception {
        send(post(RECIPES, game), "editor", json("""
                { 'extId': 'simples',
                  'inputs': [ { 'target': { 'kind': 'item', 'extId': 'ferro' }, 'amount': 1 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'prego' }, 'amount': 1 } ] }
                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inputs[0].level").doesNotExist())
                .andExpect(jsonPath("$.inputs[0].levelOperator").doesNotExist());
    }

    @Test
    void requirementRejectsOperatorWithoutLevelAndUnknownOperator() throws Exception {
        send(post(RECIPES, game), "editor", json("""
                { 'extId': 'sem_nivel',
                  'inputs': [ { 'target': { 'kind': 'item', 'extId': 'ferro' }, 'amount': 1, 'levelOperator': 'min' } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'prego' }, 'amount': 1 } ] }
                """))
                .andExpect(status().isBadRequest());

        send(post(RECIPES, game), "editor", json("""
                { 'extId': 'operador_errado',
                  'inputs': [ { 'target': { 'kind': 'item', 'extId': 'ferro' }, 'amount': 1, 'level': 1,
                               'levelOperator': 'maior' } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'prego' }, 'amount': 1 } ] }
                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void entityRequirementKeepsTheLevel() throws Exception {
        send(post(ENTITIES, game), "editor", json("""
                { 'extId': 'veio_ferro', 'name': 'Veio de ferro',
                  'requirements': [ { 'target': { 'kind': 'item', 'extId': 'picareta' }, 'amount': 1,
                                      'notConsumed': true, 'level': 2, 'levelOperator': 'min' } ] }
                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requirements[0].level").value(2))
                .andExpect(jsonPath("$.requirements[0].levelOperator").value("min"));
    }

    @Test
    void recipeKeepsRepeatedSlotsInOrderAndRewritingItChangesNothing() throws Exception {
        send(post(RECIPES, game), "editor", json(VERNIZ))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").doesNotExist())
                .andExpect(jsonPath("$.inputs.length()").value(5))
                .andExpect(jsonPath("$.inputs[2].target.extId").value("pedra_mana"))
                .andExpect(jsonPath("$.inputs[3].target.kind").value("category"))
                .andExpect(jsonPath("$.inputs[0].notConsumed").value(false))
                .andExpect(jsonPath("$.inputs[4].notConsumed").value(true))
                .andExpect(jsonPath("$.outputs[0].level").value(2))
                .andExpect(jsonPath("$.unlock[1].value").value("As aventuras"))
                .andExpect(jsonPath("$.unlock[2].target").doesNotExist());

        send(put(RECIPE, game, "verniz"), "editor", json(VERNIZ))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.revision").value(1));

        // Tirar um slot é mudança: a lista é posicional, não um conjunto.
        send(put(RECIPE, game, "verniz"), "editor", json(VERNIZ.replaceFirst(Pattern.quote(PEDRA_MANA_SLOT), "")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.revision").value(2))
                .andExpect(jsonPath("$.inputs.length()").value(4));
    }

    @Test
    void recipesAreFoundByWhatTheyProduceConsumeAndWhereTheyAreMade() throws Exception {
        send(post(RECIPES, game), "editor", json(VERNIZ)).andExpect(status().isCreated());

        mvc.perform(query(RECIPES, and(rule("produces", "equal", "item:verniz_voltaico")), game)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(RECIPES, and(rule("produces", "equal", "verniz_voltaico")), game)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(RECIPES, and(rule("produces", "equal", "entity:verniz_voltaico")), game)).andExpect(jsonPath("$.total").value(0));
        mvc.perform(query(RECIPES, and(rule("consumes", "equal", "item:pedra_mana")), game)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(RECIPES, and(rule("station", "equal", "Alchemy")), game))
                .andExpect(jsonPath("$.content[0].extId").value("verniz"));
        mvc.perform(query(RECIPES, and(rule("station", "equal", "Cooking")), game)).andExpect(jsonPath("$.total").value(0));

        // O slot repetido conta três vezes na fila do que falta cadastrar.
        mvc.perform(get("/api/v1/games/{game}/pending-references", game))
                .andExpect(jsonPath("$.content[0].extId").value("pedra_mana"))
                .andExpect(jsonPath("$.content[0].referenceCount").value(3));

        // Sem nome, a receita aparece pelo código; cadastrado o produto, pelo nome dele.
        mvc.perform(get("/api/v1/games/{game}/search", game).param("q", "verniz").param("kind", "recipe"))
                .andExpect(jsonPath("$[0].name").value("verniz"));
        send(post("/api/v1/games/{game}/items", game), "editor",
                json("{ 'extId': 'verniz_voltaico', 'name': 'Verniz voltaico' }"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/games/{game}/search", game).param("q", "voltaico").param("kind", "recipe"))
                .andExpect(jsonPath("$[0].extId").value("verniz"))
                .andExpect(jsonPath("$[0].name").value("Verniz voltaico"));
        mvc.perform(query(RECIPES, or(rule("name", "contains", "voltaico"), rule("extId", "contains", "voltaico")), game))
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void entityDropsRepeatTheSameItemWithOwnChancesAndRequirementsMayBeKept() throws Exception {
        send(post(ENTITIES, game), "editor", json("""
                { 'extId': 'arvore', 'name': 'Arvore',
                  'requirements': [
                    { 'target': { 'kind': 'item', 'extId': 'energia' }, 'amount': 3 },
                    { 'target': { 'kind': 'item', 'extId': 'machado' }, 'amount': 1, 'notConsumed': true } ],
                  'drops': [
                    { 'target': { 'kind': 'item', 'extId': 'couro' }, 'chance': 1, 'amount': 1 },
                    { 'target': { 'kind': 'item', 'extId': 'couro' }, 'chance': 0.33, 'amount': 1, 'maxAmount': 3 } ] }
                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requirements[0].notConsumed").value(false))
                .andExpect(jsonPath("$.requirements[1].notConsumed").value(true))
                .andExpect(jsonPath("$.drops.length()").value(2))
                .andExpect(jsonPath("$.drops[1].chance").value(0.33))
                .andExpect(jsonPath("$.drops[1].maxAmount").value(3));

        mvc.perform(query(ENTITIES, and(rule("drops", "equal", "item:couro")), game)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(ENTITIES, and(rule("requires", "equal", "machado")), game)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(ENTITIES, and(rule("drops", "equal", "item:machado")), game)).andExpect(jsonPath("$.total").value(0));

        // O documento é inteiro: sem "drops", a entidade fica sem drops.
        send(put(ENTITIES + "/{id}", game, "arvore"), "editor", json("{ 'name': 'Arvore' }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.drops.length()").value(0))
                .andExpect(jsonPath("$.meta.revision").value(2));
    }

    @Test
    void rejectsRowsThatMakeNoSense() throws Exception {
        String item = "{ 'kind': 'item', 'extId': 'x' }";
        send(post(RECIPES, game), "editor",
                json("{ 'extId': 'r1', 'inputs': [ { 'target': %s, 'amount': 0 } ] }".formatted(item)))
                .andExpect(status().isBadRequest());
        send(post(RECIPES, game), "editor",
                json("{ 'extId': 'r2', 'outputs': [ { 'target': %s, 'amount': 1, 'chance': 1.5 } ] }".formatted(item)))
                .andExpect(status().isBadRequest());
        send(post(RECIPES, game), "editor", json("{ 'extId': 'r3', 'unlock': [ { 'type': 'quest' } ] }"))
                .andExpect(status().isBadRequest());
        send(post(ENTITIES, game), "editor",
                json("{ 'extId': 'e1', 'name': 'E', 'drops': [ { 'target': %s, 'amount': 5, 'maxAmount': 2 } ] }"
                        .formatted(item)))
                .andExpect(status().isBadRequest());
        send(post(ENTITIES, game), "editor", json("{ 'extId': 'e2', 'name': 'E', 'drops': [ { 'amount': 1 } ] }"))
                .andExpect(status().isBadRequest());
        send(post(SHOP_CATEGORIES, game), "editor",
                json("{ 'extId': 'c1', 'name': 'C', 'items': [ { 'target': %s, 'purchaseLimit': 0 } ] }".formatted(item)))
                .andExpect(status().isBadRequest());

        // Receita só tem ícone.
        send(post(RECIPES, game), "editor",
                json("{ 'extId': 'r4', 'media': [ { 'usage': 'screenshot', 'mediaId': '%s' } ] }".formatted(newMedia())))
                .andExpect(status().isBadRequest());
        send(post(RECIPES, game), "editor",
                json("{ 'extId': 'r5', 'media': [ { 'usage': 'icon', 'mediaId': '%s' } ] }".formatted(newMedia())))
                .andExpect(status().isCreated());
    }

    @Test
    void shopCategoryPointsToItsShopByCodeAndSellsTheSameItemInDifferentPacks() throws Exception {
        send(post(SHOP_CATEGORIES, game), "editor", json("""
                { 'extId': 'cash_amorita', 'name': 'Amorita', 'shop': 'loja_cash', 'resetType': 'weekly',
                  'events': ['gala'],
                  'items': [
                    { 'target': { 'kind': 'item', 'extId': 'amorita' }, 'quantity': 20, 'price': 2.50,
                      'currency': { 'kind': 'item', 'extId': 'rmt_br' } },
                    { 'target': { 'kind': 'item', 'extId': 'amorita' }, 'quantity': 60, 'price': 5.5,
                      'currency': { 'kind': 'item', 'extId': 'rmt_br' }, 'purchaseLimit': 1, 'resetType': 'unique' } ] }
                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].price").value(2.5))
                .andExpect(jsonPath("$.items[1].purchaseLimit").value(1))
                .andExpect(jsonPath("$.items[1].currency.extId").value("rmt_br"))
                .andExpect(jsonPath("$.events[0]").value("gala"));

        // A loja ainda não foi cadastrada: é pendência, e o 404 diz quem aponta para ela.
        mvc.perform(get(SHOPS + "/{id}", game, "loja_cash"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.referencedBy[0].kind").value("shop_category"))
                .andExpect(jsonPath("$.referencedBy[0].field").value("shop"));
        mvc.perform(get("/api/v1/games/{game}/pending-references", game).param("kind", "shop"))
                .andExpect(jsonPath("$.content[0].extId").value("loja_cash"));

        send(post(SHOPS, game), "editor",
                json("{ 'extId': 'loja_cash', 'name': 'Cash', 'npc': 'doris', 'resetType': 'daily' }"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.npc").value("doris"));

        mvc.perform(query(SHOP_CATEGORIES, and(rule("shop", "equal", "loja_cash")), game)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(SHOP_CATEGORIES, and(rule("sells", "equal", "item:amorita")), game)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(SHOP_CATEGORIES, and(rule("sells", "equal", "item:rmt_br")), game)).andExpect(jsonPath("$.total").value(0));
        mvc.perform(query(SHOPS, and(rule("npc", "equal", "doris")), game))
                .andExpect(jsonPath("$.content[0].extId").value("loja_cash"));
    }

    @Test
    void referencesListEveryUseOfATargetAcrossKinds() throws Exception {
        String madeira = "{ 'kind': 'item', 'extId': 'madeira' }";
        send(post(RECIPES, game), "editor", json("""
                { 'extId': 'tabua', 'inputs': [ { 'target': %s, 'amount': 2 }, { 'target': %s, 'amount': 2 } ] }
                """.formatted(madeira, madeira)))
                .andExpect(status().isCreated());
        send(post(ENTITIES, game), "editor", json("""
                { 'extId': 'arvore', 'name': 'Arvore', 'drops': [ { 'target': %s, 'chance': 1, 'amount': 1 } ] }
                """.formatted(madeira)))
                .andExpect(status().isCreated());
        send(post(SHOP_CATEGORIES, game), "editor", json("""
                { 'extId': 'madeireira', 'name': 'Madeira', 'items': [ { 'target': %s, 'price': 10 } ] }
                """.formatted(madeira)))
                .andExpect(status().isCreated());

        // Os dois slots da mesma receita contam como uma origem só.
        mvc.perform(get(REFERENCES, game).param("target", "item:madeira"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.content[0].kind").value("entity"))
                .andExpect(jsonPath("$.content[0].field").value("drops"))
                .andExpect(jsonPath("$.content[1].field").value("inputs"))
                .andExpect(jsonPath("$.content[2].field").value("items"));
        mvc.perform(get(REFERENCES, game).param("target", "item:madeira").param("field", "inputs"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.content[0].extId").value("tabua"));
        mvc.perform(get(REFERENCES, game).param("target", "category:madeira"))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void deletingARecipeTakesItsRowsAndRestoringBringsThemBack() throws Exception {
        send(post(RECIPES, game), "editor", json(VERNIZ)).andExpect(status().isCreated());

        mvc.perform(delete(RECIPE, game, "verniz").with(as("moderador"))).andExpect(status().isNoContent());
        Long rows = jdbc.sql("""
                SELECT (SELECT count(*) FROM recipe_input WHERE game_id = :game)
                     + (SELECT count(*) FROM recipe_output WHERE game_id = :game)
                     + (SELECT count(*) FROM recipe_station WHERE game_id = :game)
                     + (SELECT count(*) FROM recipe_unlock WHERE game_id = :game)
                """).param("game", game).query(Long.class).single();
        assertThat(rows).isZero();

        mvc.perform(post(RECIPE + "/revisions/{revision}/restore", game, "verniz", 1).with(as("moderador")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inputs.length()").value(5))
                .andExpect(jsonPath("$.stations[0]").value("Alchemy"))
                .andExpect(jsonPath("$.unlock[2].value").value("1"))
                .andExpect(jsonPath("$.meta.revision").value(3));
    }

    @Test
    void recipeListCanResolveReferencesAndStationsAreListedWithNames() throws Exception {
        send(post("/api/v1/games/{game}/items", game), "editor", json("{ 'extId': 'madeira', 'name': 'Madeira' }"))
                .andExpect(status().isCreated());
        send(post(ENTITIES, game), "editor", json("{ 'extId': 'bancada', 'name': 'Bancada' }"))
                .andExpect(status().isCreated());
        send(post(RECIPES, game), "editor", json("""
                { 'extId': 'tabua', 'stations': ['bancada', 'serraria'],
                  'inputs': [ { 'target': { 'kind': 'item', 'extId': 'madeira' }, 'amount': 2 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'tabua' }, 'amount': 4 } ] }
                """))
                .andExpect(status().isCreated());

        mvc.perform(list(RECIPES, game)).andExpect(jsonPath("$.references").doesNotExist());
        mvc.perform(list(RECIPES, game).param("references", "true"))
                .andExpect(jsonPath("$.references[?(@.extId == 'madeira')].name", hasItem("Madeira")))
                .andExpect(jsonPath("$.references[?(@.extId == 'tabua')].resolvedKind", hasItem(nullValue())));

        mvc.perform(get("/api/v1/games/{game}/recipe-stations", game))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].extId").value("bancada"))
                .andExpect(jsonPath("$[0].name").value("Bancada"))
                .andExpect(jsonPath("$[0].registered").value(true))
                .andExpect(jsonPath("$[1].extId").value("serraria"))
                .andExpect(jsonPath("$[1].registered").value(false))
                .andExpect(jsonPath("$[1].recipeCount").value(1));
    }
}
