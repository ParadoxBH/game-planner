package com.paradoxbh.gameplannerserver.content;

import static com.paradoxbh.gameplannerserver.query.QueryJson.and;
import static com.paradoxbh.gameplannerserver.query.QueryJson.rule;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.paradoxbh.gameplannerserver.support.ContentApiTest;

/** Coleções com grupos em mais de uma coleção, e códigos de resgate com validade e recompensas. */
class CollectionsCodesApiIntegrationTest extends ContentApiTest {

    private static final String COLLECTIONS = "/api/v1/games/{game}/collections";
    private static final String GROUPS = "/api/v1/games/{game}/collection-groups";
    private static final String CODES = "/api/v1/games/{game}/codes";

    @Test
    void groupBelongsToSeveralCollectionsAndMembersMixKinds() throws Exception {
        send(post(COLLECTIONS, game), "editor", json("{ 'extId': 'flower', 'name': 'Flores' }"))
                .andExpect(status().isCreated());

        String margaridas = """
                { 'extId': 'set_margarida', 'name': 'Margaridas', 'collections': ['flower', 'seed', 'flower'],
                  'members': [
                    { 'kind': 'item', 'extId': 'margarida_vermelha' },
                    { 'kind': 'entity', 'extId': 'abelha' },
                    { 'kind': 'item', 'extId': 'margarida_vermelha' } ] }
                """;
        send(post(GROUPS, game), "editor", json(margaridas))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.collections", contains("flower", "seed")))
                .andExpect(jsonPath("$.members.length()").value(2))
                .andExpect(jsonPath("$.members[1].kind").value("entity"));

        send(put(GROUPS + "/{id}", game, "set_margarida"), "editor", json(margaridas))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.revision").value(1));

        mvc.perform(query(GROUPS, and(rule("collection", "equal", "seed")), game)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(GROUPS, and(rule("member", "equal", "item:margarida_vermelha")), game)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(GROUPS, and(rule("member", "equal", "entity:margarida_vermelha")), game)).andExpect(jsonPath("$.total").value(0));
        mvc.perform(query(COLLECTIONS, and(rule("member", "equal", "abelha")), game))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.content[0].extId").value("flower"));

        // "seed" é citada pelo grupo e não existe.
        mvc.perform(get("/api/v1/games/{game}/pending-references", game).param("kind", "collection"))
                .andExpect(jsonPath("$.content[0].extId").value("seed"));

        send(post(GROUPS, game), "editor", json("{ 'extId': 'g2', 'name': 'G', 'members': [ { 'kind': 'item' } ] }"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void codeIsItsOwnIdAndActiveMeansNotExpired() throws Exception {
        code("SPRINGFEST2026", "'addedOn': '2026-02-01', 'expiresOn': '2999-12-31'");
        code("happy2026", "'addedOn': '2020-01-01', 'expiresOn': '2020-01-10'");
        code("heartopia10m", "'addedOn': '2026-03-01'");

        mvc.perform(get(CODES + "/{id}", game, "SPRINGFEST2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").doesNotExist())
                .andExpect(jsonPath("$.expiresOn").value("2999-12-31"))
                .andExpect(jsonPath("$.rewards[0].target.extId").value("estrela_desejavel"))
                .andExpect(jsonPath("$.rewards[1].amount").value(5));

        mvc.perform(query(CODES, and(rule("active", "equal", true)), game))
                .andExpect(jsonPath("$.content[*].extId", containsInAnyOrder("SPRINGFEST2026", "heartopia10m")));
        mvc.perform(query(CODES, and(rule("active", "equal", false)), game))
                .andExpect(jsonPath("$.content[*].extId", contains("happy2026")));
        mvc.perform(query(CODES, and(rule("active", "equal", "talvez")), game)).andExpect(status().isBadRequest());
        mvc.perform(list(CODES, game).param("sort", "-addedOn"))
                .andExpect(jsonPath("$.content[*].extId", contains("heartopia10m", "SPRINGFEST2026", "happy2026")));
        mvc.perform(query(CODES, and(rule("rewards", "equal", "item:kit_reparo")), game)).andExpect(jsonPath("$.total").value(3));

        // Sem nome, o código é exibido e buscado por ele mesmo.
        mvc.perform(get("/api/v1/games/{game}/search", game).param("q", "springfest"))
                .andExpect(jsonPath("$[0].name").value("SPRINGFEST2026"));

        send(post(CODES, game), "editor",
                json("{ 'extId': 'c1', 'addedOn': '2026-05-10', 'expiresOn': '2026-05-01' }"))
                .andExpect(status().isBadRequest());
        send(post(CODES, game), "editor", json("""
                { 'extId': 'c2', 'rewards': [ { 'target': { 'kind': 'item', 'extId': 'x' }, 'amount': 0 } ] }
                """))
                .andExpect(status().isBadRequest());
        send(post(CODES, game), "editor",
                json("{ 'extId': 'c3', 'media': [ { 'usage': 'icon', 'mediaId': '%s' } ] }".formatted(newMedia())))
                .andExpect(status().isBadRequest());
    }

    private void code(String code, String dates) throws Exception {
        send(post(CODES, game), "editor", json("""
                { 'extId': '%s', %s,
                  'rewards': [
                    { 'target': { 'kind': 'item', 'extId': 'estrela_desejavel' }, 'amount': 3 },
                    { 'target': { 'kind': 'item', 'extId': 'kit_reparo' }, 'amount': 5 } ] }
                """.formatted(code, dates)))
                .andExpect(status().isCreated());
    }
}
