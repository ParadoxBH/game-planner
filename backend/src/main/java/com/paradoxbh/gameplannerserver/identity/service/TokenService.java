package com.paradoxbh.gameplannerserver.identity.service;

import java.time.Instant;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.config.GamePlannerProperties;

/**
 * Emite e valida os JWT.
 *
 * O token carrega apenas o username e o tipo. Permissão não vai no token: é lida
 * do banco a cada requisição, para que suspender um usuário ou revogar um papel
 * tenha efeito imediato, sem esperar o token expirar.
 */
@Service
public class TokenService {

    static final String CLAIM_TYPE = "typ";
    static final String TYPE_ACCESS = "access";
    static final String TYPE_REFRESH = "refresh";

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final GamePlannerProperties.Jwt config;

    public TokenService(JwtEncoder encoder, JwtDecoder decoder, GamePlannerProperties properties) {
        this.encoder = encoder;
        this.decoder = decoder;
        this.config = properties.jwt();
    }

    public String issueAccessToken(String username) {
        return issue(username, TYPE_ACCESS, config.accessTokenTtl());
    }

    public String issueRefreshToken(String username) {
        return issue(username, TYPE_REFRESH, config.refreshTokenTtl());
    }

    public long accessTokenSeconds() {
        return config.accessTokenTtl().toSeconds();
    }

    /** Valida um refresh token e devolve o username. */
    public String usernameFromRefreshToken(String token) {
        Jwt jwt;
        try {
            jwt = decoder.decode(token);
        } catch (JwtException ex) {
            throw ApiException.unauthorized("Refresh token inválido ou expirado");
        }
        if (!TYPE_REFRESH.equals(jwt.getClaimAsString(CLAIM_TYPE))) {
            throw ApiException.unauthorized("Token informado não é um refresh token");
        }
        return jwt.getSubject();
    }

    private String issue(String username, String type, java.time.Duration ttl) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(config.issuer())
                .subject(username)
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .claim(CLAIM_TYPE, type)
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
