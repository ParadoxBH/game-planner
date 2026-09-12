package com.paradoxbh.gameplannerserver.identity.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.identity.domain.AppUser;
import com.paradoxbh.gameplannerserver.identity.repo.AppUserRepository;

/** Cadastro aberto: qualquer um se registra, mas nasce sem vínculo (verified = false). */
@Service
public class AuthService {

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;

    public AuthService(AppUserRepository users, PasswordEncoder passwordEncoder, TokenService tokens) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
    }

    @Transactional
    public AppUser register(String username, String password, String displayName) {
        if (users.existsById(username)) {
            throw ApiException.conflict("Nome de usuário já está em uso");
        }
        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setDisplayName(displayName == null || displayName.isBlank() ? username : displayName);
        // Sem vínculo, sem escrita. O primeiro usuário do sistema é promovido
        // manualmente no banco; daí em diante é platform_admin quem libera.
        user.setVerified(false);
        return users.save(user);
    }

    @Transactional(readOnly = true)
    public AppUser authenticate(String username, String password) {
        AppUser user = users.findById(username)
                .orElseThrow(() -> ApiException.unauthorized("Usuário ou senha inválidos"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw ApiException.unauthorized("Usuário ou senha inválidos");
        }
        if (!user.isActive()) {
            throw ApiException.forbidden("Conta suspensa");
        }
        return user;
    }

    @Transactional(readOnly = true)
    public AppUser refresh(String refreshToken) {
        String username = tokens.usernameFromRefreshToken(refreshToken);
        AppUser user = users.findById(username)
                .orElseThrow(() -> ApiException.unauthorized("Usuário não existe mais"));
        if (!user.isActive()) {
            throw ApiException.forbidden("Conta suspensa");
        }
        return user;
    }
}
