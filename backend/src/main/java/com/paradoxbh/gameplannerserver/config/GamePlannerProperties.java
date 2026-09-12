package com.paradoxbh.gameplannerserver.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configuração da aplicação, agrupada por assunto. Ver application.properties. */
@ConfigurationProperties(prefix = "gameplanner")
public record GamePlannerProperties(Jwt jwt, Cors cors, RateLimit rateLimit, Media media) {

    public record Jwt(String secret, String issuer, Duration accessTokenTtl, Duration refreshTokenTtl) {
        /** HS256 exige chave de no mínimo 256 bits. */
        public static final int MIN_SECRET_BYTES = 32;
    }

    public record Cors(List<String> allowedOrigins) {}

    public record RateLimit(int writesPerMinute) {}

    public record Media(String storagePath, int maxMegapixels, Duration ffmpegTimeout) {}
}
