-- content_media sem chave estrangeira. Ver doc/backend_plan.md 4.7.
--
-- A ligacao pertence ao codigo do registro (ext_id), nao ao registro: durante o cadastro o
-- usuario pode anexar imagens antes de o conteudo existir, ja que o codigo nao se repete.
-- Pela mesma razao, a tabela de relacionamento nao amarra nada: nem jogo, nem midia.
-- Remove todas as FKs da tabela, pelo catalogo, sem depender do nome gerado para cada uma.
DO $$
DECLARE
    fk record;
BEGIN
    FOR fk IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'content_media'::regclass AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE content_media DROP CONSTRAINT %I', fk.conname);
    END LOOP;
END
$$;
