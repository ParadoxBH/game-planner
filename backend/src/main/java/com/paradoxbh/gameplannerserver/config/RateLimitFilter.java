package com.paradoxbh.gameplannerserver.config;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Limita escritas por usuário autenticado.
 *
 * Contagem em memória, por instância: suficiente enquanto o deploy é um container só.
 * Se um dia houver mais de uma réplica, isto vira contador compartilhado.
 */
@Component
@Order(200)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final int maxWrites;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitFilter(GamePlannerProperties properties) {
        this.maxWrites = properties.rateLimit().writesPerMinute();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "GET".equals(request.getMethod())
                || "HEAD".equals(request.getMethod())
                || "OPTIONS".equals(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String user = authenticatedUsername();
        if (user != null && !allow(user)) {
            ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Limite de " + maxWrites + " escritas por minuto excedido");
            problem.setType(URI.create("https://gameplanner/errors/rate-limit"));

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.getWriter().write("""
                    {"type":"https://gameplanner/errors/rate-limit","title":"Too Many Requests",\
                    "status":429,"detail":"%s"}""".formatted(problem.getDetail()));
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean allow(String user) {
        Instant now = Instant.now();
        Window window = windows.compute(user, (key, current) ->
                current == null || current.startedAt.plus(WINDOW).isBefore(now)
                        ? new Window(now)
                        : current);
        return window.hits.incrementAndGet() <= maxWrites;
    }

    private String authenticatedUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof Jwt jwt ? jwt.getSubject() : null;
    }

    private static final class Window {
        private final Instant startedAt;
        private final AtomicInteger hits = new AtomicInteger();

        private Window(Instant startedAt) {
            this.startedAt = startedAt;
        }
    }
}
