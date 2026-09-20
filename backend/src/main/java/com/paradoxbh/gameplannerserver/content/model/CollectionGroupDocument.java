package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Grupo de uma coleção, como "Margaridas". {@code collections} são os códigos das coleções em que
 * o grupo aparece — pode ser mais de uma, e podem não estar cadastradas. {@code members} são os
 * alvos do grupo, de qualquer tipo, na ordem de exibição e sem repetição.
 *
 * {@code ordinal} é a posição do grupo dentro da coleção (V15): é uma só para o grupo, mesmo quando
 * ele aparece em mais de uma coleção. Sem posição, o grupo vai para o fim, em ordem alfabética.
 */
public record CollectionGroupDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        List<String> collections,
        List<Reference> members,
        List<String> events,
        Integer ordinal,
        ContentMeta meta) implements ContentDocument<CollectionGroupDocument> {

    @Override
    public CollectionGroupDocument canonical(String extId) {
        if (ordinal != null && ordinal < 0) {
            throw ApiException.badRequest("ordinal não pode ser negativo");
        }
        return new CollectionGroupDocument(
                ExtIds.require(extId, "extId"),
                Canon.required(name, "name"),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.COLLECTION_GROUP.code()),
                Canon.ids(collections, "collections"),
                Canon.references(members, "members"),
                Canon.ids(events, "events"),
                ordinal,
                null);
    }

    @Override
    public CollectionGroupDocument withMeta(ContentMeta meta) {
        return new CollectionGroupDocument(extId, name, summary, description, media, collections, members, events,
                ordinal, meta);
    }

    @Override
    public CollectionGroupDocument withMedia(List<MediaLink> media) {
        return new CollectionGroupDocument(extId, name, summary, description, media, collections, members, events,
                ordinal, meta);
    }
}
