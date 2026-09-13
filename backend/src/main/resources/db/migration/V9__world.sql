-- Mundo: mapas, locais e pontos de spawn. Ver doc/backend_plan.md 3.2, 4.3 e Fase 4.
--
-- Mesmas regras de V4 e V7: nenhuma FK entre conteudos, referencia textual, linha-filha
-- posicional. Geometria em coordenadas de jogo (SRID 0), com ou sem Z; na API ela e WKT.
-- A coluna e geometry sem tipo fixo porque o mesmo mapa mistura pontos 2D e 3D (Outward).

-- ================================== Mapa ==================================

CREATE TABLE game_map (
    game_id       text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id        text        NOT NULL,
    name          text        NOT NULL,
    summary       text,
    description   text,
    map_type      text        NOT NULL DEFAULT 'single',
    -- Caminho ou URL da imagem. Nao passa pelo pipeline de midia, que reduz a 1920 px.
    image_url     text,
    -- Camadas ou tiles: padrao com {layer}, {z}, {x}, {y}.
    url_pattern   text,
    layers        int,
    -- Retangulo em coordenadas de jogo.
    bounds_min_x  numeric,
    bounds_min_y  numeric,
    bounds_max_x  numeric,
    bounds_max_y  numeric,
    min_zoom      int,
    max_zoom      int,
    -- Faixa de tiles no zoom tile_z.
    tile_z        int,
    tile_min_x    numeric,
    tile_min_y    numeric,
    tile_max_x    numeric,
    tile_max_y    numeric,
    tile_min_zoom int,
    tile_max_zoom int,
    grid_size     numeric,
    -- Quartos de volta do norte do mapa em relacao as coordenadas do jogo.
    rotate        int,
    default_view  text,
    created_by    text        NOT NULL,
    updated_by    text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT game_map_ext_id_valid CHECK (is_valid_ext_id(ext_id)),
    CONSTRAINT game_map_type_values CHECK (map_type IN ('single', 'layered', 'tile', 'procedural')),
    CONSTRAINT game_map_layers_positive CHECK (layers IS NULL OR layers > 0),
    CONSTRAINT game_map_bounds_complete CHECK (num_nulls(bounds_min_x, bounds_min_y, bounds_max_x, bounds_max_y) IN (0, 4)),
    CONSTRAINT game_map_bounds_order CHECK (bounds_min_x <= bounds_max_x AND bounds_min_y <= bounds_max_y),
    CONSTRAINT game_map_tiles_complete CHECK (num_nulls(tile_z, tile_min_x, tile_min_y, tile_max_x, tile_max_y) IN (0, 5)),
    CONSTRAINT game_map_rotate_range CHECK (rotate IS NULL OR rotate BETWEEN 0 AND 3)
);

-- Listas de codigos do mapa: views disponiveis, filtros ligados ao abrir e climas (eventos).
CREATE TABLE game_map_list (
    game_id    text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    map_ext_id text NOT NULL,
    list       text NOT NULL,
    ordinal    int  NOT NULL,
    value      text NOT NULL,

    PRIMARY KEY (game_id, map_ext_id, list, ordinal),
    CONSTRAINT game_map_list_values
        CHECK (list IN ('view', 'default_type', 'default_category', 'default_entity', 'weather'))
);

-- ================================== Local ==================================

-- Bioma, regiao, POI, dungeon. area e poligono para regiao, ponto para POI, e pode faltar
-- (bioma de mundo procedural).
CREATE TABLE location (
    game_id       text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id        text        NOT NULL,
    name          text        NOT NULL,
    summary       text,
    description   text,
    location_type text        NOT NULL DEFAULT 'region',
    parent_ext_id text,
    map_ext_id    text,
    area          geometry,
    created_by    text        NOT NULL,
    updated_by    text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT location_ext_id_valid CHECK (is_valid_ext_id(ext_id)),
    CONSTRAINT location_not_its_own_parent CHECK (parent_ext_id IS NULL OR parent_ext_id <> ext_id),
    CONSTRAINT location_area_kind
        CHECK (area IS NULL OR (GeometryType(area) IN ('POLYGON', 'MULTIPOLYGON', 'POINT') AND ST_SRID(area) = 0))
);
CREATE INDEX location_by_area ON location USING gist (area);
CREATE INDEX location_by_parent ON location (game_id, parent_ext_id);
CREATE INDEX location_by_map ON location (game_id, map_ext_id);

-- ============================== Ponto de spawn ==============================

