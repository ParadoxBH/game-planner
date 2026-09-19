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

import java.util.List;

import org.junit.jupiter.api.Test;

import com.paradoxbh.gameplannerserver.support.ContentApiTest;

/**
 * Mundo: mapas com sua exibição, locais com área e pontos de spawn com posição em WKT. Consultas
 * espaciais (bbox, ponto dentro da área) e os marcadores compactos para desenhar um mapa.
 */
class WorldApiIntegrationTest extends ContentApiTest {

    private static final String MAPS = "/api/v1/games/{game}/maps";
    private static final String LOCATIONS = "/api/v1/games/{game}/locations";
    private static final String SPAWN_POINTS = "/api/v1/games/{game}/spawn-points";
    private static final String MARKERS = "/api/v1/games/{game}/maps/{map}/spawn-points";

    @Test
    void mapKeepsItsDisplaySettingsAndWeathersAreEvents() throws Exception {
        String main = """
                { 'extId': 'main', 'name': 'Mapa Global', 'mapType': 'tile', 'urlPattern': '/map/{z}/{x}/{y}.png',
                  'bounds': { 'minX': -790.57, 'minY': -790.57, 'maxX': 790.57, 'maxY': 790.570 },
                  'minZoom': 2, 'maxZoom': 4,
                  'tiles': { 'z': 5, 'minX': 10, 'minY': 12, 'maxX': 20, 'maxY': 22, 'minZoom': 1, 'maxZoom': 6 },
                  'rotate': 1, 'defaultView': 'map', 'availableViews': ['map', 'dashboard'],
                  'defaultFilters': { 'types': ['spawn'], 'categories': ['npc'] },
                  'weathers': ['rainbow', 'rainy'] }
                """;
        send(post(MAPS, game), "editor", json(main))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bounds.maxY").value(790.57))
                .andExpect(jsonPath("$.tiles.z").value(5))
                .andExpect(jsonPath("$.tiles.maxZoom").value(6))
                .andExpect(jsonPath("$.availableViews.length()").value(2))
                .andExpect(jsonPath("$.defaultFilters.categories[0]").value("npc"))
                .andExpect(jsonPath("$.defaultFilters.entities.length()").value(0))
                .andExpect(jsonPath("$.weathers[1]").value("rainy"));

        send(put(MAPS + "/{id}", game, "main"), "editor", json(main))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.revision").value(1));

        mvc.perform(get("/api/v1/games/{game}/pending-references", game).param("kind", "event"))
                .andExpect(jsonPath("$.content[*].extId", hasItems("rainbow", "rainy")));

        send(post(MAPS, game), "editor", json("{ 'extId': 'm1', 'name': 'M', 'mapType': 'globo' }"))
                .andExpect(status().isBadRequest());
        send(post(MAPS, game), "editor", json("{ 'extId': 'm2', 'name': 'M', 'rotate': 4 }"))
                .andExpect(status().isBadRequest());
        send(post(MAPS, game), "editor",
                json("{ 'extId': 'm3', 'name': 'M', 'bounds': { 'minX': 10, 'minY': 0, 'maxX': 0, 'maxY': 10 } }"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void spawnPointKeepsHeightWritesCanonicalWktAndOwnsItsDrops() throws Exception {
        String chest = """
                { 'extId': 'bau-1', 'map': 'Caldera', 'position': '%s', 'respawnMode': 'once',
                  'occupants': [ { 'target': { 'kind': 'entity', 'extId': 'bau' } } ],
                  'drops': [ { 'target': { 'kind': 'item', 'extId': 'ouro' }, 'chance': 0.06349207, 'amount': 1,
                               'maxAmount': 3 } ] }
                """;
        send(post(SPAWN_POINTS, game), "editor", json(chest.formatted("POINT Z (1147.01 1185.50 37.39)")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").doesNotExist())
                .andExpect(jsonPath("$.position").value("POINT Z(1147.01 1185.5 37.39)"))
                .andExpect(jsonPath("$.drops[0].chance").value(0.06349207));

        // O mesmo ponto escrito de outro jeito não é mudança.
        send(put(SPAWN_POINTS + "/{id}", game, "bau-1"), "editor", json(chest.formatted("POINT Z(1147.010 1185.5 37.39)")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.revision").value(1));

        mvc.perform(query(SPAWN_POINTS, and(rule("drops", "equal", "item:ouro")), game)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(SPAWN_POINTS, and(rule("occupant", "equal", "entity:bau")), game)).andExpect(jsonPath("$.total").value(1));
        // Drops de ponto não se misturam com drops de entidade, que ficam na mesma tabela.
        mvc.perform(query("/api/v1/games/{game}/entities", and(rule("drops", "equal", "item:ouro")), game))
                .andExpect(jsonPath("$.total").value(0));

        // Sem nome, o ponto é exibido e buscado pelo nome do ocupante.
        send(post("/api/v1/games/{game}/entities", game), "editor", json("{ 'extId': 'bau', 'name': 'Bau antigo' }"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/games/{game}/search", game).param("q", "antigo").param("kind", "spawn_point"))
                .andExpect(jsonPath("$[0].extId").value("bau-1"));

        mvc.perform(delete(SPAWN_POINTS + "/{id}", game, "bau-1").with(as("moderador"))).andExpect(status().isNoContent());
        Long rows = jdbc.sql("""
                SELECT (SELECT count(*) FROM spawn_occupant WHERE game_id = :game)
                     + (SELECT count(*) FROM drop_entry WHERE game_id = :game)
                """).param("game", game).query(Long.class).single();
        assertThat(rows).isZero();

        mvc.perform(post(SPAWN_POINTS + "/{id}/revisions/{revision}/restore", game, "bau-1", 1).with(as("moderador")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.position").value("POINT Z(1147.01 1185.5 37.39)"))
                .andExpect(jsonPath("$.occupants.length()").value(1))
                .andExpect(jsonPath("$.drops.length()").value(1));
    }

    @Test
    void locationOwnsPointsInsideItsAreaAndPointsLinkedWithoutPosition() throws Exception {
        send(post(LOCATIONS, game), "editor", json("""
                { 'extId': 'cais', 'name': 'Cais', 'map': 'main',
                  'area': 'POLYGON ((0 0, 100 0, 100 100, 0 100, 0 0))' }
                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.locationType").value("region"))
                .andExpect(jsonPath("$.area").value("POLYGON ((0 0, 100 0, 100 100, 0 100, 0 0))"));

        point("dentro", "'map': 'main', 'position': 'POINT (50 50)'");
        point("fora", "'map': 'main', 'position': 'POINT (150 50)'");
        point("outro-mapa", "'map': 'outro', 'position': 'POINT (50 50)'");
        // Como a rule de Valheim: aparece no local inteiro, sem posição.
        point("minerio", "'location': 'cais'");

        mvc.perform(query(SPAWN_POINTS, and(rule("location", "equal", "cais")), game))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.content[*].extId", containsInAnyOrder("dentro", "minerio")));

        mvc.perform(query(LOCATIONS, and(rule("containing", "equal", "dentro")), game))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.content[0].extId").value("cais"));
        mvc.perform(query(LOCATIONS, and(rule("containing", "equal", "minerio")), game)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(query(LOCATIONS, and(rule("containing", "equal", "fora")), game)).andExpect(jsonPath("$.total").value(0));
        mvc.perform(query(LOCATIONS, and(rule("containing", "equal", "outro-mapa")), game)).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void mapMarkersAreCompactAndFilteredByAreaCategoryAndEvent() throws Exception {
        send(post("/api/v1/games/{game}/entities", game), "editor", json("""
                { 'extId': 'peixe', 'name': 'Peixe', 'categories': ['animal'],
                  'media': [ { 'usage': 'icon', 'mediaId': '%s' } ] }
                """.formatted(newMedia())))
                .andExpect(status().isCreated());
        point("p1", "'map': 'main', 'position': 'POINT (10 10)', 'events': ['rainy'],"
                + " 'occupants': [ { 'target': { 'kind': 'entity', 'extId': 'peixe' }, 'chance': 1 } ]");
        point("p2", "'map': 'main', 'position': 'POINT (500 500)',"
                + " 'occupants': [ { 'target': { 'kind': 'entity', 'extId': 'pedra' } } ]");
        point("p3", "'map': 'main', 'position': 'POINT Z (20 20 5)',"
                + " 'occupants': [ { 'target': { 'extId': 'pedra' } }, { 'target': { 'kind': 'entity', 'extId': 'peixe' } } ]");

        mvc.perform(list(MARKERS, game, "main"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.truncated").value(false))
                .andExpect(jsonPath("$.content[2].position").value("POINT Z(20 20 5)"));
        mvc.perform(query(MARKERS, and(rule("position", "intersects", List.of(0, 0, 100, 100))), game, "main"))
                .andExpect(jsonPath("$.total").value(2));
        mvc.perform(query(MARKERS, and(rule("occupantCategory", "equal", "animal")), game, "main"))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.content[0].occupants[0].name").value("Peixe"))
                .andExpect(jsonPath("$.content[0].occupants[0].iconMediaId").isNotEmpty())
                .andExpect(jsonPath("$.content[1].occupants[0].name").doesNotExist());
        mvc.perform(query(MARKERS, and(rule("event", "equal", "rainy")), game, "main"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.content[0].events[0]").value("rainy"));
        mvc.perform(list(MARKERS, game, "main").param("limit", "1"))
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.truncated").value(true));
        mvc.perform(query(MARKERS, and(rule("position", "intersects", List.of(1, 2, 3))), game, "main"))
                .andExpect(status().isBadRequest());
        mvc.perform(list(MARKERS, game, "outro")).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void markersCarryRespawnCategoriesAndFindPointsThatYieldAnItem() throws Exception {
        send(post("/api/v1/games/{game}/entities", game), "editor", json("""
                { 'extId': 'arvore', 'name': 'Arvore', 'categories': ['planta'], 'respawnDelayMinutes': 30,
                  'drops': [ { 'target': { 'kind': 'item', 'extId': 'madeira' }, 'chance': 1, 'amount': 2 } ] }
                """))
                .andExpect(status().isCreated());
        point("a1", "'map': 'main', 'position': 'POINT (1 1)',"
                + " 'occupants': [ { 'target': { 'kind': 'entity', 'extId': 'arvore' } } ]");
        point("a2", "'map': 'main', 'position': 'POINT (2 2)', 'respawnDelayMinutes': 5,"
                + " 'drops': [ { 'target': { 'kind': 'item', 'extId': 'resina' }, 'amount': 1 } ]");
        point("a3", "'map': 'main', 'position': 'POINT (3 3)'");

        // Sem tempo próprio, o ponto usa o respawn da entidade que aparece nele.
        mvc.perform(list(MARKERS, game, "main"))
                .andExpect(jsonPath("$.content[0].respawnDelayMinutes").value(30))
                .andExpect(jsonPath("$.content[0].occupants[0].categories[0]").value("planta"))
                .andExpect(jsonPath("$.content[0].occupants[0].respawnDelayMinutes").value(30))
                .andExpect(jsonPath("$.content[1].respawnDelayMinutes").value(5));

        mvc.perform(query(MARKERS, and(rule("yields", "equal", "item:madeira")), game, "main"))
                .andExpect(jsonPath("$.content[*].extId", containsInAnyOrder("a1")));
        mvc.perform(query(MARKERS, and(rule("yields", "equal", "item:resina")), game, "main"))
                .andExpect(jsonPath("$.content[*].extId", containsInAnyOrder("a2")));
    }

    @Test
    void rejectsGeometryThatDoesNotFitTheField() throws Exception {
        send(post(SPAWN_POINTS, game), "editor", json("{ 'extId': 's1' }")).andExpect(status().isBadRequest());
        send(post(SPAWN_POINTS, game), "editor", json("{ 'extId': 's2', 'position': 'POINT (1)' }"))
                .andExpect(status().isBadRequest());
        send(post(SPAWN_POINTS, game), "editor",
                json("{ 'extId': 's3', 'position': 'POLYGON ((0 0, 1 0, 1 1, 0 0))' }"))
                .andExpect(status().isBadRequest());
        send(post(SPAWN_POINTS, game), "editor", json("""
                { 'extId': 's4', 'position': 'POINT (1 1)', 'occupants': [ { 'target': { 'extId': 'x' }, 'chance': 2 } ] }
                """))
                .andExpect(status().isBadRequest());
        send(post(LOCATIONS, game), "editor",
                json("{ 'extId': 'l1', 'name': 'L', 'area': 'POLYGON ((0 0, 10 10, 10 0, 0 10, 0 0))' }"))
                .andExpect(status().isBadRequest());
        send(post(LOCATIONS, game), "editor", json("{ 'extId': 'l2', 'name': 'L', 'parent': 'l2' }"))
                .andExpect(status().isBadRequest());
    }

    private void point(String extId, String fields) throws Exception {
        send(post(SPAWN_POINTS, game), "editor", json("{ 'extId': '" + extId + "', " + fields + " }"))
                .andExpect(status().isCreated());
    }
}
