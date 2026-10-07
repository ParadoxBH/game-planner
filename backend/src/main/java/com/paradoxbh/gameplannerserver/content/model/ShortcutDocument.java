package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;
import java.util.Set;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.Geometries;

/**
 * Atalho: leva o jogador de {@code origin} a {@code destination}, no mesmo mapa ou em outro (portal,
 * barco, elevador, porta de masmorra). Com {@code bidirectional}, o caminho vale nos dois sentidos;
 * sem ele, só da origem para o destino. Sem nome, a exibição usa o código.
 *
 * {@code requirements} é o que o jogador precisa ter a cada uso, na forma do requisito de entidade: a
 * passagem é gasta, a chave não ({@code notConsumed}). {@code unlock} é o que libera o atalho, na forma
 * do desbloqueio de receita: quest, chefe derrotado, evento.
 */
public record ShortcutDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        End origin,
        End destination,
        Boolean bidirectional,
        List<Requirement> requirements,
        List<RecipeUnlock> unlock,
        List<String> events,
        ContentMeta meta) implements ContentDocument<ShortcutDocument> {

    /** Uma ponta do atalho: o mapa e o ponto nele, em WKT de coordenadas de jogo, com ou sem Z. */
    public record End(String map, String position) {

        End canonical(String field) {
            String point = Geometries.canonical(position, field + ".position", Set.of("Point"));
            if (point == null) {
                throw ApiException.badRequest(field + ".position é obrigatório");
            }
            return new End(ExtIds.require(map, field + ".map"), point);
        }
    }

    @Override
    public ShortcutDocument canonical(String extId) {
        if (origin == null) {
            throw ApiException.badRequest("origin é obrigatório");
        }
        if (destination == null) {
            throw ApiException.badRequest("destination é obrigatório");
        }
        End from = origin.canonical("origin");
        End to = destination.canonical("destination");
        if (from.equals(to)) {
            throw ApiException.badRequest("origin e destination são o mesmo lugar");
        }
        return new ShortcutDocument(
                ExtIds.require(extId, "extId"),
                Canon.text(name),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.SHORTCUT.code()),
                from,
                to,
                Boolean.TRUE.equals(bidirectional),
                Canon.rows(requirements, "requirements", Requirement::canonical),
                Canon.rows(unlock, "unlock", RecipeUnlock::canonical),
                Canon.ids(events, "events"),
                null);
    }

    @Override
    public ShortcutDocument withMeta(ContentMeta meta) {
        return new ShortcutDocument(extId, name, summary, description, media, origin, destination, bidirectional,
                requirements, unlock, events, meta);
    }

    @Override
    public ShortcutDocument withMedia(List<MediaLink> media) {
        return new ShortcutDocument(extId, name, summary, description, media, origin, destination, bidirectional,
                requirements, unlock, events, meta);
    }
}
