package com.paradoxbh.gameplannerserver.common;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;

/**
 * Erro de aplicação que vira um ProblemDetail (RFC 9457).
 * O {@code type} identifica a categoria do erro de forma estável para o front, e
 * {@code properties} vão como campos extras no corpo (ex.: quem referencia um id ausente).
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String type;
    private final Map<String, Object> properties;

    public ApiException(HttpStatus status, String type, String message) {
        this(status, type, message, Map.of());
    }

    public ApiException(HttpStatus status, String type, String message, Map<String, Object> properties) {
        super(message);
        this.status = status;
        this.type = type;
        this.properties = Collections.unmodifiableMap(new LinkedHashMap<>(properties));
    }

    public HttpStatus status() {
        return status;
    }

    public String type() {
        return type;
    }

    public Map<String, Object> properties() {
        return properties;
    }

    public static ApiException notFound(String what) {
        return new ApiException(HttpStatus.NOT_FOUND, "not-found", what + " não encontrado");
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, "conflict", message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "forbidden", message);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "unauthorized", message);
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "bad-request", message);
    }
}
