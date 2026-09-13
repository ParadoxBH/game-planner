-- Crafting e economia. Ver doc/backend_plan.md 3.7, 4.3 e Fase 3.
--
-- Mesmas regras do nucleo (V4): nenhuma FK entre conteudos, referencia textual
-- (target_kind nulo = a origem nao diz o tipo, e casa com qualquer tipo) e unica FK para game.
--
-- Linha-filha tem chave posicional (pai, ordinal), porque o mesmo alvo se repete por
-- mecanica de jogo: quatro slots com o mesmo ingrediente, dois drops do mesmo item com
-- chances diferentes, o mesmo item vendido em pacotes de tamanhos diferentes.

-- ================================ Receita ================================

CREATE TABLE recipe (
    game_id            text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id             text        NOT NULL,
    -- Opcional: sem nome, a exibicao e a busca usam o nome do primeiro produto (content_ref).
    name               text,
    summary            text,
    description        text,
    craft_time_seconds int,
    created_by         text        NOT NULL,
    updated_by         text        NOT NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT recipe_ext_id_valid CHECK (is_valid_ext_id(ext_id)),
    CONSTRAINT recipe_craft_time_not_negative CHECK (craft_time_seconds IS NULL OR craft_time_seconds >= 0)
);

-- Ingredientes. Nos jogos baseados em slot (Outward, Minecraft), cada linha e um slot.
-- consumed = false para o que e exigido mas nao gasto.
CREATE TABLE recipe_input (
    game_id       text    NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    recipe_ext_id text    NOT NULL,
    ordinal       int     NOT NULL,
    target_kind   text,
    target_ext_id text    NOT NULL,
    amount        numeric NOT NULL,
    consumed      boolean NOT NULL DEFAULT true,

    PRIMARY KEY (game_id, recipe_ext_id, ordinal),
    CONSTRAINT recipe_input_amount_positive CHECK (amount > 0)
);
CREATE INDEX recipe_input_by_target ON recipe_input (game_id, target_ext_id);

-- Produtos. chance de 0 a 1 quando o produto nao sai sempre; level quando sai num nivel.
CREATE TABLE recipe_output (
    game_id       text    NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    recipe_ext_id text    NOT NULL,
    ordinal       int     NOT NULL,
    target_kind   text,
    target_ext_id text    NOT NULL,
    amount        numeric NOT NULL,
    chance        numeric,
    level         int,

    PRIMARY KEY (game_id, recipe_ext_id, ordinal),
    CONSTRAINT recipe_output_amount_positive CHECK (amount > 0),
    CONSTRAINT recipe_output_chance_range CHECK (chance IS NULL OR chance BETWEEN 0 AND 1)
);
CREATE INDEX recipe_output_by_target ON recipe_output (game_id, target_ext_id);

-- Bancadas onde a receita e feita. Bancada e entidade.
CREATE TABLE recipe_station (
    game_id        text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    recipe_ext_id  text NOT NULL,
    ordinal        int  NOT NULL,
    station_ext_id text NOT NULL,

    PRIMARY KEY (game_id, recipe_ext_id, ordinal)
);
CREATE INDEX recipe_station_by_station ON recipe_station (game_id, station_ext_id);

-- Requisitos para desbloquear: evento ativo, quest concluida, nivel de bancada...
-- unlock_type e codigo aberto. target aponta para o conteudo envolvido (o evento, o NPC da
-- quest); value guarda o que nao e conteudo (o nome da quest, o nivel). Ao menos um dos dois.
CREATE TABLE recipe_unlock (
    game_id       text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    recipe_ext_id text NOT NULL,
    ordinal       int  NOT NULL,
    unlock_type   text NOT NULL,
    target_kind   text,
    target_ext_id text,
    value         text,

    PRIMARY KEY (game_id, recipe_ext_id, ordinal),
    CONSTRAINT recipe_unlock_has_target_or_value CHECK (target_ext_id IS NOT NULL OR value IS NOT NULL),
    CONSTRAINT recipe_unlock_kind_needs_target CHECK (target_kind IS NULL OR target_ext_id IS NOT NULL)
);

-- ================================ Entidade ================================

