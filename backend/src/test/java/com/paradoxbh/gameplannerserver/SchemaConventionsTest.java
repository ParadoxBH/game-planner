package com.paradoxbh.gameplannerserver;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

import com.paradoxbh.gameplannerserver.support.PostgisIntegrationTest;

/** Regras de schema que valem para toda migration, conferidas no banco real depois do Flyway. */
class SchemaConventionsTest extends PostgisIntegrationTest {

    /** Tabelas e views que não são nossas: controle do Flyway e catálogo do PostGIS. */
    private static final List<String> NOT_OURS =
            List.of("flyway_schema_history", "spatial_ref_sys", "geometry_columns", "geography_columns");

    @Autowired
    JdbcClient jdbc;

    @Test
    void everyTextColumnIsText() {
        List<String> offenders = jdbc.sql("""
                SELECT table_name || '.' || column_name || ' (' || data_type || ')'
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND data_type IN ('character varying', 'character', 'name', '"char"')
                  AND table_name NOT IN (:notOurs)
                ORDER BY 1
                """)
                .param("notOurs", NOT_OURS)
                .query(String.class).list();

        assertThat(offenders)
                .as("Todo campo de texto do banco deve ser TEXT, nunca varchar ou variação")
                .isEmpty();
    }

    /**
     * A ligação de mídia pertence ao código do registro, não ao registro: imagens podem ser
     * anexadas antes de o conteúdo existir. A tabela de relacionamento não amarra nada.
     */
    @Test
    void relationshipTableHasNoForeignKeys() {
        List<String> foreignKeys = jdbc.sql("""
                SELECT conname FROM pg_constraint
                WHERE conrelid = 'content_media'::regclass AND contype = 'f'
                """)
                .query(String.class).list();

        assertThat(foreignKeys)
                .as("content_media não pode ter chave estrangeira")
                .isEmpty();
    }
}
