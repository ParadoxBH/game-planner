package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;
import java.util.Set;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.Geometries;

/**
 * Ponto de spawn: onde algo aparece. {@code position} é WKT de ponto em coordenadas de jogo, com ou
 * sem Z. Sem posição, o ponto vale para o {@code location} inteiro, ex.: minério que aparece num
 * bioma. {@code occupants} é o que pode aparecer ali; {@code drops}, o que o ponto larga além do
 * drop da entidade (baús, coletáveis). Sem nome, a exibição usa o do primeiro ocupante.
 *
 * {@code conditions} é quando o ponto vale: altitude, horário, clima, progressão... Tipos
 * diferentes valem juntos, o mesmo tipo é "basta um"; veja {@link SpawnCondition}. Não se confunde
 * com {@code events}, que é "basta um ativo" e mistura clima com temporada e ataque.
 */
public record SpawnPointDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        String map,
        String location,
        String position,
        String respawnMode,
        Integer respawnDelayMinutes,
        List<Occupant> occupants,
        List<Drop> drops,
        List<SpawnCondition> conditions,
        List<String> events,
        ContentMeta meta) implements ContentDocument<SpawnPointDocument> {

    @Override
    public SpawnPointDocument canonical(String extId) {
        String point = Geometries.canonical(position, "position", Set.of("Point"));
        String area = ExtIds.optional(location, "location");
        if (point == null && area == null) {
            throw ApiException.badRequest("Ponto sem position precisa de location");
        }
        if (respawnDelayMinutes != null && respawnDelayMinutes < 0) {
            throw ApiException.badRequest("respawnDelayMinutes não pode ser negativo");
        }
        return new SpawnPointDocument(
                ExtIds.require(extId, "extId"),
                Canon.text(name),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.SPAWN_POINT.code()),
                ExtIds.optional(map, "map"),
                area,
                point,
                Canon.code(respawnMode, "respawnMode", null),
                respawnDelayMinutes,
                Canon.rows(occupants, "occupants", Occupant::canonical),
                Canon.rows(drops, "drops", Drop::canonical),
                Canon.rows(conditions, "conditions", SpawnCondition::canonical),
                Canon.ids(events, "events"),
                null);
    }

    @Override
    public SpawnPointDocument withMeta(ContentMeta meta) {
        return new SpawnPointDocument(extId, name, summary, description, media, map, location, position, respawnMode,
                respawnDelayMinutes, occupants, drops, conditions, events, meta);
    }

    @Override
    public SpawnPointDocument withMedia(List<MediaLink> media) {
        return new SpawnPointDocument(extId, name, summary, description, media, map, location, position, respawnMode,
                respawnDelayMinutes, occupants, drops, conditions, events, meta);
    }
}
