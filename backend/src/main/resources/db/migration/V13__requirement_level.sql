-- Nivel exigido num requisito: ingrediente de receita (melhoria de equipamento: entra a espada
-- nivel 1, sai a espada nivel 2) e requisito de entidade (picareta de ferro ou melhor).
-- O operador diz como comparar com o nivel do item: exact (=), min (>=) ou max (<=).
-- Sem level, o requisito serve em qualquer nivel, como antes.

ALTER TABLE recipe_input ADD COLUMN level int;
ALTER TABLE recipe_input ADD COLUMN level_operator text;
ALTER TABLE recipe_input ADD CONSTRAINT recipe_input_level_operator
    CHECK (level_operator IS NULL OR level_operator IN ('exact', 'min', 'max'));
ALTER TABLE recipe_input ADD CONSTRAINT recipe_input_level_with_operator
    CHECK ((level IS NULL) = (level_operator IS NULL));

ALTER TABLE entity_requirement ADD COLUMN level int;
ALTER TABLE entity_requirement ADD COLUMN level_operator text;
ALTER TABLE entity_requirement ADD CONSTRAINT entity_requirement_level_operator
    CHECK (level_operator IS NULL OR level_operator IN ('exact', 'min', 'max'));
ALTER TABLE entity_requirement ADD CONSTRAINT entity_requirement_level_with_operator
    CHECK ((level IS NULL) = (level_operator IS NULL));
