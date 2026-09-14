package com.paradoxbh.gameplannerserver.content;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.paradoxbh.gameplannerserver.support.ContentApiTest;

/**
 * Contrato HTTP do núcleo de conteúdo de ponta a ponta: controller genérico, JSON,
 * autorização por jogo e banco real. Cada teste cria o próprio jogo.
 */
class ContentApiIntegrationTest extends ContentApiTest {

    private static final String ITEMS = "/api/v1/games/{game}/items";
    private static final String ITEM = "/api/v1/games/{game}/items/{id}";

    @Test
    void createsAndReadsItemWithTagsAttributesAndSpacedId() throws Exception {
        send(post(ITEMS, game), "editor", json("""
                { 'extId': 'Hound (1)_abc', 'name': 'Cao', 'level': 3, 'baseBuyPrice': 10.50,
                  'categories': ['criatura', 'criatura', 'pet'], 'events': ['gala'],
                  'attributes': { 'peso': 1.5, 'comestivel': false, 'origem': 'loja' } }
                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.meta.revision").value(1))
                .andExpect(jsonPath("$.meta.createdBy").value("editor"))
                .andExpect(jsonPath("$.categories.length()").value(2));

        mvc.perform(get(ITEM, game, "Hound (1)_abc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.extId").value("Hound (1)_abc"))
                .andExpect(jsonPath("$.level").value(3))
                .andExpect(jsonPath("$.baseBuyPrice").value(10.5))
                .andExpect(jsonPath("$.categories[0]").value("criatura"))
                .andExpect(jsonPath("$.categories[1]").value("pet"))
                .andExpect(jsonPath("$.events[0]").value("gala"))
                .andExpect(jsonPath("$.attributes.peso").value(1.5))
                .andExpect(jsonPath("$.attributes.comestivel").value(false))
                .andExpect(jsonPath("$.attributes.origem").value("loja"));
    }

    @Test
    void identicalWriteIsUnchangedAndRealChangeAddsRevision() throws Exception {
        send(post(ITEMS, game), "editor", json("{ 'extId': 'maca', 'name': 'Maca', 'baseSellPrice': 10 }"))
                .andExpect(status().isCreated());

        // 10.0 é o mesmo valor que 10: não pode virar revisão.
        send(put(ITEM, game, "maca"), "editor", json("{ 'name': 'Maca', 'baseSellPrice': 10.0 }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.revision").value(1));

        send(put(ITEM, game, "maca"), "editor", json("{ 'name': 'Maca verde', 'baseSellPrice': 10 }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.revision").value(2));

        mvc.perform(get(ITEM + "/revisions", game, "maca"))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].revision").value(2))
                .andExpect(jsonPath("$[0].operation").value("update"))
                .andExpect(jsonPath("$[1].operation").value("create"));
    }

    @Test
    void deleteThenRestoreBringsContentBack() throws Exception {
        send(post(ITEMS, game), "editor", json("{ 'extId': 'pera', 'name': 'Pera v1' }"))
                .andExpect(status().isCreated());
        send(put(ITEM, game, "pera"), "editor", json("{ 'name': 'Pera v2' }"))
                .andExpect(status().isOk());

        mvc.perform(delete(ITEM, game, "pera").with(as("editor"))).andExpect(status().isForbidden());
        mvc.perform(delete(ITEM, game, "pera").with(as("moderador"))).andExpect(status().isNoContent());
        mvc.perform(get(ITEM, game, "pera"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.type").value("https://gameplanner/errors/unregistered-content"));

        mvc.perform(post(ITEM + "/revisions/{revision}/restore", game, "pera", 2).with(as("moderador")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Pera v2"))
                .andExpect(jsonPath("$.meta.revision").value(4));

        mvc.perform(get(ITEM + "/revisions", game, "pera"))
                .andExpect(jsonPath("$[0].operation").value("restore"))
                .andExpect(jsonPath("$[1].operation").value("delete"));
    }

    @Test
    void writingRequiresVerifiedMemberOfMembersOnlyGame() throws Exception {
        String body = json("{ 'extId': 'x', 'name': 'X' }");
        send(post(ITEMS, game), null, body).andExpect(status().isUnauthorized());
        send(post(ITEMS, game), "sem-vinculo", body).andExpect(status().isForbidden());
        send(post(ITEMS, game), "estranho", body).andExpect(status().isForbidden());
        send(post(ITEMS, game), "editor", body).andExpect(status().isCreated());
        send(post(ITEMS, game), "editor", body).andExpect(status().isConflict());
    }

    @Test
    void pendingReferencesAndNotFoundTellWhatIsMissing() throws Exception {
        send(put(ITEMS, game), "editor", json("""
                [ { 'extId': 'a', 'name': 'A', 'categories': ['flores'] },
                  { 'extId': 'b', 'name': 'B', 'categories': ['flores'], 'variantOf': 'base' } ]
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created").value(2));

        mvc.perform(get("/api/v1/games/{game}/pending-references", game))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.content[0].extId").value("flores"))
                .andExpect(jsonPath("$.content[0].guessedKind").value("category"))
                .andExpect(jsonPath("$.content[0].referenceCount").value(2))
                .andExpect(jsonPath("$.content[1].extId").value("base"))
                .andExpect(jsonPath("$.content[1].referencedBy[0].field").value("variantOf"));

        mvc.perform(get("/api/v1/games/{game}/categories/{id}", game, "flores"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.referenceCount").value(2))
                .andExpect(jsonPath("$.referencedBy[0].kind").value("item"))
                .andExpect(jsonPath("$.referencedBy[0].field").value("categories"));

        send(post("/api/v1/games/{game}/categories", game), "editor", json("{ 'extId': 'flores', 'name': 'Flores' }"))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/games/{game}/pending-references", game))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.content[0].extId").value("base"));
    }

    @Test
    void bulkWriteCountsOutcomesAndRejectsRepeatedIds() throws Exception {
        send(put(ITEMS, game), "editor", json("[ { 'extId': 'a', 'name': 'A' }, { 'extId': 'b', 'name': 'B' } ]"))
                .andExpect(jsonPath("$.created").value(2));

        send(put(ITEMS, game), "editor", json("""
                [ { 'extId': 'a', 'name': 'A' }, { 'extId': 'b', 'name': 'B2' }, { 'extId': 'c', 'name': 'C' } ]
                """))
                .andExpect(jsonPath("$.created").value(1))
                .andExpect(jsonPath("$.updated").value(1))
                .andExpect(jsonPath("$.unchanged").value(1));

        send(put(ITEMS, game), "editor", json("[ { 'extId': 'x', 'name': 'X' }, { 'extId': 'x', 'name': 'X' } ]"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.index").value(1));
    }

    @Test
    void attributeValueMustMatchItsDefinition() throws Exception {
        send(put("/api/v1/games/{game}/attributes/{key}", game, "peso"), "editor",
                json("{ 'label': 'Peso', 'dataType': 'number', 'unit': 'kg' }"))
                .andExpect(status().isOk());

        send(post(ITEMS, game), "editor", json("{ 'extId': 'pedra', 'name': 'Pedra', 'attributes': { 'peso': 'pesado' } }"))
                .andExpect(status().is(422));
        send(post(ITEMS, game), "editor", json("{ 'extId': 'pedra', 'name': 'Pedra', 'attributes': { 'peso': 2 } }"))
                .andExpect(status().isCreated());
        send(post(ITEMS, game), "editor", json("{ 'extId': 'pena', 'name': 'Pena' }"))
                .andExpect(status().isCreated());

        mvc.perform(get(ITEMS, game).param("attribute", "peso"))
                .andExpect(jsonPath("$.content[*].extId", contains("pedra")));
    }

    @Test
    void rejectsIdsThatBreakUrlsAndFilePathsAsMedia() throws Exception {
        send(post(ITEMS, game), "editor", json("{ 'extId': 'a/b', 'name': 'X' }"))
                .andExpect(status().isBadRequest());
        send(post(ITEMS, game), "editor", json("""
                { 'extId': 'ok', 'name': 'X', 'media': [ { 'usage': 'icon', 'mediaId': '/img/heartopia/logo.png' } ] }
                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listFiltersByAllGivenCategoriesAndPaginates() throws Exception {
        send(put(ITEMS, game), "editor", json("""
                [ { 'extId': 'a', 'name': 'Alfa', 'categories': ['x', 'y'] },
                  { 'extId': 'b', 'name': 'Beta', 'categories': ['x'] },
                  { 'extId': 'c', 'name': 'Gama', 'categories': ['y'] } ]
                """))
                .andExpect(status().isOk());

        mvc.perform(get(ITEMS + "?category=x&category=y", game))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.content[0].extId").value("a"));

        mvc.perform(get(ITEMS + "?sort=extId&size=2&page=1", game))
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].extId").value("c"));

        mvc.perform(get(ITEMS + "?search=bet", game))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.content[0].extId").value("b"));
    }

    @Test
    void eventsEntitiesAndRaritiesRoundTrip() throws Exception {
        send(post("/api/v1/games/{game}/events", game), "editor", json("""
                { 'extId': 'gala', 'name': 'Gala', 'eventType': 'season',
                  'periodStart': '2026-01-10', 'periodEnd': '2026-01-05' }
                """))
                .andExpect(status().isBadRequest());

        send(post("/api/v1/games/{game}/events", game), "editor", json("""
                { 'extId': 'gala', 'name': 'Gala', 'eventType': 'season',
                  'periodStart': '2026-01-10', 'periodEnd': '2026-02-10' }
                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.periodStart").value("2026-01-10"));

        send(post("/api/v1/games/{game}/entities", game), "editor",
                json("{ 'extId': 'lox bite', 'name': 'Lox', 'respawnDelayMinutes': 30, 'events': ['gala'] }"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.respawnDelayMinutes").value(30))
                .andExpect(jsonPath("$.events[0]").value("gala"));

        send(put("/api/v1/games/{game}/rarities/{code}", game, "comum"), "editor",
                json("{ 'name': 'Comum', 'color': '#CAC2AD', 'ordinal': 0 }"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/games/{game}/rarities", game))
                .andExpect(jsonPath("$[0].code").value("comum"));
    }

    @Test
    void mediaLinksKeepOrderAndAuthorshipAndTheLatestIconIsCurrent() throws Exception {
        String icon = newMedia();
        String firstShot = newMedia();
        String secondShot = newMedia();
        String newerIcon = newMedia();

        // Chegam fora de ordem: a resposta agrupa por uso e mantém a ordem dentro de cada uso.
        send(post(ITEMS, game), "editor", json("""
                { 'extId': 'foto', 'name': 'Com fotos', 'media': [
                    { 'usage': 'screenshot', 'mediaId': '%s' },
                    { 'usage': 'icon', 'mediaId': '%s' },
                    { 'usage': 'screenshot', 'mediaId': '%s' } ] }
                """.formatted(firstShot, icon, secondShot)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.media.length()").value(3))
                .andExpect(jsonPath("$.media[0].usage").value("icon"))
                .andExpect(jsonPath("$.media[1].mediaId").value(firstShot))
                .andExpect(jsonPath("$.media[2].mediaId").value(secondShot))
                .andExpect(jsonPath("$.media[1].addedBy").value("editor"))
                .andExpect(jsonPath("$.media[1].addedAt").exists());

        // Outra pessoa reordena as fotos e adiciona um ícone novo: quem já estava mantém a autoria.
        send(put(ITEM, game, "foto"), "moderador", json("""
                { 'name': 'Com fotos', 'media': [
                    { 'usage': 'icon', 'mediaId': '%s' },
                    { 'usage': 'icon', 'mediaId': '%s' },
                    { 'usage': 'screenshot', 'mediaId': '%s' },
                    { 'usage': 'screenshot', 'mediaId': '%s' } ] }
                """.formatted(icon, newerIcon, secondShot, firstShot)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.media[1].mediaId").value(newerIcon))
                .andExpect(jsonPath("$.media[1].addedBy").value("moderador"))
                .andExpect(jsonPath("$.media[2].mediaId").value(secondShot))
                .andExpect(jsonPath("$.media[2].addedBy").value("editor"))
                .andExpect(jsonPath("$.media[3].mediaId").value(firstShot));

        // Entre dois ícones, o exibido é o adicionado por último.
        mvc.perform(get("/api/v1/games/{game}/search?q=fotos", game))
                .andExpect(jsonPath("$[0].iconMediaId").value(newerIcon));

        // Uso fora da lista do tipo, e mídia que nunca foi enviada.
        send(put(ITEM, game, "foto"), "editor", json("{ 'name': 'X', 'media': [ { 'usage': 'capsule', 'mediaId': '%s' } ] }"
                .formatted(icon)))
                .andExpect(status().isBadRequest());
        String neverUploaded = "f".repeat(64);
        send(put(ITEM, game, "foto"), "editor", json("{ 'name': 'X', 'media': [ { 'usage': 'icon', 'mediaId': '%s' } ] }"
                .formatted(neverUploaded)))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.missingMedia[0]").value(neverUploaded));

        // Imagem ligada não pode ser apagada.
        mvc.perform(delete("/api/v1/media/{id}", icon).with(as("admin")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.usedBy[0].extId").value("foto"))
                .andExpect(jsonPath("$.usedBy[0].usage").value("icon"));
    }

    @Test
    void imagesCanBeAttachedBeforeTheRecordExistsAndSurviveItsWrites() throws Exception {
        String shot = newMedia();
        String media = ITEM + "/media";
        String link = json("{ 'usage': 'screenshot', 'mediaId': '%s' }".formatted(shot));

        // Durante o cadastro: a imagem é anexada ao código antes de o item existir.
        send(post(media, game, "novo"), "editor", link)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$[0].mediaId").value(shot))
                .andExpect(jsonPath("$[0].addedBy").value("editor"));
        send(post(media, game, "novo"), "editor", link)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mvc.perform(get(ITEM, game, "novo")).andExpect(status().isNotFound());
        mvc.perform(get(media, game, "novo")).andExpect(jsonPath("$.length()").value(1));

        // Criar e editar o registro sem o campo "media" não mexe nas imagens já anexadas.
        send(post(ITEMS, game), "editor", json("{ 'extId': 'novo', 'name': 'Novo' }"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.media[0].mediaId").value(shot));
        send(put(ITEM, game, "novo"), "editor", json("{ 'name': 'Novo 2' }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.media.length()").value(1));

        // Apagar o registro não desfaz as ligações: elas pertencem ao código.
        mvc.perform(delete(ITEM, game, "novo").with(as("moderador"))).andExpect(status().isNoContent());
        mvc.perform(get(media, game, "novo")).andExpect(jsonPath("$.length()").value(1));

        mvc.perform(delete(media + "/{usage}/{mediaId}", game, "novo", "screenshot", shot).with(as("editor")))
                .andExpect(status().isNoContent());
        mvc.perform(get(media, game, "novo")).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(delete(media + "/{usage}/{mediaId}", game, "novo", "screenshot", shot).with(as("editor")))
                .andExpect(status().isNotFound());
    }

    @Test
    void gameImagesUseTheSameRelationship() throws Exception {
        String capsule = newMedia();

        send(patch("/api/v1/games/{game}", game), "admin",
                json("{ 'media': [ { 'usage': 'capsule', 'mediaId': '%s' } ] }".formatted(capsule)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.media[0].usage").value("capsule"))
                .andExpect(jsonPath("$.media[0].addedBy").value("admin"));

        mvc.perform(get("/api/v1/games/{game}", game))
                .andExpect(jsonPath("$.media[0].mediaId").value(capsule));

        // screenshot não é uso de jogo.
        send(patch("/api/v1/games/{game}", game), "admin",
                json("{ 'media': [ { 'usage': 'screenshot', 'mediaId': '%s' } ] }".formatted(capsule)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void orphanMediaIsWhatNothingLinksAndOnlyAdminsSeeIt() throws Exception {
        String used = newMedia();
        String orphan = newMedia();
        send(post(ITEMS, game), "editor", json("""
                { 'extId': 'com-icone', 'name': 'Com icone', 'media': [ { 'usage': 'icon', 'mediaId': '%s' } ] }
                """.formatted(used)))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/media/orphans").with(as("editor"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/media/orphans").with(as("admin")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(orphan)))
                .andExpect(jsonPath("$[*].id", not(hasItem(used))));
    }

    @Test
    void listHidesInactiveEventsExcludesCategoriesAndFiltersTrade() throws Exception {
        send(post(ITEMS, game), "editor",
                json("{ 'extId': 'comum', 'name': 'Comum', 'categories': ['flor'], 'baseSellPrice': 5 }"))
                .andExpect(status().isCreated());
        send(post(ITEMS, game), "editor",
                json("{ 'extId': 'natal', 'name': 'Natal', 'categories': ['flor', 'raro'], 'events': ['natal'] }"))
                .andExpect(status().isCreated());
        send(post(ITEMS, game), "editor", json("{ 'extId': 'loja', 'name': 'Loja', 'events': ['pascoa'] }"))
                .andExpect(status().isCreated());
        send(post("/api/v1/games/{game}/shop-categories", game), "editor", json("""
                { 'extId': 'balcao', 'name': 'Balcao', 'items': [ { 'target': { 'kind': 'item', 'extId': 'loja' }, 'price': 1 } ] }
                """))
                .andExpect(status().isCreated());

        // Sem evento ativo, só o que não tem evento; com "natal" ativo, o item de natal volta.
        mvc.perform(get(ITEMS, game).param("activeEvents", "")).andExpect(jsonPath("$.content[*].extId", contains("comum")));
        mvc.perform(get(ITEMS, game).param("activeEvents", "natal")).andExpect(jsonPath("$.total").value(2));

        mvc.perform(get(ITEMS, game).param("category", "flor").param("withoutCategory", "raro"))
                .andExpect(jsonPath("$.content[*].extId", contains("comum")));
        mvc.perform(get(ITEMS, game).param("exclude", "comum,natal"))
                .andExpect(jsonPath("$.content[*].extId", contains("loja")));

        mvc.perform(get(ITEMS, game).param("trade", "buyable")).andExpect(jsonPath("$.content[*].extId", contains("loja")));
        mvc.perform(get(ITEMS, game).param("trade", "sellable")).andExpect(jsonPath("$.content[*].extId", contains("comum")));
        mvc.perform(get(ITEMS, game).param("trade", "untraded")).andExpect(jsonPath("$.content[*].extId", contains("natal")));
        mvc.perform(get(ITEMS, game).param("trade", "talvez")).andExpect(status().isBadRequest());
    }

    @Test
    void eventsFilterByTypeAndCategoriesByWhatTheyApplyTo() throws Exception {
        send(put("/api/v1/games/{game}/events", game), "editor", json("""
                [ { 'extId': 'chuva', 'name': 'Chuva', 'eventType': 'clima' },
                  { 'extId': 'natal', 'name': 'Natal', 'eventType': 'season' } ]
                """))
                .andExpect(status().isOk());
        send(put("/api/v1/games/{game}/categories", game), "editor", json("""
                [ { 'extId': 'flor', 'name': 'Flor', 'appliesTo': 'item' },
                  { 'extId': 'npc', 'name': 'NPC', 'appliesTo': 'entity' },
                  { 'extId': 'raro', 'name': 'Raro' } ]
                """))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/games/{game}/events", game).param("type", "clima"))
                .andExpect(jsonPath("$.content[*].extId", contains("chuva")));

        // Categoria sem appliesTo vale para ambos e aparece tanto em item quanto em entidade.
        mvc.perform(get("/api/v1/games/{game}/categories", game).param("appliesTo", "item").param("sort", "extId"))
                .andExpect(jsonPath("$.content[*].extId", contains("flor", "raro")));
        mvc.perform(get("/api/v1/games/{game}/categories", game).param("appliesTo", "entity").param("sort", "extId"))
                .andExpect(jsonPath("$.content[*].extId", contains("npc", "raro")));
        mvc.perform(get("/api/v1/games/{game}/categories", game).param("appliesTo", "both"))
                .andExpect(jsonPath("$.content[*].extId", contains("raro")));
        mvc.perform(get("/api/v1/games/{game}/categories", game).param("appliesTo", "mapa"))
                .andExpect(status().isBadRequest());
    }
}
