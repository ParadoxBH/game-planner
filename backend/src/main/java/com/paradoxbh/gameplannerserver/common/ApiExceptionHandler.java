package com.paradoxbh.gameplannerserver.common;

import java.io.UncheckedIOException;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * Todo erro sai como ProblemDetail (RFC 9457), que o Spring já serializa nativamente.
 *
 * Precedência máxima para vencer o handler padrão do Spring
 * (spring.mvc.problemdetails.enabled), que cobre as demais exceções do framework,
 * mas com mensagens em inglês.
 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private static final String TYPE_BASE = "https://gameplanner/errors/";

    @ExceptionHandler(ApiException.class)
    public ProblemDetail handle(ApiException ex) {
        return problem(ex.status(), ex.type(), ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handle(MethodArgumentNotValidException ex) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "validation", "Dados inválidos");

        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        problem.setProperty("fields", fields);

        return problem;
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail handle(MaxUploadSizeExceededException ex) {
        return problem(HttpStatus.PAYLOAD_TOO_LARGE, "payload-too-large",
                "Arquivo maior que o limite permitido para envio");
    }

    /** Falha de disco ao gravar ou ler mídia. O detalhe vai para o log, não para o cliente. */
    @ExceptionHandler(UncheckedIOException.class)
    public ProblemDetail handle(UncheckedIOException ex) {
        log.error("Falha de E/S", ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "io-error", "Falha ao gravar ou ler arquivo");
    }

    private ProblemDetail problem(HttpStatus status, String type, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create(TYPE_BASE + type));
        return problem;
    }
}
