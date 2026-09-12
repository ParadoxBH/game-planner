package com.paradoxbh.gameplannerserver.common;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Todo erro sai como ProblemDetail (RFC 9457), que o Spring já serializa nativamente. */
@RestControllerAdvice
public class ApiExceptionHandler {

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

    private ProblemDetail problem(HttpStatus status, String type, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create(TYPE_BASE + type));
        return problem;
    }
}
