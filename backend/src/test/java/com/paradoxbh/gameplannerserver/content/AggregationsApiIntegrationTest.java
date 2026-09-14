package com.paradoxbh.gameplannerserver.content;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.paradoxbh.gameplannerserver.config.ApiCacheFilter;
import com.paradoxbh.gameplannerserver.support.ContentApiTest;

/** Agregações: detalhe de conteúdo numa chamada, árvore de crafting no servidor e cache por ETag. */
class AggregationsApiIntegrationTest extends ContentApiTest {

    private static final String DETAILS = "/api/v1/games/{game}/{resource}/{id}/details";
    private static final String TREE = "/api/v1/games/{game}/crafting-tree";
    private static final String PLAN = "/api/v1/games/{game}/crafting-plan";
    private static final String PROFITS = "/api/v1/games/{game}/crafting-profits";

    @Autowired
    ApiCacheFilter cacheFilter;

    @Test
    void itemDetailsGatherWhatProducesUsesDropsSellsAndRewardsIt() throws Exception {
        create("items", "{ 'extId': 'madeira', 'name': 'Madeira' }");
        create("recipes", """
                { 'extId': 'serrar', 'inputs': [ { 'target': { 'kind': 'item', 'extId': 'tronco' }, 'amount': 1 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'madeira' }, 'amount': 2 } ] }
                """);
        create("recipes", """
                { 'extId': 'tabua', 'inputs': [ { 'target': { 'kind': 'item', 'extId': 'madeira' }, 'amount': 2 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'tabua' }, 'amount': 4 } ] }
                """);
        create("entities", """
                { 'extId': 'arvore', 'name': 'Arvore',
                  'drops': [ { 'target': { 'kind': 'item', 'extId': 'madeira' }, 'chance': 1, 'amount': 3 } ] }
                """);
        create("spawn-points", """
                { 'extId': 'bau', 'position': 'POINT (1 1)',
                  'drops': [ { 'target': { 'kind': 'item', 'extId': 'madeira' }, 'amount': 1 } ] }
                """);
        create("shop-categories", """
                { 'extId': 'madeireira', 'name': 'Madeireira',
                  'items': [ { 'target': { 'kind': 'item', 'extId': 'madeira' }, 'price': 10 } ] }
                """);
        create("codes", "{ 'extId': 'MADEIRA10', 'rewards': [ { 'target': { 'kind': 'item', 'extId': 'madeira' }, 'amount': 10 } ] }");
        create("collection-groups", "{ 'extId': 'recursos', 'name': 'Recursos', 'members': [ { 'kind': 'item', 'extId': 'madeira' } ] }");
        create("items", "{ 'extId': 'madeira_nobre', 'name': 'Madeira nobre', 'variantOf': 'madeira', 'level': 2 }");

        mvc.perform(get(DETAILS, game, "items", "madeira"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kind").value("item"))
                .andExpect(jsonPath("$.document.name").value("Madeira"))
                .andExpect(jsonPath("$.related.producedBy.content[0].extId").value("serrar"))
                .andExpect(jsonPath("$.related.usedIn.content[0].extId").value("tabua"))
                .andExpect(jsonPath("$.related.droppedBy.total").value(1))
                .andExpect(jsonPath("$.related.dropPoints.total").value(1))
                .andExpect(jsonPath("$.related.soldIn.content[0].items[0].price").value(10))
                .andExpect(jsonPath("$.related.rewardOf.total").value(1))
                .andExpect(jsonPath("$.related.collectionGroups.total").value(1))
                .andExpect(jsonPath("$.related.requiredBy.total").value(0))
                .andExpect(jsonPath("$.related.variants.content[0].extId").value("madeira_nobre"))
                // Referências dos documentos ligados, já resolvidas: madeira cadastrada, tronco não.
                .andExpect(jsonPath("$.references[?(@.extId == 'madeira')].name", hasItem("Madeira")))
                .andExpect(jsonPath("$.references[?(@.extId == 'tronco')].resolvedKind", hasItem(nullValue())));

        mvc.perform(get(DETAILS, game, "items", "tronco"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.referencedBy[0].field").value("inputs"));
        mvc.perform(get(DETAILS, game, "rarities", "comum")).andExpect(status().isNotFound());
    }

    @Test
    void recipeDetailsListTheMembersOfCategoryIngredients() throws Exception {
        create("items", "{ 'extId': 'tomate', 'name': 'Tomate', 'categories': ['vegetal'] }");
        create("items", "{ 'extId': 'alface', 'name': 'Alface', 'categories': ['vegetal'] }");
        create("items", "{ 'extId': 'pedra', 'name': 'Pedra', 'categories': ['rocha'] }");
        create("recipes", """
                { 'extId': 'salada', 'inputs': [ { 'target': { 'kind': 'category', 'extId': 'vegetal' }, 'amount': 2 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'salada' }, 'amount': 1 } ] }
                """);

        mvc.perform(get(DETAILS, game, "recipes", "salada"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categoryMembers.vegetal[*].extId", containsInAnyOrder("tomate", "alface")))
                .andExpect(jsonPath("$.related.soldIn.total").value(0));
    }

    @Test
    void eventDetailsListEverythingInTheEventIncludingMapsWhereItIsTheWeather() throws Exception {
        create("events", "{ 'extId': 'rainy', 'name': 'Chuva', 'eventType': 'clima' }");
        create("items", "{ 'extId': 'guarda_chuva', 'name': 'Guarda-chuva', 'events': ['rainy'] }");
        create("spawn-points", "{ 'extId': 'poca', 'position': 'POINT (2 2)', 'events': ['rainy'] }");
        create("maps", "{ 'extId': 'main', 'name': 'Mapa', 'weathers': ['rainy'] }");
        create("categories", "{ 'extId': 'chuvosos', 'name': 'Chuvosos', 'events': ['rainy'] }");

        mvc.perform(get(DETAILS, game, "events", "rainy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.related.items.total").value(1))
                .andExpect(jsonPath("$.related.spawnPoints.total").value(1))
                .andExpect(jsonPath("$.related.mapsWithWeather.content[0].extId").value("main"))
                .andExpect(jsonPath("$.related.categories.total").value(1))
                .andExpect(jsonPath("$.related.recipes.total").value(0));
    }

    @Test
    void craftingTreeCraftsWholeBatchesAndKeepsWhatIsLeft() throws Exception {
        create("items", "{ 'extId': 'madeira', 'name': 'Madeira' }");
        createTabua();

        // 6 tábuas com lote de 4: 2 lotes, 8 tábuas, 4 madeiras e 2 tábuas sobrando. O serrote entra uma vez.
        mvc.perform(get(TREE, game).param("target", "item:tabua").param("amount", "6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.root.source").value("recipe"))
                .andExpect(jsonPath("$.root.recipe.batches").value(2))
                .andExpect(jsonPath("$.root.recipe.produced").value(8))
                .andExpect(jsonPath("$.root.leftover").value(2))
                .andExpect(jsonPath("$.root.recipe.craftTimeSeconds").value(20))
                .andExpect(jsonPath("$.root.children[0].name").value("Madeira"))
                .andExpect(jsonPath("$.root.children[0].amount").value(4))
                .andExpect(jsonPath("$.root.children[0].source").value("base"))
                .andExpect(jsonPath("$.root.children[1].notConsumed").value(true))
                .andExpect(jsonPath("$.root.children[1].amount").value(1))
                .andExpect(jsonPath("$.totals.baseResources.length()").value(1))
                .andExpect(jsonPath("$.totals.baseResources[0].amount").value(4))
                .andExpect(jsonPath("$.totals.tools[0].target.extId").value("serrote"))
                .andExpect(jsonPath("$.totals.leftovers.length()").value(1))
                .andExpect(jsonPath("$.totals.leftovers[0].target.extId").value("tabua"))
                .andExpect(jsonPath("$.totals.leftovers[0].amount").value(2))
                .andExpect(jsonPath("$.totals.recipes[0].batches").value(2))
                .andExpect(jsonPath("$.totals.stations[0].extId").value("bancada"))
                .andExpect(jsonPath("$.totals.craftTimeSeconds").value(20));
    }

    @Test
    void craftingTreeUsesLeftoversAndByproductsBeforeCraftingAgain() throws Exception {
        create("items", "{ 'extId': 'madeira', 'name': 'Madeira' }");
        createTabua();
        create("recipes", """
                { 'extId': 'fazer_cadeira',
                  'inputs': [ { 'target': { 'kind': 'item', 'extId': 'tabua' }, 'amount': 3 },
                              { 'target': { 'kind': 'item', 'extId': 'serrote' }, 'amount': 1, 'notConsumed': true } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'cadeira' }, 'amount': 1 } ] }
                """);
        create("recipes", """
                { 'extId': 'fazer_mesa',
                  'inputs': [ { 'target': { 'kind': 'item', 'extId': 'tabua' }, 'amount': 1 },
                              { 'target': { 'kind': 'item', 'extId': 'cadeira' }, 'amount': 1 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'mesa' }, 'amount': 1 } ] }
                """);

        // A mesa pede 1 tábua: sai 1 lote de 4 e sobram 3, que a cadeira usa. O serrote já está com o jogador.
        mvc.perform(get(TREE, game).param("target", "item:mesa"))
                .andExpect(jsonPath("$.root.children[0].recipe.batches").value(1))
                .andExpect(jsonPath("$.root.children[0].leftover").value(3))
                .andExpect(jsonPath("$.root.children[1].children[0].source").value("stock"))
                .andExpect(jsonPath("$.root.children[1].children[0].fromStock").value(3))
                .andExpect(jsonPath("$.root.children[1].children[1].source").value("stock"))
                .andExpect(jsonPath("$.totals.recipes[?(@.extId == 'fazer_tabua')].batches", hasItem(1)))
                .andExpect(jsonPath("$.totals.baseResources.length()").value(1))
                .andExpect(jsonPath("$.totals.baseResources[0].amount").value(2))
                .andExpect(jsonPath("$.totals.tools[0].amount").value(1))
                .andExpect(jsonPath("$.totals.leftovers.length()").value(0));

        // Limpar água salgada dá água e sal; o tempero usa o sal que sobrou em vez de buscar outro.
        create("recipes", """
                { 'extId': 'limpar_agua', 'inputs': [ { 'target': { 'kind': 'item', 'extId': 'agua_salgada' }, 'amount': 1 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'agua' }, 'amount': 1 },
                               { 'target': { 'kind': 'item', 'extId': 'sal' }, 'amount': 1 } ] }
                """);
        create("recipes", """
                { 'extId': 'temperar',
                  'inputs': [ { 'target': { 'kind': 'item', 'extId': 'agua' }, 'amount': 1 },
                              { 'target': { 'kind': 'item', 'extId': 'sal' }, 'amount': 1 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'tempero' }, 'amount': 1 } ] }
                """);
        mvc.perform(get(TREE, game).param("target", "item:tempero"))
                .andExpect(jsonPath("$.root.children[0].source").value("recipe"))
                .andExpect(jsonPath("$.root.children[1].source").value("stock"))
                .andExpect(jsonPath("$.totals.baseResources[0].target.extId").value("agua_salgada"))
                .andExpect(jsonPath("$.totals.leftovers.length()").value(0));
    }

    @Test
    void craftingTreeBuysWithCurrencyThatExpandsAndCraftUnlessToldToBuy() throws Exception {
        // Prego: pacote de 10 por 3 estrelas. Estrela: 5 moedas cada. Moeda: recurso base.
        create("shop-categories", """
                { 'extId': 'loja', 'name': 'Loja', 'items': [
                    { 'target': { 'kind': 'item', 'extId': 'prego' }, 'quantity': 10, 'price': 3,
                      'currency': { 'kind': 'item', 'extId': 'estrela' } },
                    { 'target': { 'kind': 'item', 'extId': 'estrela' }, 'price': 5,
                      'currency': { 'kind': 'item', 'extId': 'moeda' } } ] }
                """);

        mvc.perform(get(TREE, game).param("target", "item:prego").param("amount", "15"))
                .andExpect(jsonPath("$.root.source").value("shop"))
                .andExpect(jsonPath("$.root.purchase.packs").value(2))
                .andExpect(jsonPath("$.root.purchase.cost").value(6))
                .andExpect(jsonPath("$.root.children[0].target.extId").value("estrela"))
                .andExpect(jsonPath("$.root.children[0].amount").value(6))
                .andExpect(jsonPath("$.root.children[0].children[0].target.extId").value("moeda"))
                .andExpect(jsonPath("$.root.children[0].children[0].amount").value(30))
                .andExpect(jsonPath("$.totals.baseResources[0].target.extId").value("moeda"))
                .andExpect(jsonPath("$.totals.baseResources[0].amount").value(30))
                .andExpect(jsonPath("$.totals.purchases.length()").value(2))
                // 2 pacotes de 10 para 15 pregos: sobram 5.
                .andExpect(jsonPath("$.root.leftover").value(5))
                .andExpect(jsonPath("$.totals.leftovers[0].target.extId").value("prego"))
                .andExpect(jsonPath("$.totals.leftovers[0].amount").value(5));

        create("recipes", """
                { 'extId': 'fazer_prego', 'inputs': [ { 'target': { 'kind': 'item', 'extId': 'ferro' }, 'amount': 1 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'prego' }, 'amount': 5 } ] }
                """);
        mvc.perform(get(TREE, game).param("target", "item:prego").param("amount", "15"))
                .andExpect(jsonPath("$.root.source").value("recipe"))
                .andExpect(jsonPath("$.root.buyable").value(true))
                .andExpect(jsonPath("$.root.alternatives[0]").value("fazer_prego"))
                .andExpect(jsonPath("$.root.children[0].amount").value(3));
        mvc.perform(get(TREE, game).param("target", "item:prego").param("amount", "15").param("choices", "item:prego=buy"))
                .andExpect(jsonPath("$.root.source").value("shop"));
        mvc.perform(get(TREE, game).param("target", "item:prego").param("choices", "item:prego=outra_receita"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void craftingTreeLeavesCategoryOpenUntilChosenAndStopsAtCycles() throws Exception {
        create("items", "{ 'extId': 'tomate', 'name': 'Tomate', 'categories': ['vegetal'] }");
        create("items", "{ 'extId': 'alface', 'name': 'Alface', 'categories': ['vegetal'] }");
        create("recipes", """
                { 'extId': 'fazer_salada', 'inputs': [ { 'target': { 'kind': 'category', 'extId': 'vegetal' }, 'amount': 2 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'salada' }, 'amount': 1 } ] }
                """);

        mvc.perform(get(TREE, game).param("target", "item:salada"))
                .andExpect(jsonPath("$.root.children[0].source").value("category"))
                .andExpect(jsonPath("$.root.children[0].options.length()").value(2))
                .andExpect(jsonPath("$.totals.openCategories[0].target.extId").value("vegetal"));
        mvc.perform(get(TREE, game).param("target", "item:salada").param("choices", "category:vegetal=item:tomate"))
                .andExpect(jsonPath("$.root.children[0].target.extId").value("tomate"))
                .andExpect(jsonPath("$.root.children[0].category").value("vegetal"))
                .andExpect(jsonPath("$.root.children[0].source").value("base"))
                .andExpect(jsonPath("$.totals.openCategories.length()").value(0));

        create("recipes", """
                { 'extId': 'fazer_a', 'inputs': [ { 'target': { 'kind': 'item', 'extId': 'b' }, 'amount': 1 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'a' }, 'amount': 1 } ] }
                """);
        create("recipes", """
                { 'extId': 'fazer_b', 'inputs': [ { 'target': { 'kind': 'item', 'extId': 'a' }, 'amount': 1 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'b' }, 'amount': 1 } ] }
                """);
        mvc.perform(get(TREE, game).param("target", "item:a"))
                .andExpect(jsonPath("$.root.children[0].target.extId").value("b"))
                .andExpect(jsonPath("$.root.children[0].children[0].source").value("cycle"))
                .andExpect(jsonPath("$.totals.cycles[0].extId").value("a"));

        mvc.perform(get(TREE, game).param("target", "item:a").param("amount", "0")).andExpect(status().isBadRequest());
    }

    @Test
    void craftingPlanSharesLeftoversBetweenTargetsAndSumsCostAndRevenue() throws Exception {
        create("items", "{ 'extId': 'madeira', 'name': 'Madeira', 'baseBuyPrice': 5 }");
        create("items", "{ 'extId': 'tabua', 'name': 'Tabua', 'baseSellPrice': 4 }");
        createTabua();
        create("recipes", """
                { 'extId': 'fazer_banco', 'inputs': [ { 'target': { 'kind': 'item', 'extId': 'tabua' }, 'amount': 2 } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'banco' }, 'amount': 1 } ] }
                """);

        // 2 tábuas e 1 banco: um lote de 4 tábuas serve aos dois, e o banco usa as 2 que sobraram.
        mvc.perform(get(PLAN, game).param("target", "item:tabua", "item:banco").param("amount", "2", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roots.length()").value(2))
                .andExpect(jsonPath("$.roots[0].recipe.batches").value(1))
                .andExpect(jsonPath("$.roots[1].children[0].source").value("stock"))
                .andExpect(jsonPath("$.totals.recipes[?(@.extId == 'fazer_tabua')].batches", hasItem(1)))
                .andExpect(jsonPath("$.totals.costs[0].currency").doesNotExist())
                .andExpect(jsonPath("$.totals.costs[0].amount").value(10))
                .andExpect(jsonPath("$.revenue[0].amount").value(8));

        mvc.perform(get(PLAN, game).param("target", "item:tabua").param("amount", "1", "2"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void craftingProfitsCompareCostAndSaleOfOneBatchInTheSameCurrency() throws Exception {
        create("items", "{ 'extId': 'madeira', 'name': 'Madeira', 'baseBuyPrice': 5 }");
        create("items", "{ 'extId': 'tabua', 'name': 'Tabua', 'baseSellPrice': 4 }");
        createTabua();
        create("shop-categories", """
                { 'extId': 'loja', 'name': 'Loja', 'items': [
                    { 'target': { 'kind': 'item', 'extId': 'prego' }, 'quantity': 10, 'price': 3,
                      'currency': { 'kind': 'item', 'extId': 'estrela' } } ] }
                """);

        // Lote de 4 tábuas custa 2 madeiras (10): 2,5 por tábua, vendida a 4. O lote leva 10 s: 1,5 × 4 × 360 por hora.
        mvc.perform(get(PROFITS, game))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.content[0].target.extId").value("tabua"))
                .andExpect(jsonPath("$.content[0].produced").value(4))
                .andExpect(jsonPath("$.content[0].unitCost").value(2.5))
                .andExpect(jsonPath("$.content[0].profit").value(1.5))
                .andExpect(jsonPath("$.content[0].profitPerHour").value(2160))
                .andExpect(jsonPath("$.content[0].stations[0].extId").value("bancada"))
                // Pacote de 10 pregos por 3 estrelas, sem preço de venda: custo na estrela, sem lucro.
                .andExpect(jsonPath("$.content[1].target.extId").value("prego"))
                .andExpect(jsonPath("$.content[1].currency.extId").value("estrela"))
                .andExpect(jsonPath("$.content[1].unitCost").value(0.3))
                .andExpect(jsonPath("$.content[1].profit").doesNotExist());

        mvc.perform(get(PROFITS, game).param("timed", "true")).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get(PROFITS, game).param("search", "preg"))
                .andExpect(jsonPath("$.content[0].target.extId").value("prego"));
        mvc.perform(get(PROFITS, game).param("sort", "lucro")).andExpect(status().isBadRequest());
    }

    @Test
    void readsCarryEtagAndAnswerNotModifiedUntilSomethingChanges() throws Exception {
        MockMvc cached = MockMvcBuilders.webAppContextSetup(context).addFilters(cacheFilter).apply(springSecurity()).build();
        create("items", "{ 'extId': 'madeira', 'name': 'Madeira' }");
        String item = "/api/v1/games/" + game + "/items/madeira";

        String etag = cached.perform(get(item))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-cache"))
                .andExpect(header().exists("ETag"))
                .andReturn().getResponse().getHeader("ETag");

        cached.perform(get(item).header("If-None-Match", etag)).andExpect(status().isNotModified());

        send(put(item), "editor", json("{ 'name': 'Madeira de lei' }")).andExpect(status().isOk());
        cached.perform(get(item).header("If-None-Match", etag)).andExpect(status().isOk());
    }

    /** Lote de 4 tábuas com 2 madeiras, na bancada, com serrote que não é gasto. */
    private void createTabua() throws Exception {
        create("recipes", """
                { 'extId': 'fazer_tabua', 'craftTimeSeconds': 10, 'stations': ['bancada'],
                  'inputs': [
                    { 'target': { 'kind': 'item', 'extId': 'madeira' }, 'amount': 2 },
                    { 'target': { 'kind': 'item', 'extId': 'serrote' }, 'amount': 1, 'notConsumed': true } ],
                  'outputs': [ { 'target': { 'kind': 'item', 'extId': 'tabua' }, 'amount': 4 } ] }
                """);
    }

    private void create(String resource, String body) throws Exception {
        send(post("/api/v1/games/{game}/" + resource, game), "editor", json(body)).andExpect(status().isCreated());
    }
}
