package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Receita. {@code name} é opcional: sem ele, a exibição e a busca usam o nome do primeiro produto
 * cadastrado. {@code inputs} é posicional: nos jogos baseados em slot, cada linha é um slot.
 * {@code stations} são códigos de entidade.
 */
public record RecipeDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        Integer craftTimeSeconds,
        List<String> stations,
        List<Requirement> inputs,
        List<RecipeOutput> outputs,
        List<RecipeUnlock> unlock,
        List<String> events,
        ContentMeta meta) implements ContentDocument<RecipeDocument> {

    @Override
    public RecipeDocument canonical(String extId) {
        if (craftTimeSeconds != null && craftTimeSeconds < 0) {
            throw ApiException.badRequest("craftTimeSeconds não pode ser negativo");
        }
        return new RecipeDocument(
                ExtIds.require(extId, "extId"),
                Canon.text(name),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.RECIPE.code()),
                craftTimeSeconds,
                Canon.ids(stations, "stations"),
                Canon.rows(inputs, "inputs", Requirement::canonical),
                Canon.rows(outputs, "outputs", RecipeOutput::canonical),
                Canon.rows(unlock, "unlock", RecipeUnlock::canonical),
                Canon.ids(events, "events"),
                null);
    }

    @Override
    public RecipeDocument withMeta(ContentMeta meta) {
        return new RecipeDocument(extId, name, summary, description, media, craftTimeSeconds, stations, inputs,
                outputs, unlock, events, meta);
    }

    @Override
    public RecipeDocument withMedia(List<MediaLink> media) {
        return new RecipeDocument(extId, name, summary, description, media, craftTimeSeconds, stations, inputs,
                outputs, unlock, events, meta);
    }
}