-- Onde algo aparece. Sem posicao, o ponto vale para o local inteiro (minerio num bioma).
-- Nome opcional: sem ele, a exibicao usa o nome do primeiro ocupante (content_ref).
CREATE TABLE spawn_point (
    game_id               text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id                text        NOT NULL,
    name                  text,
    summary               text,
    description           text,
    map_ext_id            text,
    location_ext_id       text,
    position              geometry,
    respawn_mode          text,
    respawn_delay_minutes int,
    created_by            text        NOT NULL,
    updated_by            text        NOT NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT spawn_point_ext_id_valid CHECK (is_valid_ext_id(ext_id)),
    CONSTRAINT spawn_point_position_is_point
        CHECK (position IS NULL OR (GeometryType(position) = 'POINT' AND ST_SRID(position) = 0)),
    CONSTRAINT spawn_point_position_or_location CHECK (position IS NOT NULL OR location_ext_id IS NOT NULL),
    CONSTRAINT spawn_point_respawn_delay_not_negative CHECK (respawn_delay_minutes IS NULL OR respawn_delay_minutes >= 0)
);
CREATE INDEX spawn_point_by_position ON spawn_point USING gist (position);
CREATE INDEX spawn_point_by_map ON spawn_point (game_id, map_ext_id);
CREATE INDEX spawn_point_by_location ON spawn_point (game_id, location_ext_id);

-- O que pode aparecer no ponto, cada um com a propria chance. Quantidade opcional: a origem
-- nem sempre sabe. Os drops proprios do ponto (baus, coletaveis) ficam em drop_entry.
CREATE TABLE spawn_occupant (
    game_id       text    NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    spawn_ext_id  text    NOT NULL,
    ordinal       int     NOT NULL,
    target_kind   text,
    target_ext_id text    NOT NULL,
    chance        numeric,
    amount        numeric,
    max_amount    numeric,

    PRIMARY KEY (game_id, spawn_ext_id, ordinal),
    CONSTRAINT spawn_occupant_chance_range CHECK (chance IS NULL OR chance BETWEEN 0 AND 1),
    CONSTRAINT spawn_occupant_amount_positive CHECK (amount IS NULL OR amount > 0),
    CONSTRAINT spawn_occupant_amount_order CHECK (max_amount IS NULL OR amount IS NULL OR max_amount >= amount)
);
CREATE INDEX spawn_occupant_by_target ON spawn_occupant (game_id, target_ext_id);

-- ================================= Views =================================

-- Receita e ponto de spawn sem nome sao exibidos pelo nome do primeiro produto ou ocupante
-- cadastrado; na falta dele, pelo codigo.
CREATE OR REPLACE VIEW content_ref AS
    SELECT c.game_id, c.kind, c.ext_id, c.name,
           (SELECT m.media_id FROM content_media m
             WHERE m.game_id = c.game_id AND m.kind = c.kind AND m.ext_id = c.ext_id AND m.usage = 'icon'
             ORDER BY m.added_at DESC, m.ordinal
             LIMIT 1) AS icon_media_id
      FROM (
            SELECT game_id, 'item'::text AS kind, ext_id, name FROM item
            UNION ALL SELECT game_id, 'entity', ext_id, name FROM entity
            UNION ALL SELECT game_id, 'category', ext_id, name FROM category
            UNION ALL SELECT game_id, 'event', ext_id, name FROM game_event
            UNION ALL SELECT game_id, 'shop', ext_id, name FROM shop
            UNION ALL SELECT game_id, 'shop_category', ext_id, name FROM shop_category
            UNION ALL SELECT game_id, 'map', ext_id, name FROM game_map
            UNION ALL SELECT game_id, 'location', ext_id, name FROM location
            UNION ALL
            SELECT r.game_id, 'recipe', r.ext_id,
                   coalesce(r.name,
                            (SELECT p.name
                               FROM recipe_output o
                               JOIN (SELECT game_id, 'item'::text AS kind, ext_id, name FROM item
                                     UNION ALL SELECT game_id, 'entity', ext_id, name FROM entity
                                     UNION ALL SELECT game_id, 'category', ext_id, name FROM category) p
                                 ON p.game_id = o.game_id AND p.ext_id = o.target_ext_id
                                AND (o.target_kind IS NULL OR o.target_kind = p.kind)
                              WHERE o.game_id = r.game_id AND o.recipe_ext_id = r.ext_id
                              ORDER BY o.ordinal, p.kind
                              LIMIT 1),
                            r.ext_id)
              FROM recipe r
            UNION ALL
            SELECT s.game_id, 'spawn_point', s.ext_id,
                   coalesce(s.name,
                            (SELECT p.name
                               FROM spawn_occupant o
                               JOIN (SELECT game_id, 'item'::text AS kind, ext_id, name FROM item
                                     UNION ALL SELECT game_id, 'entity', ext_id, name FROM entity) p
                                 ON p.game_id = o.game_id AND p.ext_id = o.target_ext_id
                                AND (o.target_kind IS NULL OR o.target_kind = p.kind)
                              WHERE o.game_id = s.game_id AND o.spawn_ext_id = s.ext_id
                              ORDER BY o.ordinal, p.kind
                              LIMIT 1),
                            s.ext_id)
              FROM spawn_point s
           ) c;

