-- Condicao para o ponto de spawn valer. Linhas de tipos diferentes valem juntas (E); linhas do
-- mesmo tipo, basta uma (OU); negated inverte a linha. O valor vem numa das quatro formas: faixa
-- (min_value/max_value, inclusiva, nulo = sem limite), codigo (value), referencia
-- (target_kind/target_ext_id) ou so o tipo (bandeira).
--
-- type e value sao codigos abertos, como respawn_mode e unlock_type: o vocabulario esta em
-- doc/spawn_and_spatial.md, nao no banco. Referencia nunca exige existencia, entao nao ha FK
-- em target_ext_id.
CREATE TABLE spawn_condition (
    game_id       text    NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    spawn_ext_id  text    NOT NULL,
    ordinal       int     NOT NULL,
    type          text    NOT NULL,
    value         text,
    target_kind   text,
    target_ext_id text,
    min_value     numeric,
    max_value     numeric,
    negated       boolean,

    PRIMARY KEY (game_id, spawn_ext_id, ordinal),
    CONSTRAINT spawn_condition_type_not_blank CHECK (btrim(type) <> ''),
    CONSTRAINT spawn_condition_target_pair    CHECK (target_kind IS NULL OR target_ext_id IS NOT NULL),
    CONSTRAINT spawn_condition_range_order    CHECK (min_value IS NULL OR max_value IS NULL
                                                     OR max_value >= min_value)
);
CREATE INDEX spawn_condition_by_type   ON spawn_condition (game_id, type);
CREATE INDEX spawn_condition_by_target ON spawn_condition (game_id, target_ext_id);
