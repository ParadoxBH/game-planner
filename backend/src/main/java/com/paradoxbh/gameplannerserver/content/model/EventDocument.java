package com.paradoxbh.gameplannerserver.content.model;

import java.time.LocalDate;
import java.util.List;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/** Evento de jogo: temporada, clima, evento de mapa. {@code eventType} padrão "event". */
public record EventDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        String eventType,
        LocalDate periodStart,
        LocalDate periodEnd,
        ContentMeta meta) implements ContentDocument<EventDocument> {

    @Override
    public EventDocument canonical(String extId) {
        if (periodStart != null && periodEnd != null && periodEnd.isBefore(periodStart)) {
            throw ApiException.badRequest("periodEnd não pode ser anterior a periodStart");
        }
        return new EventDocument(
                ExtIds.require(extId, "extId"),
                Canon.required(name, "name"),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.EVENT.code()),
                Canon.code(eventType, "eventType", "event"),
                periodStart,
                periodEnd,
                null);
    }

    @Override
    public EventDocument withMeta(ContentMeta meta) {
        return new EventDocument(extId, name, summary, description, media, eventType, periodStart, periodEnd, meta);
    }

    @Override
    public EventDocument withMedia(List<MediaLink> media) {
        return new EventDocument(extId, name, summary, description, media, eventType, periodStart, periodEnd, meta);
    }
}
