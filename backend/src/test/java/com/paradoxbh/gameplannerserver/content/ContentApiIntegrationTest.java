package com.paradoxbh.gameplannerserver.content;

import static com.paradoxbh.gameplannerserver.query.QueryJson.and;
import static com.paradoxbh.gameplannerserver.query.QueryJson.or;
import static com.paradoxbh.gameplannerserver.query.QueryJson.rule;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.paradoxbh.gameplannerserver.support.ContentApiTest;

/**
 * Contrato HTTP do núcleo de conteúdo de ponta a ponta: controller genérico, JSON,
 * autorização por jogo e banco real. Cada teste cria o próprio jogo.
 */
class ContentApiIntegrationTest extends ContentApiTest {

    private static final String ITEMS = "/api/v1/games/{game}/items";
    private static final String ITEM = "/api/v1/games/{game}/items/{id}";
    private static final String CATEGORIES = "/api/v1/games/{game}/categories";

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

        mvc.perform(query(ITEMS, and(rule("attribute", "equal", "peso")), game))
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

        mvc.perform(query(ITEMS, and(rule("category", "equal", "x"), rule("category", "equal", "y")), game))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.content[0].extId").value("a"));

        // Só x, ou o que se chama Gama.
        mvc.perform(query(ITEMS, or(and(rule("category", "equal", "x"), rule("category", "not_in", List.of("y"))),
                        rule("name", "equal", "Gama")), game).param("sort", "extId"))
                .andExpect(jsonPath("$.content[*].extId", contains("b", "c")));

