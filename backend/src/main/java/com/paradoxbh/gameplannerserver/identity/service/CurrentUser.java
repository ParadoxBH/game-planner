package com.paradoxbh.gameplannerserver.identity.service;

import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.identity.domain.AppUser;
import com.paradoxbh.gameplannerserver.identity.repo.AppUserRepository;

/**
 * Resolve o usuário da requisição a partir do JWT, sempre relendo do banco.
 * Um refresh token nunca autentica uma requisição de API.
 */
@Component
public class CurrentUser {

    private final AppUserRepository users;

    public CurrentUser(AppUserRepository users) {
        this.users = users;
    }

    public Optional<AppUser> find() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
            return Optional.empty();
        }
        if (!TokenService.TYPE_ACCESS.equals(jwt.getClaimAsString(TokenService.CLAIM_TYPE))) {
            return Optional.empty();
        }
        return users.findById(jwt.getSubject());
    }

    /** O usuário autenticado, ou 401. */
    public AppUser require() {
        return find().orElseThrow(() -> ApiException.unauthorized("Autenticação necessária"));
    }

    /** O usuário autenticado, exigindo conta ativa e com vínculo. */
    public AppUser requireWriter() {
        AppUser user = require();
        if (!user.isActive()) {
            throw ApiException.forbidden("Conta suspensa");
        }
        if (!user.isVerified()) {
            throw ApiException.forbidden(
                    "Conta sem vínculo verificado não pode editar conteúdo");
        }
        return user;
    }

    public AppUser requirePlatformAdmin() {
        AppUser user = require();
        if (!user.isPlatformAdmin()) {
            throw ApiException.forbidden("Ação restrita a administradores da plataforma");
        }
        return user;
    }

    /** Username do autenticado, ou null para visitante. */
    public String usernameOrNull() {
        return find().map(AppUser::getUsername).orElse(null);
    }
}
