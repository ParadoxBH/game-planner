package com.paradoxbh.gameplannerserver.content;

import static com.paradoxbh.gameplannerserver.query.QueryJson.and;
import static com.paradoxbh.gameplannerserver.query.QueryJson.rule;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.paradoxbh.gameplannerserver.support.ContentApiTest;

/** Busca sem diferença de maiúscula e de acento (search_fold, V25), na busca geral e nos filtros de texto. */
class SearchFoldIntegrationTest extends ContentApiTest {

    private static final String ITEMS = "/api/v1/games/{game}/items";
    private static final String ITEM = ITEMS + "/{id}";

    @BeforeEach
    void items() throws Exception {
        for (String[] item : new String[][] {
                { "pocao_vida", "Poção de Vida" },
                { "espada_longa", "Espada Longa" },
                { "cafe", "Café Forte" } }) {
            send(put(ITEM, game, item[0]), "editor", json("{ 'name': '%s' }".formatted(item[1])))
                    .andExpect(status().isCreated());
        }
    }

    @Test
    void searchIgnoresCaseAndAccents() throws Exception {
        mvc.perform(get("/api/v1/games/{game}/search?q=pocao", game))
                .andExpect(jsonPath("$[*].extId", contains("pocao_vida")));
        mvc.perform(get("/api/v1/games/{game}/search?q=ESPADA", game))
                .andExpect(jsonPath("$[*].extId", contains("espada_longa")));
        // Acento no termo e não no texto também casa: o código "cafe" e o nome "Café".
        mvc.perform(get("/api/v1/games/{game}/search?q=CAFÉ", game))
                .andExpect(jsonPath("$[*].extId", contains("cafe")));
    }

    @Test
    void textFiltersIgnoreCaseAndAccents() throws Exception {
        mvc.perform(query(ITEMS, and(rule("name", "contains", "POCAO")), game))
                .andExpect(jsonPath("$.content[*].extId", contains("pocao_vida")));
        mvc.perform(query(ITEMS, and(rule("name", "begins_with", "espáda")), game))
                .andExpect(jsonPath("$.content[*].extId", contains("espada_longa")));
        mvc.perform(query(ITEMS, and(rule("name", "ends_with", "FORTE")), game))
                .andExpect(jsonPath("$.content[*].extId", contains("cafe")));
        mvc.perform(query(ITEMS, and(rule("name", "not_contains", "poção")), game).param("sort", "name"))
                .andExpect(jsonPath("$.content[*].extId", contains("cafe", "espada_longa")));
    }
}
