package com.paradoxbh.gameplannerserver.config;

import java.io.IOException;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Cache das leituras da API: ETag calculado do corpo, com {@code Cache-Control: no-cache}. O
 * navegador guarda a resposta e revalida a cada uso; se nada mudou, recebe 304 sem corpo.
 * {@code Vary: Authorization} porque jogo privado responde diferente para cada usuário.
 *
 * O Cache-Control é definido antes da cadeia de propósito: o Spring Security só escreve o dele
 * (no-store, que impediria guardar a resposta) quando nenhum foi definido.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class ApiCacheFilter extends ShallowEtagHeaderFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String method = request.getMethod();
        return !("GET".equals(method) || "HEAD".equals(method)) || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-cache");
        response.addHeader(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION);
        super.doFilterInternal(request, response, chain);
    }
}
