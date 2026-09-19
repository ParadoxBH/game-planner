package com.paradoxbh.gameplannerserver.support;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.paradoxbh.gameplannerserver.query.QueryJson;

import tools.jackson.databind.json.JsonMapper;

/**
 * Base dos testes de contrato HTTP de conteúdo: MockMvc com segurança e banco real, um jogo novo
 * por teste (só membros escrevem) e um usuário para cada situação de permissão.
 */
public abstract class ContentApiTest extends PostgisIntegrationTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    protected WebApplicationContext context;

    @Autowired
    protected JdbcClient jdbc;

    protected MockMvc mvc;
    protected String game;

    @BeforeEach
    void createGameAndUsers() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        game = "t" + UUID.randomUUID().toString().substring(0, 8);
        jdbc.sql("INSERT INTO game (id, name, write_policy) VALUES (:id, 'Jogo de teste', 'members')")
                .param("id", game).update();

        user("editor", true, false);
        user("moderador", true, false);
        user("sem-vinculo", false, false);
        user("estranho", true, false);
        user("admin", true, true);
        member("editor", "editor");
        member("moderador", "moderator");
        member("sem-vinculo", "editor");
    }

    protected ResultActions send(MockHttpServletRequestBuilder request, String username, String body) throws Exception {
        request.contentType(MediaType.APPLICATION_JSON).content(body);
        if (username != null) {
            request.with(as(username));
        }
        return mvc.perform(request);
    }

    protected static RequestPostProcessor as(String username) {
        return jwt().jwt(token -> token.subject(username).claim("typ", "access"));
    }

    /**
     * Listagem filtrada: POST {path}/query com o QueryJson no corpo, sem login. Página, ordenação e
     * references vão por {@code .param()}.
     */
    protected static MockHttpServletRequestBuilder query(String path, QueryJson filter, Object... uriVariables) {
        return post(path + "/query", uriVariables).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(filter));
    }

    /** Listagem sem filtro. */
    protected static MockHttpServletRequestBuilder list(String path, Object... uriVariables) {
        return query(path, QueryJson.and(), uriVariables);
    }

    /** JSON com aspas simples, para os testes ficarem legíveis. */
    protected static String json(String singleQuoted) {
        return singleQuoted.replace('\'', '"');
    }

    /** Linha de mídia direto no banco: o upload real (FFmpeg) é coberto em MediaUploadIntegrationTest. */
    protected String newMedia() {
        String id = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        jdbc.sql("""
                INSERT INTO media (id, width, height, source_format, source_bytes, uploaded_by)
                VALUES (:id, 1, 1, 'png_pipe', 1, 'admin')
                """).param("id", id).update();
        return id;
    }

    protected void user(String username, boolean verified, boolean platformAdmin) {
        jdbc.sql("""
                INSERT INTO app_user (username, password_hash, verified, platform_admin)
                VALUES (:username, 'teste', :verified, :admin)
                ON CONFLICT (username) DO NOTHING
                """)
                .param("username", username).param("verified", verified).param("admin", platformAdmin)
                .update();
    }

    protected void member(String username, String role) {
        jdbc.sql("INSERT INTO game_member (game_id, username, role) VALUES (:game, :username, :role)")
                .param("game", game).param("username", username).param("role", role)
                .update();
    }
}
