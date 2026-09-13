package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Coleção de um jogo, como "Flores e Hibridações". Os membros ficam nos grupos
 * ({@link CollectionGroupDocument}), que apontam para a coleção pelo código.
 */
public record CollectionDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        List<String> events,
        ContentMeta meta) implements ContentDocument<CollectionDocument> {

    @Override
    public CollectionDocument canonical(String extId) {
        return new CollectionDocument(
                ExtIds.require(extId, "extId"),
                Canon.required(name, "name"),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.COLLECTION.code()),
                Canon.ids(events, "events"),
                null);
    }

    @Override
    public CollectionDocument withMeta(ContentMeta meta) {
        return new CollectionDocument(extId, name, summary, description, media, events, meta);
    }

    @Override
    public CollectionDocument withMedia(List<MediaLink> media) {
        return new CollectionDocument(extId, name, summary, description, media, events, meta);
    }
}
