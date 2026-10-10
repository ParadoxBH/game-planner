package com.paradoxbh.gameplannerserver.identity.domain;

import java.util.Locale;

/**
 * Username é sempre minúsculo (V24): "ParadoxBH" e "paradoxbh" são a mesma conta. Tudo que recebe um username de
 * fora — cadastro, login, token, rotas de membro e de administração — passa por aqui antes de procurar ou gravar.
 */
public final class Usernames {

    private Usernames() {
    }

    public static String normalize(String username) {
        return username == null ? null : username.strip().toLowerCase(Locale.ROOT);
    }
}
