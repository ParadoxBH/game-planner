-- Nivel da bancada exigido pela receita (forja nivel 4) e nivel do ocupante de um ponto de spawn,
-- que e como o mapa marca "a forja nivel 4 fica aqui". Sem nivel, vale em qualquer nivel, como antes.

ALTER TABLE recipe_station ADD COLUMN level int;
ALTER TABLE recipe_station ADD CONSTRAINT recipe_station_level_positive
    CHECK (level IS NULL OR level >= 0);

ALTER TABLE spawn_occupant ADD COLUMN level int;
ALTER TABLE spawn_occupant ADD CONSTRAINT spawn_occupant_level_positive
    CHECK (level IS NULL OR level >= 0);
