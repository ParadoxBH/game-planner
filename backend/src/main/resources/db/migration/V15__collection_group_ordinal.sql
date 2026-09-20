-- Ordem dos grupos dentro do conjunto, definida por quem administra (ver doc/backend_plan.md).
-- Sem valor, o grupo vai para o fim, na ordem alfabética.
ALTER TABLE collection_group ADD COLUMN ordinal int;
ALTER TABLE collection_group ADD CONSTRAINT collection_group_ordinal_not_negative
    CHECK (ordinal IS NULL OR ordinal >= 0);
