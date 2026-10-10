package com.paradoxbh.gameplannerserver.identity;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.jayway.jsonpath.JsonPath;
import com.paradoxbh.gameplannerserver.support.PostgisIntegrationTest;

/** Username é sempre minúsculo (V24): cadastro, login e token aceitam qualquer caixa. */
class UsernameCaseIntegrationTest extends PostgisIntegrationTest {

    private static final String PASSWORD = "senha-bem-longa";

    @Autowired
    private WebApplicationContext context;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void usernameIsStoredAndMatchedInLowercase() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 6);
        String typed = "Raider" + suffix.toUpperCase();
        String stored = typed.toLowerCase();

        String registered = post("/api/v1/auth/register",
                "{\"username\": \"" + typed + "\", \"password\": \"" + PASSWORD + "\"}")
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        // O nome de exibição padrão fica como foi digitado; o username, minúsculo.
        me(JsonPath.read(registered, "$.accessToken"))
                .andExpect(jsonPath("$.username").value(stored))
                .andExpect(jsonPath("$.displayName").value(typed));

        // Mesmo usuário com outra caixa: não cria outra conta.
        post("/api/v1/auth/register", "{\"username\": \"" + stored.toUpperCase() + "\", \"password\": \"" + PASSWORD + "\"}")
                .andExpect(status().isConflict());

        String login = post("/api/v1/auth/login",
                "{\"username\": \"  " + stored.toUpperCase() + " \", \"password\": \"" + PASSWORD + "\"}")
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        me(JsonPath.read(login, "$.accessToken")).andExpect(jsonPath("$.username").value(stored));
    }

    private ResultActions post(String path, String body) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions me(String accessToken) throws Exception {
        return mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + accessToken));
    }
}
