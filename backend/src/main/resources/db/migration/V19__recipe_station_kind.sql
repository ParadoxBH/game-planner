-- Bancada de receita pode ser um item: no Valheim o martelo, a enxada, o cultivador e a bandeja
-- sao ferramentas que se segura para construir/preparar, e fazem o papel de bancada. Ate aqui
-- station_ext_id era sempre entidade, e os dataminers gravavam a ferramenta como desbloqueio
-- ("tool"). station_kind diz de que tipo e o codigo; o que ja existe continua entidade.

ALTER TABLE recipe_station ADD COLUMN station_kind text NOT NULL DEFAULT 'entity';
ALTER TABLE recipe_station ADD CONSTRAINT recipe_station_kind_known
    CHECK (station_kind IN ('entity', 'item'));

DROP INDEX recipe_station_by_station;
CREATE INDEX recipe_station_by_station ON recipe_station (game_id, station_kind, station_ext_id);

-- Desbloqueio "tool" apontando para item vira bancada, na frente das bancadas que a receita ja
-- tinha (a ferramenta e o que se usa; a bancada por perto e exigencia dela). Duas passadas pelo
-- negativo para abrir espaco sem colidir com a chave primaria no meio do UPDATE.
CREATE TEMPORARY TABLE tool_station ON COMMIT DROP AS
    SELECT game_id, recipe_ext_id, target_ext_id,
           row_number() OVER (PARTITION BY game_id, recipe_ext_id ORDER BY ordinal) - 1 AS position
      FROM recipe_unlock
     WHERE unlock_type = 'tool' AND target_kind = 'item' AND target_ext_id IS NOT NULL;

UPDATE recipe_station s SET ordinal = -s.ordinal - 1
  FROM (SELECT DISTINCT game_id, recipe_ext_id FROM tool_station) t
 WHERE s.game_id = t.game_id AND s.recipe_ext_id = t.recipe_ext_id;

UPDATE recipe_station s SET ordinal = -s.ordinal - 1 + t.tools
  FROM (SELECT game_id, recipe_ext_id, count(*) AS tools FROM tool_station GROUP BY game_id, recipe_ext_id) t
 WHERE s.game_id = t.game_id AND s.recipe_ext_id = t.recipe_ext_id AND s.ordinal < 0;

INSERT INTO recipe_station (game_id, recipe_ext_id, ordinal, station_ext_id, station_kind)
SELECT game_id, recipe_ext_id, position, target_ext_id, 'item' FROM tool_station;

DELETE FROM recipe_unlock
 WHERE unlock_type = 'tool' AND target_kind = 'item' AND target_ext_id IS NOT NULL;

-- Mesma view de V18, com o tipo da bancada vindo da coluna nova.
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
    SELECT game_id, 'recipe', recipe_ext_id, 'stations', station_kind, station_ext_id
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
      FROM redemption_reward
    UNION ALL
    SELECT game_id, 'spawn_point', spawn_ext_id, 'conditions', target_kind, target_ext_id
      FROM spawn_condition WHERE target_ext_id IS NOT NULL;
