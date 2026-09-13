-- Midia enviada por usuarios. Ver doc/backend_plan.md secao 4.7.
--
-- Armazenamento enderecado por conteudo: o id e o SHA-256 da variante "full" ja
-- convertida para WebP. A mesma imagem enviada por varias pessoas vira uma linha so.
-- Por isso a midia nao pertence a um jogo: quem da contexto de jogo e o conteudo
-- que a referencia.

CREATE TABLE media (
    id            text PRIMARY KEY,
    width         int         NOT NULL,
    height        int         NOT NULL,
    animated      boolean     NOT NULL DEFAULT false,
    source_name   text,
    source_format text        NOT NULL,
    source_bytes  bigint      NOT NULL,
    uploaded_by   text        NOT NULL,
    uploaded_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT media_id_is_sha256 CHECK (id ~ '^[0-9a-f]{64}$')
);

-- "Tudo que este usuario enviou": base para desfazer abuso em massa.
CREATE INDEX media_uploaded_by_idx ON media (uploaded_by, uploaded_at DESC);

CREATE TABLE media_variant (
    media_id     text   NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    variant      text   NOT NULL,
    width        int    NOT NULL,
    height       int    NOT NULL,
    byte_size    bigint NOT NULL,
    storage_path text   NOT NULL,

    PRIMARY KEY (media_id, variant),
    CONSTRAINT media_variant_values CHECK (variant IN ('icon', 'thumb', 'full'))
);
