-- Nucleo de conteudo. Ver doc/backend_plan.md secoes 2, 4.3, 4.4 e 4.6.
--
-- Regra central (2.1): nenhuma FK entre conteudos. Toda referencia e textual e pode
-- apontar para algo ainda nao cadastrado. A unica FK e para game: conteudo de um jogo
-- inexistente nao e caso legitimo, e apagar o jogo leva o conteudo junto.

-- ext_id vai para a URL. A base atual tem ids com espaco e parenteses ("lox bite",
-- "Hound (1)_..."), entao eles sao aceitos. Ficam de fora so os caracteres que quebram
-- um caminho HTTP (/ \ ? # % ;), caracteres de controle e espaco nas pontas.
-- Mesmo criterio de ExtIds.java.
CREATE FUNCTION is_valid_ext_id(value text) RETURNS boolean
    LANGUAGE sql IMMUTABLE AS
$$ SELECT value ~ '^[^/\\?#%;[:cntrl:]]{1,128}$' AND value = btrim(value) $$;

CREATE TABLE item (
    game_id           text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id            text        NOT NULL,
    name              text        NOT NULL,
    summary           text,
    description       text,
    icon_media_id     text,
    image_media_id    text,
    rarity_code       text,
    level             int,
    base_buy_price    numeric,
    base_sell_price   numeric,
    currency_kind     text,
    currency_ext_id   text,
    variant_of_ext_id text,
    created_by        text        NOT NULL,
    updated_by        text        NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT item_ext_id_valid CHECK (is_valid_ext_id(ext_id)),
    CONSTRAINT item_currency_pair CHECK (currency_kind IS NULL OR currency_ext_id IS NOT NULL)
);

CREATE TABLE entity (
    game_id               text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id                text        NOT NULL,
    name                  text        NOT NULL,
    summary               text,
    description           text,
    icon_media_id         text,
    image_media_id        text,
    rarity_code           text,
    level                 int,
    respawn_delay_minutes int,
    base_buy_price        numeric,
    base_sell_price       numeric,
    variant_of_ext_id     text,
    created_by            text        NOT NULL,
    updated_by            text        NOT NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT entity_ext_id_valid CHECK (is_valid_ext_id(ext_id))
);

CREATE TABLE category (
    game_id         text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id          text        NOT NULL,
    name            text        NOT NULL,
    summary         text,
    description     text,
    icon_media_id   text,
    image_media_id  text,
    banner_media_id text,
    applies_to      text        NOT NULL DEFAULT 'both',
    created_by      text        NOT NULL,
    updated_by      text        NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT category_ext_id_valid CHECK (is_valid_ext_id(ext_id)),
    CONSTRAINT category_applies_to_values CHECK (applies_to IN ('item', 'entity', 'both'))
);

CREATE TABLE game_event (
    game_id         text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    ext_id          text        NOT NULL,
    name            text        NOT NULL,
    summary         text,
    description     text,
    icon_media_id   text,
    image_media_id  text,
    banner_media_id text,
    event_type      text        NOT NULL DEFAULT 'event',
    period_start    date,
    period_end      date,
    created_by      text        NOT NULL,
    updated_by      text        NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, ext_id),
    CONSTRAINT game_event_ext_id_valid CHECK (is_valid_ext_id(ext_id)),
    CONSTRAINT game_event_period_order CHECK (period_start IS NULL OR period_end IS NULL OR period_end >= period_start)
);

-- Etiquetas compartilhadas por varios tipos de conteudo. (game_id, kind, ext_id) e o dono.
-- A ordem das categorias importa: a primeira e a principal.
CREATE TABLE content_category (
    game_id         text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    kind            text NOT NULL,
    ext_id          text NOT NULL,
    ordinal         int  NOT NULL,
    category_ext_id text NOT NULL,

    PRIMARY KEY (game_id, kind, ext_id, category_ext_id)
);
CREATE INDEX content_category_by_category ON content_category (game_id, category_ext_id, kind);

CREATE TABLE content_event (
    game_id      text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    kind         text NOT NULL,
    ext_id       text NOT NULL,
    event_ext_id text NOT NULL,

    PRIMARY KEY (game_id, kind, ext_id, event_ext_id)
);
CREATE INDEX content_event_by_event ON content_event (game_id, event_ext_id, kind);

