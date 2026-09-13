-- "consumed" vira "not_consumed", como no dado original (notConsume): marca o que e exigido
-- mas nao gasto. Vale para o ingrediente de receita e para o requisito de entidade, que tem a
-- mesma forma. Os valores sao invertidos, e os snapshots de revisao passam para o campo novo.

ALTER TABLE recipe_input RENAME COLUMN consumed TO not_consumed;
ALTER TABLE recipe_input ALTER COLUMN not_consumed SET DEFAULT false;
UPDATE recipe_input SET not_consumed = NOT not_consumed;

ALTER TABLE entity_requirement RENAME COLUMN consumed TO not_consumed;
ALTER TABLE entity_requirement ALTER COLUMN not_consumed SET DEFAULT false;
UPDATE entity_requirement SET not_consumed = NOT not_consumed;

-- Em cada linha do snapshot, "consumed" sai e entra "notConsumed" com o valor invertido.
UPDATE content_revision
   SET snapshot = jsonb_set(snapshot, '{inputs}', (
        SELECT coalesce(jsonb_agg((line - 'consumed')
                   || jsonb_build_object('notConsumed', NOT coalesce((line ->> 'consumed')::boolean, true))
                   ORDER BY idx), '[]'::jsonb)
          FROM jsonb_array_elements(snapshot -> 'inputs') WITH ORDINALITY AS t(line, idx)))
 WHERE kind = 'recipe' AND jsonb_typeof(snapshot -> 'inputs') = 'array';

UPDATE content_revision
   SET snapshot = jsonb_set(snapshot, '{requirements}', (
        SELECT coalesce(jsonb_agg((line - 'consumed')
                   || jsonb_build_object('notConsumed', NOT coalesce((line ->> 'consumed')::boolean, true))
                   ORDER BY idx), '[]'::jsonb)
          FROM jsonb_array_elements(snapshot -> 'requirements') WITH ORDINALITY AS t(line, idx)))
 WHERE kind = 'entity' AND jsonb_typeof(snapshot -> 'requirements') = 'array';
