package com.paradoxbh.gameplannerserver.content.store;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.Geometries;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.ContentQuery;
import com.paradoxbh.gameplannerserver.content.model.Drop;
import com.paradoxbh.gameplannerserver.content.model.Occupant;
import com.paradoxbh.gameplannerserver.content.model.Reference;
import com.paradoxbh.gameplannerserver.content.model.SpawnPointDocument;
import com.paradoxbh.gameplannerserver.content.store.ChildRows.Table;

@Component
public class SpawnPointHandler extends AbstractContentHandler<SpawnPointDocument, SpawnPointHandler.Parts> {

    private static final Table OCCUPANTS = Table.of("spawn_occupant", "spawn_ext_id");

    /** A mesma tabela guarda os drops de entidade; aqui, só os de ponto de spawn. */
    private static final Table DROPS = new Table("drop_entry", "source_ext_id", Map.of("source_kind", "spawn_point"));

    /** Ocupantes e drops de uma página de pontos, por ext_id. */
    record Parts(Map<String, List<Occupant>> occupants, Map<String, List<Drop>> drops) {
    }

    /**
     * Ponto num mapa, compacto para desenhar muitos de uma vez. {@code iconMediaId} é o ícone de exibição do
     * ponto; {@code respawnDelayMinutes}, o do ponto ou, sem ele, o do primeiro ocupante que tem.
     */
    public record Marker(String extId, String name, String position, String location, String respawnMode,
                         Integer respawnDelayMinutes, String iconMediaId, List<MarkerOccupant> occupants,
                         List<String> events) {
    }

    /**
     * Ocupante com nome, ícone e categorias já resolvidos; nome e ícone nulos quando o alvo não está
     * cadastrado. {@code respawnDelayMinutes} é o da entidade.
     */
    public record MarkerOccupant(String kind, String extId, String name, String iconMediaId, BigDecimal chance,
                                 List<String> categories, Integer respawnDelayMinutes) {
    }

    /** {@code truncated} diz se ficou ponto de fora por causa do limite. */
    public record Markers(List<Marker> content, long total, boolean truncated) {
    }

    private final ChildRows children;

    public SpawnPointHandler(JdbcClient jdbc, ContentTagsRepository tags, ChildRows children) {
        super(jdbc, tags);
        this.children = children;
    }

    @Override
    public ContentKind kind() {
        return ContentKind.SPAWN_POINT;
    }

    @Override
    public Class<SpawnPointDocument> documentType() {
        return SpawnPointDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("map_ext_id", "location_ext_id", "position", "respawn_mode", "respawn_delay_minutes");
    }

    @Override
    protected List<Object> specificValues(SpawnPointDocument point) {
        return Arrays.asList(point.map(), point.location(), Geometries.toWkb(point.position()), point.respawnMode(),
                point.respawnDelayMinutes());
    }

    @Override
    protected String writeValue(String column, String param) {
        return column.equals("position") ? "ST_GeomFromEWKB(" + param + ")" : param;
    }

    @Override
    protected String readValue(String column) {
        return column.equals("position") ? "ST_AsEWKB(t.position) AS position" : super.readValue(column);
    }

    @Override
    protected SpawnPointDocument map(Map<String, Object> row, ContentTags tags, Parts parts, ContentMeta meta) {
        String id = Rows.string(row, "ext_id");
        return new SpawnPointDocument(
                id,
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                Rows.string(row, "map_ext_id"),
                Rows.string(row, "location_ext_id"),
                Geometries.fromWkb(row.get("position")),
                Rows.string(row, "respawn_mode"),
                Rows.integer(row, "respawn_delay_minutes"),
                parts.occupants().getOrDefault(id, List.of()),
                parts.drops().getOrDefault(id, List.of()),
                tags.events(),
                meta);
    }

    /** Ponto de spawn tem eventos (clima, temporada) e imagens; não tem categorias nem atributos. */
    @Override
    public ContentTags tagsOf(SpawnPointDocument point) {
        return new ContentTags(List.of(), point.events(), Map.of(), point.media());
    }

    @Override
    protected Parts loadChildren(String gameId, List<String> extIds) {
        return new Parts(
                children.load(OCCUPANTS, gameId, extIds, SpawnPointHandler::occupant),
                children.load(DROPS, gameId, extIds, ChildMappers::drop));
    }

    @Override
    protected void replaceChildren(String gameId, SpawnPointDocument point) {
        children.replace(OCCUPANTS, gameId, point.extId(),
                point.occupants().stream().map(SpawnPointHandler::occupantRow).toList());
        children.replace(DROPS, gameId, point.extId(), point.drops().stream().map(ChildMappers::dropRow).toList());
    }

    @Override
    protected void deleteChildren(String gameId, String extId) {
        children.delete(OCCUPANTS, gameId, extId);
        children.delete(DROPS, gameId, extId);
    }

