-- Busca sem diferenca de maiuscula e de acento: "pocao" acha "Poção", "ESPADA" acha "espada".
--
-- search_fold e o que as buscas comparam dos dois lados (o texto do banco e o que foi digitado): minusculas e sem
-- acento. unaccent e do contrib do PostgreSQL (vem na imagem postgis) e e extensao confiavel: o dono do banco
-- instala sem superusuario. A funcao fixa o dicionario e o schema para poder ser IMMUTABLE, o que deixa criar
-- indice sobre ela quando o volume pedir (unaccent sozinha e so STABLE).

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE FUNCTION search_fold(value text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, value)) $$;
