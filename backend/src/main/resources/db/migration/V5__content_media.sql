-- Relacionamento de midia com conteudo numa tabela so. Ver doc/backend_plan.md 4.7.
--
-- Substitui as colunas icon_media_id / image_media_id / banner_media_id de cada tabela de
-- conteudo e os caminhos de arquivo de game (icon, capsule, thumbnail). Um uso novo de
-- imagem passa a ser uma linha nesta tabela, e nao uma coluna em cada tabela.

CREATE TABLE content_media (
    game_id  text        NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    -- game | item | entity | category | event. Para o proprio jogo, ext_id = game_id.
    kind     text        NOT NULL,
    ext_id   text        NOT NULL,
    usage    text        NOT NULL,
    media_id text        NOT NULL REFERENCES media(id),
    -- Posicao entre as midias do mesmo uso, ex.: a ordem das screenshots.
    ordinal  int         NOT NULL,
    -- Quem ligou a imagem e quando. Continua o mesmo enquanto a imagem seguir no mesmo uso.
    -- Entre varias imagens do mesmo uso, a atual e a adicionada por ultimo.
    added_by text        NOT NULL,
    added_at timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, kind, ext_id, usage, media_id),
    CONSTRAINT content_media_usage_values
        CHECK (usage IN ('icon', 'capsule', 'thumbnail', 'banner', 'screenshot')),
    CONSTRAINT content_media_game_is_itself CHECK (kind <> 'game' OR ext_id = game_id)
);

CREATE INDEX content_media_by_media ON content_media (media_id);

-- Leva o que ja existia nas colunas antigas. "image" de item e entidade vira screenshot;
-- "image" de categoria e evento nao tem uso equivalente e nao e levada.
INSERT INTO content_media (game_id, kind, ext_id, usage, media_id, ordinal, added_by, added_at)
SELECT s.game_id, s.kind, s.ext_id, s.usage, s.media_id, 0, s.updated_by, s.updated_at
FROM (
    SELECT game_id, 'item'::text AS kind, ext_id, 'icon'::text AS usage, icon_media_id AS media_id, updated_by, updated_at FROM item
    UNION ALL SELECT game_id, 'item', ext_id, 'screenshot', image_media_id, updated_by, updated_at FROM item
    UNION ALL SELECT game_id, 'entity', ext_id, 'icon', icon_media_id, updated_by, updated_at FROM entity
    UNION ALL SELECT game_id, 'entity', ext_id, 'screenshot', image_media_id, updated_by, updated_at FROM entity
    UNION ALL SELECT game_id, 'category', ext_id, 'icon', icon_media_id, updated_by, updated_at FROM category
    UNION ALL SELECT game_id, 'category', ext_id, 'banner', banner_media_id, updated_by, updated_at FROM category
    UNION ALL SELECT game_id, 'event', ext_id, 'icon', icon_media_id, updated_by, updated_at FROM game_event
    UNION ALL SELECT game_id, 'event', ext_id, 'banner', banner_media_id, updated_by, updated_at FROM game_event
) s
WHERE s.media_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM media m WHERE m.id = s.media_id);

DROP VIEW media_reference;
DROP VIEW content_ref;

ALTER TABLE item       DROP COLUMN icon_media_id, DROP COLUMN image_media_id;
ALTER TABLE entity     DROP COLUMN icon_media_id, DROP COLUMN image_media_id;
ALTER TABLE category   DROP COLUMN icon_media_id, DROP COLUMN image_media_id, DROP COLUMN banner_media_id;
ALTER TABLE game_event DROP COLUMN icon_media_id, DROP COLUMN image_media_id, DROP COLUMN banner_media_id;

-- Eram caminhos de arquivo estatico (img/heartopia/logo.png), nao ids de midia.
ALTER TABLE game DROP COLUMN icon, DROP COLUMN capsule, DROP COLUMN thumbnail;

-- O icone exibido de um conteudo e o icone adicionado por ultimo.
CREATE VIEW content_ref AS
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
           ) c;