-- Toda referencia textual entre conteudos: as de V4, V7 e as desta fase.
CREATE OR REPLACE VIEW content_reference AS
    SELECT game_id, kind AS source_kind, ext_id AS source_ext_id, 'categories'::text AS field,
           'category'::text AS target_kind, category_ext_id AS target_ext_id
      FROM content_category
    UNION ALL
    SELECT game_id, kind, ext_id, 'events', 'event', event_ext_id
      FROM content_event
    UNION ALL
    SELECT game_id, 'item', ext_id, 'variantOf', 'item', variant_of_ext_id
      FROM item WHERE variant_of_ext_id IS NOT NULL
    UNION ALL
    SELECT game_id, 'entity', ext_id, 'variantOf', 'entity', variant_of_ext_id
      FROM entity WHERE variant_of_ext_id IS NOT NULL
    UNION ALL
    SELECT game_id, 'item', ext_id, 'currency', currency_kind, currency_ext_id
      FROM item WHERE currency_ext_id IS NOT NULL
    UNION ALL
    SELECT game_id, 'recipe', recipe_ext_id, 'inputs', target_kind, target_ext_id
      FROM recipe_input
    UNION ALL
    SELECT game_id, 'recipe', recipe_ext_id, 'outputs', target_kind, target_ext_id
      FROM recipe_output
    UNION ALL
    SELECT game_id, 'recipe', recipe_ext_id, 'stations', 'entity', station_ext_id
      FROM recipe_station
    UNION ALL
    SELECT game_id, 'recipe', recipe_ext_id, 'unlock', target_kind, target_ext_id
      FROM recipe_unlock WHERE target_ext_id IS NOT NULL
    UNION ALL
    SELECT game_id, 'entity', entity_ext_id, 'requirements', target_kind, target_ext_id
      FROM entity_requirement
    UNION ALL
    SELECT game_id, source_kind, source_ext_id, 'drops', target_kind, target_ext_id
      FROM drop_entry
    UNION ALL
    SELECT game_id, 'shop', ext_id, 'npc', 'entity', npc_ext_id
      FROM shop WHERE npc_ext_id IS NOT NULL
    UNION ALL
    SELECT game_id, 'shop_category', ext_id, 'shop', 'shop', shop_ext_id
      FROM shop_category WHERE shop_ext_id IS NOT NULL
    UNION ALL
    SELECT game_id, 'shop_category', category_ext_id, 'items', target_kind, target_ext_id
      FROM shop_category_item
    UNION ALL
    SELECT game_id, 'shop_category', category_ext_id, 'items.currency', currency_kind, currency_ext_id
      FROM shop_category_item WHERE currency_ext_id IS NOT NULL
    UNION ALL
    SELECT game_id, 'location', ext_id, 'parent', 'location', parent_ext_id
      FROM location WHERE parent_ext_id IS NOT NULL
    UNION ALL
    SELECT game_id, 'location', ext_id, 'map', 'map', map_ext_id
      FROM location WHERE map_ext_id IS NOT NULL
    UNION ALL
    SELECT game_id, 'spawn_point', ext_id, 'map', 'map', map_ext_id
      FROM spawn_point WHERE map_ext_id IS NOT NULL
    UNION ALL
    SELECT game_id, 'spawn_point', ext_id, 'location', 'location', location_ext_id
      FROM spawn_point WHERE location_ext_id IS NOT NULL
    UNION ALL
    SELECT game_id, 'spawn_point', spawn_ext_id, 'occupants', target_kind, target_ext_id
      FROM spawn_occupant
    UNION ALL
    SELECT game_id, 'map', map_ext_id, 'weathers', 'event', value
      FROM game_map_list WHERE list = 'weather'
    UNION ALL
    SELECT game_id, 'map', map_ext_id, 'defaultFilters.categories', 'category', value
      FROM game_map_list WHERE list = 'default_category'
    UNION ALL
    SELECT game_id, 'map', map_ext_id, 'defaultFilters.entities', 'entity', value
      FROM game_map_list WHERE list = 'default_entity';
