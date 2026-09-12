package com.paradoxbh.gameplannerserver.identity.web;

import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.identity.domain.AppUser;
import com.paradoxbh.gameplannerserver.identity.domain.GameMember;
import com.paradoxbh.gameplannerserver.identity.repo.GameMemberRepository;
import com.paradoxbh.gameplannerserver.identity.service.AuthService;
import com.paradoxbh.gameplannerserver.identity.service.CurrentUser;
import com.paradoxbh.gameplannerserver.identity.service.TokenService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;
    private final TokenService tokens;
    private final CurrentUser currentUser;
    private final GameMemberRepository members;

    public AuthController(AuthService auth, TokenService tokens, CurrentUser currentUser,
                          GameMemberRepository members) {
        this.auth = auth;
        this.tokens = tokens;
        this.currentUser = currentUser;
        this.members = members;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse register(@Valid @RequestBody RegisterRequest request) {
        AppUser user = auth.register(request.username(), request.password(), request.displayName());
        return tokensFor(user);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return tokensFor(auth.authenticate(request.username(), request.password()));
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return tokensFor(auth.refresh(request.refreshToken()));
    }

    @GetMapping("/me")
    public MeResponse me() {
        AppUser user = currentUser.require();
        Map<String, String> roles = members.findByUsername(user.getUsername()).stream()
                .collect(Collectors.toMap(GameMember::getGameId, GameMember::getRole));

        return new MeResponse(user.getUsername(), user.getDisplayName(), user.isVerified(),
                user.getStatus(), user.isPlatformAdmin(), roles);
    }

    private TokenResponse tokensFor(AppUser user) {
        return new TokenResponse(
                tokens.issueAccessToken(user.getUsername()),
                tokens.issueRefreshToken(user.getUsername()),
                tokens.accessTokenSeconds());
    }

    public record RegisterRequest(
            @NotBlank @Pattern(regexp = "^[a-zA-Z0-9_.-]{3,32}$",
                    message = "use 3 a 32 caracteres entre letras, números, ponto, hífen ou sublinhado")
            String username,

            @NotBlank @Size(min = 10, max = 128, message = "a senha precisa de ao menos 10 caracteres")
            String password,

            @Size(max = 64) String displayName) {
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record TokenResponse(String accessToken, String refreshToken, long expiresInSeconds) {
    }

    /** {@code roles} mapeia gameId para o papel do usuário naquele jogo. */
    public record MeResponse(String username, String displayName, boolean verified, String status,
                             boolean platformAdmin, Map<String, String> roles) {
    }
}