    /**
     * map e location são códigos (location também pega os pontos dentro da área do local);
     * occupant e drops aceitam "tipo:id" ou "id"; yields também, e soma aos drops do ponto os das
     * entidades que aparecem nele; occupantCategory é a categoria do ocupante;
     * bbox é "minX,minY,maxX,maxY" em coordenadas de jogo.
     */
    @Override
    protected Map<String, Filter> specificFilters() {
        return Map.of(
                "map", codeColumn("t.map_ext_id"),
                "location", inLocation(),
                "occupant", childReference("spawn_occupant", "spawn_ext_id", null),
                "drops", childReference("drop_entry", "source_ext_id", "x.source_kind = 'spawn_point'"),
                "yields", yields(),
                "occupantCategory", occupantCategory(),
                "bbox", bbox());
    }

    /** O ponto rende o alvo: drop do próprio ponto ou drop de uma entidade que aparece nele. */
    private static Filter yields() {
        return (name, value, param, params) -> {
            Reference target = Reference.parse(value, name);
            params.put(param, target.extId());
            String kind = "";
            if (target.kind() != null) {
                params.put(param + "Kind", target.kind());
                kind = " AND (d.target_kind IS NULL OR d.target_kind = :" + param + "Kind)";
            }
            return "(EXISTS (SELECT 1 FROM drop_entry d WHERE d.game_id = t.game_id AND d.source_kind = 'spawn_point'"
                    + " AND d.source_ext_id = t.ext_id AND d.target_ext_id = :" + param + kind + ")"
                    + " OR EXISTS (SELECT 1 FROM spawn_occupant o JOIN drop_entry d ON d.game_id = o.game_id"
                    + " AND d.source_kind = 'entity' AND d.source_ext_id = o.target_ext_id"
                    + " WHERE o.game_id = t.game_id AND o.spawn_ext_id = t.ext_id"
                    + " AND (o.target_kind IS NULL OR o.target_kind = 'entity')"
                    + " AND d.target_ext_id = :" + param + kind + "))";
        };
    }

    /** Sem nome próprio, vale o nome de exibição de content_ref: o do primeiro ocupante cadastrado. */
    @Override
    protected String nameExpression() {
        return "(SELECT c.name FROM content_ref c WHERE c.game_id = t.game_id AND c.kind = 'spawn_point'"
                + " AND c.ext_id = t.ext_id)";
    }

    /**
     * Pontos com posição num mapa, no formato compacto do desenho: sem página, até {@code limit},
     * com os mesmos filtros da listagem.
     */
    public Markers markers(String gameId, String mapId, ContentQuery query, int limit) {
        Map<String, Object> params = new HashMap<>();
        String where = where(gameId, query, params) + " AND t.map_ext_id = :markerMap AND t.position IS NOT NULL";
        params.put("markerMap", mapId);

        long total = jdbc.sql("SELECT count(*) FROM spawn_point t" + where).params(params).query(Long.class).single();

        params.put("limit", limit);
        List<Map<String, Object>> rows = jdbc.sql("SELECT t.ext_id, t.name, ST_AsEWKB(t.position) AS position,"
                        + " t.location_ext_id, t.respawn_mode, t.respawn_delay_minutes,"
                        + " (SELECT c.icon_media_id FROM content_ref c WHERE c.game_id = t.game_id"
                        + " AND c.kind = 'spawn_point' AND c.ext_id = t.ext_id) AS icon_media_id"
                        + " FROM spawn_point t" + where
                        + " ORDER BY t.ext_id LIMIT :limit")
                .params(params)
                .query().listOfRows();
        if (rows.isEmpty()) {
            return new Markers(List.of(), total, false);
        }
        List<String> ids = rows.stream().map(row -> Rows.string(row, "ext_id")).toList();

        Map<String, List<MarkerOccupant>> occupants = new HashMap<>();
        jdbc.sql("""
                SELECT o.spawn_ext_id, o.target_kind, o.target_ext_id, o.chance, r.name, r.icon_media_id,
                       ARRAY(SELECT DISTINCT cc.category_ext_id FROM content_category cc
                             WHERE cc.game_id = o.game_id AND cc.ext_id = o.target_ext_id
                               AND (o.target_kind IS NULL OR cc.kind = o.target_kind)
                             ORDER BY cc.category_ext_id) AS categories,
                       (SELECT e.respawn_delay_minutes FROM entity e
                         WHERE e.game_id = o.game_id AND e.ext_id = o.target_ext_id
                           AND (o.target_kind IS NULL OR o.target_kind = 'entity')) AS respawn_delay_minutes
                FROM spawn_occupant o
                LEFT JOIN LATERAL (
                    SELECT c.name, c.icon_media_id FROM content_ref c
                    WHERE c.game_id = o.game_id AND c.ext_id = o.target_ext_id
                      AND (o.target_kind IS NULL OR c.kind = o.target_kind)
                    ORDER BY c.kind
                    LIMIT 1) r ON true
                WHERE o.game_id = :game AND o.spawn_ext_id IN (:ids)
                ORDER BY o.spawn_ext_id, o.ordinal
                """)
                .param("game", gameId).param("ids", ids)
                .query(rs -> {
                    occupants.computeIfAbsent(rs.getString("spawn_ext_id"), key -> new ArrayList<>())
                            .add(new MarkerOccupant(rs.getString("target_kind"), rs.getString("target_ext_id"),
                                    rs.getString("name"), rs.getString("icon_media_id"), rs.getBigDecimal("chance"),
                                    List.of((String[]) rs.getArray("categories").getArray()),
                                    (Integer) rs.getObject("respawn_delay_minutes")));
                });

        Map<String, List<String>> events = new HashMap<>();
        jdbc.sql("""
                SELECT ext_id, event_ext_id FROM content_event
                WHERE game_id = :game AND kind = :kind AND ext_id IN (:ids)
                ORDER BY ext_id, event_ext_id
                """)
                .param("game", gameId).param("kind", kind().code()).param("ids", ids)
                .query(rs -> {
                    events.computeIfAbsent(rs.getString("ext_id"), key -> new ArrayList<>())
                            .add(rs.getString("event_ext_id"));
                });

        List<Marker> content = rows.stream().map(row -> {
            String id = Rows.string(row, "ext_id");
            List<MarkerOccupant> own = occupants.getOrDefault(id, List.of());
            Integer delay = Rows.integer(row, "respawn_delay_minutes");
            if (delay == null) {
                delay = own.stream().map(MarkerOccupant::respawnDelayMinutes).filter(Objects::nonNull).findFirst()
                        .orElse(null);
            }
            return new Marker(id, Rows.string(row, "name"), Geometries.fromWkb(row.get("position")),
                    Rows.string(row, "location_ext_id"), Rows.string(row, "respawn_mode"), delay,
                    Rows.string(row, "icon_media_id"), own, events.getOrDefault(id, List.of()));
        }).toList();
        return new Markers(content, total, total > content.size());
    }

