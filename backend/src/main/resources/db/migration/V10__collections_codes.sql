-- Colecoes e codigos de resgate. Ver doc/backend_plan.md 4.3 e Fase 5.
--
-- Mesmas regras de sempre: nenhuma FK entre conteudos, referencia textual, linha-filha
-- posicional.

-- ================================ Colecao ================================

CREATE TABLE collection (
    game_id     text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id      text        NOT NULL,
    name        text        NOT NULL,
    summary     text,
    description text,
    created_by  text        NOT NULL,
    updated_by  text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT collection_ext_id_valid CHECK (is_valid_ext_id(ext_id))
);

-- Grupo de colecao: tem codigo proprio e pode estar em mais de uma colecao.
CREATE TABLE collection_group (
    game_id     text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id      text        NOT NULL,
    name        text        NOT NULL,
    summary     text,
    description text,
    created_by  text        NOT NULL,
    updated_by  text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT collection_group_ext_id_valid CHECK (is_valid_ext_id(ext_id))
);

CREATE TABLE collection_group_collection (
    game_id           text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    group_ext_id      text NOT NULL,
    ordinal           int  NOT NULL,
    collection_ext_id text NOT NULL,

    PRIMARY KEY (game_id, group_ext_id, ordinal)
);
CREATE INDEX collection_group_collection_by_collection ON collection_group_collection (game_id, collection_ext_id);

-- Membros do grupo: item, entidade ou o que for, na ordem de exibicao.
CREATE TABLE collection_group_member (
    game_id       text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    group_ext_id  text NOT NULL,
    ordinal       int  NOT NULL,
    target_kind   text,
    target_ext_id text NOT NULL,

    PRIMARY KEY (game_id, group_ext_id, ordinal)
);
CREATE INDEX collection_group_member_by_target ON collection_group_member (game_id, target_ext_id);

-- ============================ Codigo de resgate ============================

-- ext_id e o proprio codigo, como o jogador digita. Nome opcional: sem ele, vale o codigo.
CREATE TABLE redemption_code (
    game_id     text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id      text        NOT NULL,
    name        text,
    summary     text,
    description text,
    added_on    date,
    expires_on  date,
    created_by  text        NOT NULL,
    updated_by  text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT redemption_code_ext_id_valid CHECK (is_valid_ext_id(ext_id)),
    CONSTRAINT redemption_code_dates_order CHECK (added_on IS NULL OR expires_on IS NULL OR expires_on >= added_on)
);
CREATE INDEX redemption_code_by_expiry ON redemption_code (game_id, expires_on);

CREATE TABLE redemption_reward (
    game_id       text    NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    code_ext_id   text    NOT NULL,
    ordinal       int     NOT NULL,
    target_kind   text,
    target_ext_id text    NOT NULL,
    amount        numeric NOT NULL,

    PRIMARY KEY (game_id, code_ext_id, ordinal),
    CONSTRAINT redemption_reward_amount_positive CHECK (amount > 0)
);
CREATE INDEX redemption_reward_by_target ON redemption_reward (game_id, target_ext_id);

-- ================================= Views =================================

-- Receita e ponto de spawn sem nome sao exibidos pelo nome do primeiro produto ou ocupante
-- cadastrado; codigo de resgate sem nome, pelo proprio codigo.
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
            UNION ALL SELECT game_id, 'collection', ext_id, name FROM collection
            UNION ALL SELECT game_id, 'collection_group', ext_id, name FROM collection_group
            UNION ALL SELECT game_id, 'redemption_code', ext_id, coalesce(name, ext_id) FROM redemption_code
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

-- Toda referencia textual entre conteudos: as de V4, V7, V9 e as desta fase.
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
      FROM game_map_list WHERE list = 'default_entity'
    UNION ALL
    SELECT game_id, 'collection_group', group_ext_id, 'collections', 'collection', collection_ext_id
      FROM collection_group_collection
    UNION ALL
    SELECT game_id, 'collection_group', group_ext_id, 'members', target_kind, target_ext_id
      FROM collection_group_member
    UNION ALL
    SELECT game_id, 'redemption_code', code_ext_id, 'rewards', target_kind, target_ext_id
      FROM redemption_reward;
