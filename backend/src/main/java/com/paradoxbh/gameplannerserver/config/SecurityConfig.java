package com.paradoxbh.gameplannerserver.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class SecurityConfig {

    private static final String PROBLEM_TYPE_BASE = "https://gameplanner/errors/";

    private final GamePlannerProperties properties;

    public SecurityConfig(GamePlannerProperties properties) {
        this.properties = properties;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Leitura é aberta no nível do filtro. Jogo com read_policy=members
                        // é barrado adiante, por GameAccess, porque a regra é por jogo e
                        // não dá para expressá-la num matcher de rota.
                        .requestMatchers(HttpMethod.GET, "/api/v1/**").permitAll()
                        .requestMatchers("/api/v1/auth/register", "/api/v1/auth/login",
                                "/api/v1/auth/refresh").permitAll()
                        .requestMatchers("/media/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint(this::writeUnauthorized))
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(this::writeUnauthorized)
                        .accessDeniedHandler((request, response, denied) ->
                                writeProblem(response, HttpStatus.FORBIDDEN, "forbidden",
                                        "Acesso negado")));

        return http.build();
    }

    private void writeUnauthorized(jakarta.servlet.http.HttpServletRequest request,
                                   HttpServletResponse response,
                                   org.springframework.security.core.AuthenticationException ex) {
        writeProblem(response, HttpStatus.UNAUTHORIZED, "unauthorized", "Autenticação necessária");
    }

    /**
     * Erro vindo da cadeia de filtros, antes de qualquer controller — aqui não há
     * conversor de mensagem disponível, então o ProblemDetail é escrito à mão.
     * Erros de aplicação passam pelo ApiExceptionHandler e são serializados normalmente.
     */
    private void writeProblem(HttpServletResponse response, HttpStatus status, String type, String detail) {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        try {
            response.getWriter().write("""
                    {"type":"%s","title":"%s","status":%d,"detail":"%s"}"""
                    .formatted(PROBLEM_TYPE_BASE + type, status.getReasonPhrase(),
                            status.value(), detail));
        } catch (IOException ignored) {
            // Resposta já comprometida; o status HTTP sozinho informa o cliente.
        }
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecretKey jwtSecretKey() {
        byte[] secret = properties.jwt().secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < GamePlannerProperties.Jwt.MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "gameplanner.jwt.secret precisa de ao menos "
                            + GamePlannerProperties.Jwt.MIN_SECRET_BYTES + " bytes");
        }
        return new SecretKeySpec(secret, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey key) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(key));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey key) {
        return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.cors().allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
