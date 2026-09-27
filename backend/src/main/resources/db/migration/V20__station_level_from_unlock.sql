-- O dataminer do Valheim gravava o nivel exigido da bancada como desbloqueio ("station_level":
-- "Nivel da bancada: 2"), antes de V14 dar nivel a propria bancada. O nivel passa para a bancada
-- (entidade) da receita, que a tela mostra no selo do icone. Nivel 1 e a bancada recem-construida,
-- que serve em qualquer nivel, entao fica sem nivel. So converte quando a receita tem uma bancada
-- entidade, que e o unico caso em que se sabe de qual bancada e o nivel.

UPDATE recipe_station s
   SET level = u.value::int
  FROM recipe_unlock u
 WHERE u.game_id = s.game_id
   AND u.recipe_ext_id = s.recipe_ext_id
   AND u.unlock_type = 'station_level'
   AND u.value ~ '^[0-9]+$'
   AND u.value::int > 1
   AND s.station_kind = 'entity'
   AND s.level IS NULL
   AND (SELECT count(*) FROM recipe_station o
         WHERE o.game_id = s.game_id AND o.recipe_ext_id = s.recipe_ext_id AND o.station_kind = 'entity') = 1;

DELETE FROM recipe_unlock u
 WHERE u.unlock_type = 'station_level'
   AND u.value ~ '^[0-9]+$'
   AND (SELECT count(*) FROM recipe_station o
         WHERE o.game_id = u.game_id AND o.recipe_ext_id = u.recipe_ext_id AND o.station_kind = 'entity') = 1;
