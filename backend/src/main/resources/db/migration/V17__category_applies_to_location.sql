-- Categoria de local: agrupa locais do mesmo tipo (todos os rios, as fatias do oceano) para as regras
-- de spawn que valem "em locais da categoria" (condicao location_category). Local passa a ter
-- categorias em content_category, com kind = 'location', como item e entidade.
ALTER TABLE category DROP CONSTRAINT category_applies_to_values;
ALTER TABLE category ADD CONSTRAINT category_applies_to_values
    CHECK (applies_to IN ('item', 'entity', 'both', 'location'));
