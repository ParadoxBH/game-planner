-- Grupo de exibicao do atributo (Dano, Dano por nivel, Comida, Geral...): o detalhe do item mostra
-- os atributos em secoes por grupo, e o filtro de atributo da listagem os agrupa igual. Sem grupo,
-- o atributo cai em "Outros".
ALTER TABLE attribute_definition ADD COLUMN group_label text;

-- Filtro e ordenacao da listagem pelo valor numerico do atributo (dano perfurante do maior para o
-- menor).
CREATE INDEX content_attribute_by_value ON content_attribute (game_id, kind, key, value_num);