-- O que a entidade exige para ser coletada ou derrotada: energia (gasta), machado (nao gasta).
CREATE TABLE entity_requirement (
    game_id       text    NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    entity_ext_id text    NOT NULL,
    ordinal       int     NOT NULL,
    target_kind   text,
    target_ext_id text    NOT NULL,
    amount        numeric NOT NULL,
    consumed      boolean NOT NULL DEFAULT true,

    PRIMARY KEY (game_id, entity_ext_id, ordinal),
    CONSTRAINT entity_requirement_amount_positive CHECK (amount > 0)
);
CREATE INDEX entity_requirement_by_target ON entity_requirement (game_id, target_ext_id);

-- Tabela de drop: uma lista com chance por entrada, e o mesmo alvo pode aparecer em mais de
-- uma. Uma tabela so para toda origem: entity agora, spawn_point na Fase 4.
-- A quantidade vai de amount ate max_amount, quando varia.
CREATE TABLE drop_entry (
    game_id       text    NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    source_kind   text    NOT NULL,
    source_ext_id text    NOT NULL,
    ordinal       int     NOT NULL,
    target_kind   text,
    target_ext_id text    NOT NULL,
    chance        numeric,
    amount        numeric NOT NULL,
    max_amount    numeric,

    PRIMARY KEY (game_id, source_kind, source_ext_id, ordinal),
    CONSTRAINT drop_entry_source_values CHECK (source_kind IN ('entity', 'spawn_point')),
    CONSTRAINT drop_entry_chance_range CHECK (chance IS NULL OR chance BETWEEN 0 AND 1),
    CONSTRAINT drop_entry_amount_positive CHECK (amount > 0),
    CONSTRAINT drop_entry_amount_order CHECK (max_amount IS NULL OR max_amount >= amount)
);
CREATE INDEX drop_entry_by_target ON drop_entry (game_id, target_ext_id);

-- ================================== Loja ==================================
-- Tres informacoes: a loja, as categorias da loja e os itens de cada categoria.

CREATE TABLE shop (
    game_id     text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id      text        NOT NULL,
    name        text        NOT NULL,
    summary     text,
    description text,
    npc_ext_id  text,
    reset_type  text,
    created_by  text        NOT NULL,
    updated_by  text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT shop_ext_id_valid CHECK (is_valid_ext_id(ext_id))
);

-- Aponta para a loja pelo codigo, e pode existir antes dela.
CREATE TABLE shop_category (
    game_id     text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id      text        NOT NULL,
    name        text        NOT NULL,
    summary     text,
    description text,
    shop_ext_id text,
    reset_type  text,
    created_by  text        NOT NULL,
    updated_by  text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT shop_category_ext_id_valid CHECK (is_valid_ext_id(ext_id))
);
CREATE INDEX shop_category_by_shop ON shop_category (game_id, shop_ext_id);

-- quantity: tamanho do pacote (nulo = avulso). purchase_limit: quantas compras ate o reset.
-- O preco e em currency, que tambem e conteudo.
CREATE TABLE shop_category_item (
    game_id         text    NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    category_ext_id text    NOT NULL,
    ordinal         int     NOT NULL,
    target_kind     text,
    target_ext_id   text    NOT NULL,
    quantity        numeric,
    purchase_limit  int,
    price           numeric,
    currency_kind   text,
    currency_ext_id text,
    reset_type      text,
    rarity_code     text,

    PRIMARY KEY (game_id, category_ext_id, ordinal),
    CONSTRAINT shop_category_item_quantity_positive CHECK (quantity IS NULL OR quantity > 0),
    CONSTRAINT shop_category_item_limit_positive CHECK (purchase_limit IS NULL OR purchase_limit > 0),
    CONSTRAINT shop_category_item_price_not_negative CHECK (price IS NULL OR price >= 0),
    CONSTRAINT shop_category_item_currency_pair CHECK (currency_kind IS NULL OR currency_ext_id IS NOT NULL)
);
CREATE INDEX shop_category_item_by_target ON shop_category_item (game_id, target_ext_id);

-- ================================= Views =================================

-- Receita sem nome e exibida pelo nome do primeiro produto cadastrado; na falta dele, o codigo.
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
           ) c;

-- Toda referencia textual entre conteudos: as de V4 e as desta fase.
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
      FROM shop_category_item WHERE currency_ext_id IS NOT NULL;