        mvc.perform(list(ITEMS, game).param("sort", "extId").param("size", "2").param("page", "1"))
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].extId").value("c"));

        mvc.perform(query(ITEMS, or(rule("name", "contains", "bet"), rule("extId", "contains", "bet")), game))
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
        mvc.perform(query(ITEMS, or(rule("event", "is_null")), game))
                .andExpect(jsonPath("$.content[*].extId", contains("comum")));
        mvc.perform(query(ITEMS, or(rule("event", "is_null"), rule("event", "in", List.of("natal"))), game))
                .andExpect(jsonPath("$.total").value(2));

        mvc.perform(query(ITEMS, and(rule("category", "equal", "flor"), rule("category", "not_in", List.of("raro"))), game))
                .andExpect(jsonPath("$.content[*].extId", contains("comum")));
        mvc.perform(query(ITEMS, and(rule("extId", "not_in", List.of("comum", "natal"))), game))
                .andExpect(jsonPath("$.content[*].extId", contains("loja")));

        mvc.perform(query(ITEMS, and(rule("buyable", "equal", true)), game))
                .andExpect(jsonPath("$.content[*].extId", contains("loja")));
        mvc.perform(query(ITEMS, and(rule("sellable", "equal", true)), game))
                .andExpect(jsonPath("$.content[*].extId", contains("comum")));
        mvc.perform(query(ITEMS, and(rule("buyable", "equal", false), rule("sellable", "equal", false)), game))
                .andExpect(jsonPath("$.content[*].extId", contains("natal")));
        mvc.perform(query(ITEMS, and(rule("buyable", "equal", "talvez")), game)).andExpect(status().isBadRequest());
        mvc.perform(query(ITEMS, and(rule("buyable", "contains", "x")), game)).andExpect(status().isBadRequest());
    }

    @Test
    void contentCountsTellWhichKindsTheGameHas() throws Exception {
        send(post(ITEMS, game), "editor", json("{ 'extId': 'pedra', 'name': 'Pedra' }")).andExpect(status().isCreated());
        send(put("/api/v1/games/{game}/entities", game), "editor", json("""
                [ { 'extId': 'lobo', 'name': 'Lobo' }, { 'extId': 'urso', 'name': 'Urso' } ]
                """))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/games/{game}/content-counts", game))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.item").value(1))
                .andExpect(jsonPath("$.entity").value(2))
                .andExpect(jsonPath("$.recipe").doesNotExist());
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

        mvc.perform(query("/api/v1/games/{game}/events", and(rule("type", "equal", "clima")), game))
                .andExpect(jsonPath("$.content[*].extId", contains("chuva")));

        // Categoria sem appliesTo vale para ambos e aparece tanto em item quanto em entidade.
        mvc.perform(query(CATEGORIES, and(rule("appliesTo", "in", List.of("item", "both"))), game).param("sort", "extId"))
                .andExpect(jsonPath("$.content[*].extId", contains("flor", "raro")));
        mvc.perform(query(CATEGORIES, and(rule("appliesTo", "in", List.of("entity", "both"))), game).param("sort", "extId"))
                .andExpect(jsonPath("$.content[*].extId", contains("npc", "raro")));
        mvc.perform(query(CATEGORIES, and(rule("appliesTo", "equal", "both")), game))
                .andExpect(jsonPath("$.content[*].extId", contains("raro")));
        mvc.perform(query(CATEGORIES, and(rule("appliesTo", "equal", "mapa")), game))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listingFiltersComeWithTheGameOptions() throws Exception {
        send(put(CATEGORIES, game), "editor", json("""
                [ { 'extId': 'flor', 'name': 'Flor', 'appliesTo': 'item', 'primary': true },
                  { 'extId': 'fruta', 'name': 'Fruta', 'appliesTo': 'item', 'primary': true },
                  { 'extId': 'npc', 'name': 'NPC', 'appliesTo': 'entity', 'primary': true },
                  { 'extId': 'vazia', 'name': 'Vazia', 'appliesTo': 'item', 'primary': true },
                  { 'extId': 'raro', 'name': 'Raro' },
                  { 'extId': 'doce', 'name': 'Doce', 'appliesTo': 'item' } ]
                """))
                .andExpect(status().isOk());
        send(put(ITEMS, game), "editor", json("""
                [ { 'extId': 'rosa', 'name': 'Rosa', 'categories': ['flor', 'raro', 'sazonal'] },
                  { 'extId': 'maca', 'name': 'Maca', 'categories': ['fruta', 'doce', 'raro'] },
                  { 'extId': 'cesta', 'name': 'Cesta', 'categories': ['fruta', 'flor'] } ]
                """))
                .andExpect(status().isOk());
        send(put("/api/v1/games/{game}/entities", game), "editor",
                json("[ { 'extId': 'joao', 'name': 'Joao', 'categories': ['npc', 'raro'] } ]"))
                .andExpect(status().isOk());

        mvc.perform(get(CATEGORIES + "/flor", game)).andExpect(jsonPath("$.primary").value(true));
        mvc.perform(get(CATEGORIES + "/raro", game)).andExpect(jsonPath("$.primary").value(false));
        mvc.perform(query(CATEGORIES, and(rule("primary", "equal", true)), game).param("sort", "extId"))
                .andExpect(jsonPath("$.content[*].extId", contains("flor", "fruta", "npc", "vazia")));

        // Categoria: só as principais que algum item usa. Sub-categoria: as que os itens usam, cadastradas
        // ou não (sazonal), cada uma com as principais junto das quais aparece; principal só entra quando
        // aparece junto de outra (flor e fruta na cesta).
        mvc.perform(get(ITEMS + "/query/filters", game))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.search.placeholder").value("Pesquisar itens..."))
                .andExpect(jsonPath("$.search.fields", contains("name", "extId")))
                .andExpect(jsonPath("$.activeEvents").value(true))
                .andExpect(jsonPath("$.filters[*].key", contains("category", "subCategory", "status", "rarity")))
                .andExpect(jsonPath("$.filters[0].display").value("select"))
                .andExpect(jsonPath("$.filters[0].field").value("category"))
                .andExpect(jsonPath("$.filters[0].options[*].value", contains("flor", "fruta")))
                .andExpect(jsonPath("$.filters[1].display").value("multi"))
                .andExpect(jsonPath("$.filters[1].dependsOn").value("category"))
                .andExpect(jsonPath("$.filters[1].options[*].value", contains("doce", "flor", "fruta", "raro", "sazonal")))
                .andExpect(jsonPath("$.filters[1].options[?(@.value == 'doce')].parents[*]", contains("fruta")))
                .andExpect(jsonPath("$.filters[1].options[?(@.value == 'flor')].parents[*]", contains("fruta")))
                .andExpect(jsonPath("$.filters[1].options[?(@.value == 'raro')].parents[*]", contains("flor", "fruta")))
                .andExpect(jsonPath("$.filters[1].options[?(@.value == 'sazonal')].label", contains("sazonal")))
                .andExpect(jsonPath("$.filters[1].options[?(@.value == 'sazonal')].parents[*]", contains("flor")))
                .andExpect(jsonPath("$.filters[2].options[0].query.rules[0].field").value("buyable"))
                .andExpect(jsonPath("$.filters[3].options").isEmpty());
        mvc.perform(get("/api/v1/games/{game}/entities/query/filters", game))
                .andExpect(jsonPath("$.filters[0].options[*].value", contains("npc")))
                .andExpect(jsonPath("$.filters[1].options[*].value", contains("raro")))
                .andExpect(jsonPath("$.filters[1].options[0].parents[*]", contains("npc")));

        // Marcar uma categoria como principal a leva para o filtro, sem mudança no front.
        send(put(CATEGORIES + "/{id}", game, "doce"), "editor",
                json("{ 'name': 'Doce', 'appliesTo': 'item', 'primary': true }"))
                .andExpect(status().isOk());
        mvc.perform(get(ITEMS + "/query/filters", game))
                .andExpect(jsonPath("$.filters[0].options[*].value", contains("doce", "flor", "fruta")))
                .andExpect(jsonPath("$.filters[1].options[?(@.value == 'raro')].parents[*]", contains("doce", "flor", "fruta")));

        mvc.perform(get(CATEGORIES + "/query/filters", game))
                .andExpect(jsonPath("$.filters[*].key", contains("appliesTo", "primary")));
        mvc.perform(get("/api/v1/games/{game}/maps/query/filters", game)).andExpect(jsonPath("$.filters").isEmpty());
        // Evento e código de resgate não têm eventos: o filtro global não vale para eles.
        mvc.perform(get("/api/v1/games/{game}/codes/query/filters", game)).andExpect(jsonPath("$.activeEvents").value(false));
        mvc.perform(get("/api/v1/games/{game}/planetas/query/filters", game)).andExpect(status().isNotFound());
    }

    @Test
    void queryFieldsDescribeWhatEachListingAccepts() throws Exception {
        mvc.perform(get(ITEMS + "/query/fields", game))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fields[0].name").value("name"))
                .andExpect(jsonPath("$.fields[?(@.name == 'rarity')].kind", contains("rarity")))
                .andExpect(jsonPath("$.fields[?(@.name == 'buyable')].type", contains("boolean")))
                .andExpect(jsonPath("$.fields[?(@.name == 'level')].operators[*]", hasItem("between")))
                .andExpect(jsonPath("$.sorts", hasItem("level")));
        mvc.perform(get(CATEGORIES + "/query/fields", game))
                .andExpect(jsonPath("$.fields[?(@.name == 'appliesTo')].options[*].value",
                        contains("item", "entity", "both")));

        // Tipo sem raridade não oferece o campo, e o filtro recusa.
        mvc.perform(get("/api/v1/games/{game}/events/query/fields", game))
                .andExpect(jsonPath("$.fields[*].name", not(hasItem("rarity"))));
        mvc.perform(query("/api/v1/games/{game}/events", and(rule("rarity", "equal", "raro")), game))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(startsWith(
                        "query.rules[0]: campo desconhecido \"rarity\"")));
    }
}
