-- Identidade e permissão.
-- Ver doc/backend_plan.md secao 4.2.
--
-- Estas sao as unicas FKs do sistema. A regra de "nenhuma FK entre conteudos"
-- (secao 2.1) vale para referencias entre conteudo de jogo, onde a ausencia do
-- alvo e legitima. Um membro de um jogo inexistente nao e caso legitimo.

CREATE TABLE app_user (
    username       text PRIMARY KEY,
    password_hash  text NOT NULL,
    display_name   text,
    -- A flag "autenticado": o usuario tem vinculo valido (email, Discord, etc).
    -- Hoje e ligada a mao por platform_admin. Quando o sistema de vinculo existir,
    -- passa a ser derivada de uma tabela user_link sem mexer em autorizacao.
    verified       boolean     NOT NULL DEFAULT false,
    status         text        NOT NULL DEFAULT 'active',
    platform_admin boolean     NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT app_user_username_format CHECK (username ~ '^[a-zA-Z0-9_.-]{3,32}$'),
    CONSTRAINT app_user_status_values   CHECK (status IN ('active', 'suspended'))
);

CREATE TABLE game (
    id               text PRIMARY KEY,
    name             text NOT NULL,
    summary          text,
    description      text,
    thumbnail        text,
    capsule          text,
    icon             text,
    status           text        NOT NULL DEFAULT 'draft',
    read_policy      text        NOT NULL DEFAULT 'public',
    write_policy     text        NOT NULL DEFAULT 'members',
    daily_reset_time time,
    weekly_reset_day smallint,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT game_id_format     CHECK (id ~ '^[a-z0-9_-]{2,64}$'),
    CONSTRAINT game_status_values CHECK (status       IN ('draft', 'published', 'coming_soon')),
    CONSTRAINT game_read_values   CHECK (read_policy  IN ('public', 'members')),
    CONSTRAINT game_write_values  CHECK (write_policy IN ('community', 'members')),
    CONSTRAINT game_weekday_range CHECK (weekly_reset_day IS NULL OR weekly_reset_day BETWEEN 0 AND 6)
);

CREATE TABLE game_member (
    game_id    text NOT NULL REFERENCES game(id)          ON DELETE CASCADE,
    username   text NOT NULL REFERENCES app_user(username) ON DELETE CASCADE,
    role       text NOT NULL,
    granted_by text,
    granted_at timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (game_id, username),
    CONSTRAINT game_member_role_values CHECK (role IN ('owner', 'moderator', 'editor'))
);

CREATE INDEX game_member_username_idx ON game_member (username);

CREATE TABLE game_rarity (
    game_id text NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    code    text NOT NULL,
    name    text NOT NULL,
    color   text NOT NULL,
    ordinal int  NOT NULL DEFAULT 0,

    PRIMARY KEY (game_id, code)
);
