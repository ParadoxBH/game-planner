package com.paradoxbh.gameplannerserver.content;

import static com.paradoxbh.gameplannerserver.query.QueryJson.and;
import static com.paradoxbh.gameplannerserver.query.QueryJson.rule;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItems;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.paradoxbh.gameplannerserver.support.ContentApiTest;

/**
 * Atalho: leva de um ponto a outro, no mesmo mapa ou entre mapas, de ida e volta ou só de ida, com
 * requisitos (itens) e desbloqueio (quest, chefe).
 */
class ShortcutApiIntegrationTest extends ContentApiTest {

    private static final String SHORTCUTS = "/api/v1/games/{game}/shortcuts";

    @Test
    void shortcutKeepsBothEndsRequirementsAndUnlock() throws Exception {
        String boat = """
                { 'extId': 'barco', 'name': 'Barco para a ilha',
                  'origin': { 'map': 'continente', 'position': 'POINT (10.50 20)' },
                  'destination': { 'map': 'ilha', 'position': 'POINT Z (1 2 3)' },
                  'requirements': [ { 'target': { 'kind': 'item', 'extId': 'passagem' }, 'amount': 1 },
                                    { 'target': { 'kind': 'item', 'extId': 'chave' }, 'amount': 1, 'notConsumed': true } ],
                  'unlock': [ { 'type': 'boss', 'target': { 'kind': 'entity', 'extId': 'eikthyr' } } ] }
                """;
        send(post(SHORTCUTS, game), "editor", json(boat))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.origin.position").value("POINT (10.5 20)"))
                .andExpect(jsonPath("$.destination.map").value("ilha"))
                .andExpect(jsonPath("$.destination.position").value("POINT Z(1 2 3)"))
                .andExpect(jsonPath("$.bidirectional").value(false))
                .andExpect(jsonPath("$.requirements[1].notConsumed").value(true))
                .andExpect(jsonPath("$.unlock[0].target.extId").value("eikthyr"));

        // O mesmo atalho escrito de outro jeito não é mudança.
        send(put(SHORTCUTS + "/{id}", game, "barco"), "editor", json(boat.replace("10.50", "10.5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.revision").value(1));

        mvc.perform(get("/api/v1/games/{game}/pending-references", game).param("kind", "map"))
                .andExpect(jsonPath("$.content[*].extId", hasItems("continente", "ilha")));
        mvc.perform(query(SHORTCUTS, and(rule("requires", "equal", "item:chave")), game))
                .andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(SHORTCUTS, and(rule("unlockTarget", "equal", "entity:eikthyr")), game))
                .andExpect(jsonPath("$.total").value(1));

        mvc.perform(delete(SHORTCUTS + "/{id}", game, "barco").with(as("moderador"))).andExpect(status().isNoContent());
        Long rows = jdbc.sql("""
                SELECT (SELECT count(*) FROM shortcut_requirement WHERE game_id = :game)
                     + (SELECT count(*) FROM shortcut_unlock WHERE game_id = :game)
                """).param("game", game).query(Long.class).single();
        assertThat(rows).isZero();

        mvc.perform(post(SHORTCUTS + "/{id}/revisions/{revision}/restore", game, "barco", 1).with(as("moderador")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requirements.length()").value(2))
                .andExpect(jsonPath("$.unlock.length()").value(1));
    }

    @Test
    void returnTripOnlyCountsWhenTheShortcutIsBidirectional() throws Exception {
        shortcut("ida", "'origin': { 'map': 'a', 'position': 'POINT (0 0)' },"
                + " 'destination': { 'map': 'b', 'position': 'POINT (5 5)' }");
        shortcut("ida-e-volta", "'origin': { 'map': 'a', 'position': 'POINT (1 1)' },"
                + " 'destination': { 'map': 'b', 'position': 'POINT (6 6)' }, 'bidirectional': true");
        shortcut("mesmo-mapa", "'origin': { 'map': 'a', 'position': 'POINT (2 2)' },"
                + " 'destination': { 'map': 'a', 'position': 'POINT (9 9)' }");

        mvc.perform(query(SHORTCUTS, and(rule("map", "equal", "b")), game))
                .andExpect(jsonPath("$.content[*].extId", containsInAnyOrder("ida", "ida-e-volta")));
        mvc.perform(query(SHORTCUTS, and(rule("departsFrom", "equal", "b")), game))
                .andExpect(jsonPath("$.content[*].extId", containsInAnyOrder("ida-e-volta")));
        mvc.perform(query(SHORTCUTS, and(rule("arrivesAt", "equal", "a")), game))
                .andExpect(jsonPath("$.content[*].extId", containsInAnyOrder("ida-e-volta", "mesmo-mapa")));
        mvc.perform(query(SHORTCUTS, and(rule("bidirectional", "equal", true)), game))
                .andExpect(jsonPath("$.total").value(1));
        // Sem nome, a busca encontra pelo código.
        mvc.perform(get("/api/v1/games/{game}/search", game).param("q", "volta").param("kind", "shortcut"))
                .andExpect(jsonPath("$[0].extId").value("ida-e-volta"));
    }

    @Test
    void shortcutNeedsTwoDifferentPlaces() throws Exception {
        send(post(SHORTCUTS, game), "editor", json("{ 'extId': 's1', 'origin': { 'map': 'a', 'position': 'POINT (0 0)' } }"))
                .andExpect(status().isBadRequest());
        send(post(SHORTCUTS, game), "editor", json("""
                { 'extId': 's2', 'origin': { 'map': 'a', 'position': 'POINT (0 0)' },
                  'destination': { 'position': 'POINT (1 1)' } }
                """))
                .andExpect(status().isBadRequest());
        send(post(SHORTCUTS, game), "editor", json("""
                { 'extId': 's3', 'origin': { 'map': 'a', 'position': 'POINT (0 0)' },
                  'destination': { 'map': 'a', 'position': 'POLYGON ((0 0, 1 0, 1 1, 0 0))' } }
                """))
                .andExpect(status().isBadRequest());
        send(post(SHORTCUTS, game), "editor", json("""
                { 'extId': 's4', 'origin': { 'map': 'a', 'position': 'POINT (0 0)' },
                  'destination': { 'map': 'a', 'position': 'POINT (0.0 0)' } }
                """))
                .andExpect(status().isBadRequest());
    }

    private void shortcut(String extId, String fields) throws Exception {
        send(post(SHORTCUTS, game), "editor", json("{ 'extId': '" + extId + "', " + fields + " }"))
                .andExpect(status().isCreated());
    }
}
