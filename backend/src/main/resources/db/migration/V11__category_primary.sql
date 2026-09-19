-- Categoria principal: a que abre a listagem de itens e entidades (filtro "Categoria" e menu); as
-- demais sao sub-categorias. Antes do backend, isso vinha da ordem: a primeira categoria de cada
-- item ou entidade. Aqui preenche pela mesma regra; daqui em diante e campo do documento.

ALTER TABLE category ADD COLUMN is_primary boolean NOT NULL DEFAULT false;

UPDATE category c
   SET is_primary = true
 WHERE EXISTS (SELECT 1 FROM content_category cc
                WHERE cc.game_id = c.game_id AND cc.category_ext_id = c.ext_id
                  AND cc.kind IN ('item', 'entity') AND cc.ordinal = 0);

-- Os snapshots de revisao ganham o campo com o valor atual: restaurar uma revisao antiga nao
-- desmarca a categoria.
UPDATE content_revision r
   SET snapshot = r.snapshot || jsonb_build_object('primary', c.is_primary)
  FROM category c
 WHERE r.kind = 'category' AND r.game_id = c.game_id AND r.ext_id = c.ext_id;
