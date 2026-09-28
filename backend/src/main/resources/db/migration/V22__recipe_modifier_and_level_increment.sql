-- Atributo que aumenta outro a cada nivel do item: no Valheim, damage_per_level_slash (6) aumenta
-- damage_slash (55) em cada melhoria, entao a espada nivel 3 tem 67. Nulo: nao aumenta nada.
ALTER TABLE attribute_definition ADD COLUMN level_increment_of text;

-- Modificadores da receita: o que ela muda nos atributos de um item ao ser feita. add soma, percent
-- soma a porcentagem do valor atual, set fixa o valor. Alvo nulo e o item melhorado pela receita (o
-- produto que tambem entra como ingrediente), senao o primeiro produto. Ex.: Pistola +3, dano vira 33;
-- pente estendido na pistola, municao por pente vira 17.
CREATE TABLE recipe_modifier (
    game_id       text    NOT NULL REFERENCES game(id) ON DELETE CASCADE,
    recipe_ext_id text    NOT NULL,
    ordinal       int     NOT NULL,
    target_kind   text,
    target_ext_id text,
    attribute_key text    NOT NULL,
    operation     text    NOT NULL,
    value_num     numeric,
    value_text    text,
    value_bool    boolean,

    PRIMARY KEY (game_id, recipe_ext_id, ordinal),
    CONSTRAINT recipe_modifier_operation_values CHECK (operation IN ('add', 'percent', 'set')),
    CONSTRAINT recipe_modifier_one_value CHECK (num_nonnulls(value_num, value_text, value_bool) = 1),
    CONSTRAINT recipe_modifier_numeric_operation CHECK (operation = 'set' OR value_num IS NOT NULL)
);
CREATE INDEX recipe_modifier_by_target ON recipe_modifier (game_id, target_ext_id);
