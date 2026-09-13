package com.paradoxbh.gameplannerserver.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Base dos testes de integração.
 *
 * Sobe PostGIS de verdade e deixa o Flyway aplicar as migrations, para que
 * ddl-auto=validate valide as entidades contra o schema real. Testar contra
 * banco em memória não pegaria divergência de migration nem nada de PostGIS.
 *
 * Um container só para a JVM inteira, iniciado aqui e nunca parado (o Testcontainers
 * limpa ao fim). Com @Container por classe, o banco reiniciava entre classes de teste e
 * o Spring reaproveitava do cache um contexto ainda apontando para o banco antigo.
 */
@SpringBootTest
public abstract class PostgisIntegrationTest {

    private static final DockerImageName POSTGIS = DockerImageName
            .parse("postgis/postgis:16-3.4")
            .asCompatibleSubstituteFor("postgres");

    @ServiceConnection
    static final PostgreSQLContainer<?> DATABASE = new PostgreSQLContainer<>(POSTGIS);

    static {
        DATABASE.start();
    }
}
