package com.paradoxbh.gameplannerserver.content.store;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.EventDocument;

@Component
public class EventHandler extends AbstractContentHandler<EventDocument, Void> {

    public EventHandler(JdbcClient jdbc, ContentTagsRepository tags) {
        super(jdbc, tags);
    }

    @Override
    public ContentKind kind() {
        return ContentKind.EVENT;
    }

    @Override
    public Class<EventDocument> documentType() {
        return EventDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("event_type", "period_start", "period_end");
    }

    @Override
    protected List<Object> specificValues(EventDocument event) {
        return Arrays.asList(event.eventType(), event.periodStart(), event.periodEnd());
    }

    @Override
    protected EventDocument map(Map<String, Object> row, ContentTags tags, Void children, ContentMeta meta) {
        return new EventDocument(
                Rows.string(row, "ext_id"),
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                Rows.string(row, "event_type"),
                Rows.date(row, "period_start"),
                Rows.date(row, "period_end"),
                meta);
    }

    /** Evento só tem mídias fora da própria tabela. */
    @Override
    public ContentTags tagsOf(EventDocument event) {
        return new ContentTags(List.of(), List.of(), Map.of(), event.media());
    }

    @Override
    protected Map<String, String> specificSortColumns() {
        return Map.of("periodStart", "t.period_start");
    }

    /** type é o tipo do evento, ex.: season, clima. */
    @Override
    protected Map<String, Filter> specificFilters() {
        return Map.of("type", codeColumn("t.event_type"));
    }
}