-- Definicao e opcional: sem ela, o atributo e aceito e o tipo vem do proprio valor.
-- Com ela, o tipo e conferido na escrita.
CREATE TABLE attribute_definition (
    game_id   text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    key       text NOT NULL,
    label     text NOT NULL,
    data_type text NOT NULL,
    unit      text,
    ordinal   int  NOT NULL DEFAULT 0,

    PRIMARY KEY (game_id, key),
    CONSTRAINT attribute_definition_key_valid CHECK (is_valid_ext_id(key)),
    CONSTRAINT attribute_definition_type_values CHECK (data_type IN ('number', 'text', 'boolean'))
);

CREATE TABLE content_attribute (
    game_id    text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    kind       text NOT NULL,
    ext_id     text NOT NULL,
    key        text NOT NULL,
    value_num  numeric,
    value_text text,
    value_bool boolean,

    PRIMARY KEY (game_id, kind, ext_id, key),
    CONSTRAINT content_attribute_one_value CHECK (num_nonnulls(value_num, value_text, value_bool) = 1)
);
CREATE INDEX content_attribute_by_key ON content_attribute (game_id, key, kind);

-- Historico append-only. O snapshot e o documento inteiro (agregado), sem metadados.
-- Numa remocao, guarda o ultimo estado: e o que permite restaurar depois.
CREATE TABLE content_revision (
    game_id    text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    kind       text        NOT NULL,
    ext_id     text        NOT NULL,
    revision   int         NOT NULL,
    operation  text        NOT NULL,
    changed_by text        NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now(),
    snapshot   jsonb       NOT NULL,

    PRIMARY KEY (game_id, kind, ext_id, revision),
    CONSTRAINT content_revision_operation_values CHECK (operation IN ('create', 'update', 'delete', 'restore'))
);
CREATE INDEX content_revision_by_game_time   ON content_revision (game_id, changed_at DESC);
CREATE INDEX content_revision_by_author_time ON content_revision (changed_by, changed_at DESC);

-- Todo conteudo cadastrado, num formato so: resolve referencia para exibicao,
-- alimenta a busca e o calculo de pendencias.
CREATE VIEW content_ref AS
    SELECT game_id, 'item'::text AS kind, ext_id, name, icon_media_id FROM item
    UNION ALL
    SELECT game_id, 'entity', ext_id, name, icon_media_id FROM entity
    UNION ALL
    SELECT game_id, 'category', ext_id, name, icon_media_id FROM category
    UNION ALL
    SELECT game_id, 'event', ext_id, name, icon_media_id FROM game_event;

-- Toda referencia textual entre conteudos. Cada fase que criar uma coluna de referencia
-- acrescenta um SELECT aqui (CREATE OR REPLACE VIEW).
-- target_kind nulo = a origem nao diz o tipo, e casa com qualquer tipo.
CREATE VIEW content_reference AS
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
      FROM item WHERE currency_ext_id IS NOT NULL;

-- Toda referencia de conteudo para midia. Base da listagem de midia orfa.
CREATE VIEW media_reference AS
    SELECT game_id, 'item'::text AS kind, ext_id, 'iconMediaId'::text AS field, icon_media_id AS media_id
      FROM item WHERE icon_media_id IS NOT NULL
    UNION ALL SELECT game_id, 'item', ext_id, 'imageMediaId', image_media_id FROM item WHERE image_media_id IS NOT NULL
    UNION ALL SELECT game_id, 'entity', ext_id, 'iconMediaId', icon_media_id FROM entity WHERE icon_media_id IS NOT NULL
    UNION ALL SELECT game_id, 'entity', ext_id, 'imageMediaId', image_media_id FROM entity WHERE image_media_id IS NOT NULL
    UNION ALL SELECT game_id, 'category', ext_id, 'iconMediaId', icon_media_id FROM category WHERE icon_media_id IS NOT NULL
    UNION ALL SELECT game_id, 'category', ext_id, 'imageMediaId', image_media_id FROM category WHERE image_media_id IS NOT NULL
    UNION ALL SELECT game_id, 'category', ext_id, 'bannerMediaId', banner_media_id FROM category WHERE banner_media_id IS NOT NULL
    UNION ALL SELECT game_id, 'event', ext_id, 'iconMediaId', icon_media_id FROM game_event WHERE icon_media_id IS NOT NULL
    UNION ALL SELECT game_id, 'event', ext_id, 'imageMediaId', image_media_id FROM game_event WHERE image_media_id IS NOT NULL
    UNION ALL SELECT game_id, 'event', ext_id, 'bannerMediaId', banner_media_id FROM game_event WHERE banner_media_id IS NOT NULL;
