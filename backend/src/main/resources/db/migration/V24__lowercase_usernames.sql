-- Username passa a ser sempre minusculo: o backend normaliza o que o usuario digita no cadastro, no login e nas
-- rotas que recebem username (ver Usernames.normalize). Aqui os que ja existem sao convertidos, e a restricao de
-- formato passa a recusar maiuscula.

-- Dois usernames que so diferem em maiuscula virariam o mesmo: para em vez de escolher um deles.
DO $$
DECLARE
    duplicated text;
BEGIN
    SELECT string_agg(folded, ', ') INTO duplicated
      FROM (SELECT lower(username) AS folded FROM app_user GROUP BY 1 HAVING count(*) > 1) d;
    IF duplicated IS NOT NULL THEN
        RAISE EXCEPTION 'Usernames que so diferem em maiuscula: %. Junte ou renomeie as contas antes de migrar.', duplicated;
    END IF;
END $$;

-- game_member aponta para app_user: com ON UPDATE CASCADE, acompanha a troca da chave.
ALTER TABLE game_member DROP CONSTRAINT game_member_username_fkey;
ALTER TABLE game_member ADD CONSTRAINT game_member_username_fkey
    FOREIGN KEY (username) REFERENCES app_user(username) ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE app_user SET username = lower(username) WHERE username <> lower(username);

-- Autoria (created_by, updated_by, granted_by, uploaded_by, changed_by, added_by): texto sem chave estrangeira,
-- espalhado por todas as tabelas de conteudo. Toda coluna *_by de tabela entra, inclusive as que vierem depois
-- desta migration e forem reaplicadas num banco novo (ai nao ha o que converter).
DO $$
DECLARE
    col record;
BEGIN
    FOR col IN
        SELECT c.table_name, c.column_name
          FROM information_schema.columns c
          JOIN information_schema.tables t USING (table_schema, table_name)
         WHERE c.table_schema = current_schema()
           AND t.table_type = 'BASE TABLE'
           AND c.data_type = 'text'
           AND c.column_name LIKE '%\_by'
    LOOP
        EXECUTE format('UPDATE %I SET %I = lower(%I) WHERE %I <> lower(%I)',
                       col.table_name, col.column_name, col.column_name, col.column_name, col.column_name);
    END LOOP;
END $$;

ALTER TABLE app_user DROP CONSTRAINT app_user_username_format;
ALTER TABLE app_user ADD CONSTRAINT app_user_username_format CHECK (username ~ '^[a-z0-9_.-]{3,32}$');
