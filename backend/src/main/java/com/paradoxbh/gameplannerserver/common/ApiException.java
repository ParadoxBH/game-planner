package com.paradoxbh.gameplannerserver.common;

import org.springframework.http.HttpStatus;

/**
 * Erro de aplicação que vira um ProblemDetail (RFC 9457).
 * O {@code type} identifica a categoria do erro de forma estável para o front.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String type;

    public ApiException(HttpStatus status, String type, String message) {
        super(message);
        this.status = status;
        this.type = type;
    }

    public HttpStatus status() {
        return status;
    }

    public String type() {
        return type;
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