    /** Ligado ao local pelo código, ou com posição dentro da área dele (no mesmo mapa, quando os dois dizem). */
    private static Filter inLocation() {
        return (name, value, param, params) -> {
            params.put(param, ExtIds.require(value, name));
            return "(t.location_ext_id = :" + param + " OR EXISTS (SELECT 1 FROM location l"
                    + " WHERE l.game_id = t.game_id AND l.ext_id = :" + param
                    + " AND l.area IS NOT NULL AND t.position IS NOT NULL"
                    + " AND (l.map_ext_id IS NULL OR t.map_ext_id IS NULL OR l.map_ext_id = t.map_ext_id)"
                    + " AND ST_Within(t.position, l.area)))";
        };
    }

    /** Algum ocupante tem a categoria. Ocupante sem tipo casa com conteúdo de qualquer tipo. */
    private static Filter occupantCategory() {
        return (name, value, param, params) -> {
            params.put(param, ExtIds.require(value, name));
            return "EXISTS (SELECT 1 FROM spawn_occupant x JOIN content_category c ON c.game_id = x.game_id"
                    + " AND c.ext_id = x.target_ext_id AND (x.target_kind IS NULL OR c.kind = x.target_kind)"
                    + " WHERE x.game_id = t.game_id AND x.spawn_ext_id = t.ext_id AND c.category_ext_id = :" + param + ")";
        };
    }

    private static Filter bbox() {
        return (name, value, param, params) -> {
            String[] parts = value.split(",");
            if (parts.length != 4) {
                throw ApiException.badRequest(name + " precisa ser minX,minY,maxX,maxY");
            }
            double[] numbers = new double[4];
            for (int i = 0; i < 4; i++) {
                try {
                    numbers[i] = Double.parseDouble(parts[i].strip());
                } catch (NumberFormatException ex) {
                    throw ApiException.badRequest(name + " precisa ser minX,minY,maxX,maxY, com números");
                }
                if (!Double.isFinite(numbers[i])) {
                    throw ApiException.badRequest(name + " precisa ser minX,minY,maxX,maxY, com números");
                }
            }
            if (numbers[0] > numbers[2] || numbers[1] > numbers[3]) {
                throw ApiException.badRequest(name + ": o mínimo não pode passar do máximo");
            }
            for (int i = 0; i < 4; i++) {
                params.put(param + i, numbers[i]);
            }
            return "(t.position IS NOT NULL AND t.position && ST_MakeEnvelope(:" + param + "0, :" + param + "1, :"
                    + param + "2, :" + param + "3, 0))";
        };
    }

    private static Map<String, Object> occupantRow(Occupant occupant) {
        return ChildRows.row(
                "target_kind", occupant.target().kind(),
                "target_ext_id", occupant.target().extId(),
                "chance", occupant.chance(),
                "amount", occupant.amount(),
                "max_amount", occupant.maxAmount());
    }

    private static Occupant occupant(Map<String, Object> row) {
        return new Occupant(Rows.reference(row, "target_kind", "target_ext_id"), Rows.decimal(row, "chance"),
                Rows.decimal(row, "amount"), Rows.decimal(row, "max_amount"));
    }
}
