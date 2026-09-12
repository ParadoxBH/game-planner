package com.paradoxbh.gameplannerserver.identity.web;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.identity.domain.AppUser;
import com.paradoxbh.gameplannerserver.identity.domain.Game;
import com.paradoxbh.gameplannerserver.identity.domain.GameMember;
import com.paradoxbh.gameplannerserver.identity.domain.GameRole;
import com.paradoxbh.gameplannerserver.identity.repo.GameMemberRepository;
import com.paradoxbh.gameplannerserver.identity.repo.GameRepository;
import com.paradoxbh.gameplannerserver.identity.service.CurrentUser;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/v1/games")
public class GameController {

    private final GameRepository games;
    private final GameMemberRepository members;
    private final GameAccess access;
    private final CurrentUser currentUser;

    public GameController(GameRepository games, GameMemberRepository members, GameAccess access,
                          CurrentUser currentUser) {
        this.games = games;
        this.members = members;
        this.access = access;
        this.currentUser = currentUser;
    }

    /** Lista apenas o que o solicitante enxerga. Visitante vê só os de leitura pública. */
    @GetMapping
    @Transactional(readOnly = true)
    public List<GameResponse> list() {
        return games.findVisibleTo(currentUser.usernameOrNull()).stream()
                .map(GameResponse::of)
                .toList();
    }

    @GetMapping("/{gameId}")
    public GameResponse get(@PathVariable String gameId) {
        return GameResponse.of(access.requireReadable(gameId));
    }

    /** Criar jogo é de platform_admin. Quem cria vira owner. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public GameResponse create(@Valid @RequestBody CreateGameRequest request) {
        AppUser admin = currentUser.requirePlatformAdmin();
        if (games.existsById(request.id())) {
            throw ApiException.conflict("Já existe um jogo com o id " + request.id());
        }

        Game game = new Game();
        game.setId(request.id());
        game.setName(request.name());
        game.setSummary(request.summary());
        game.setDescription(request.description());
        games.save(game);

        GameMember owner = new GameMember();
        owner.setGameId(game.getId());
        owner.setUsername(admin.getUsername());
        owner.setRole(GameRole.OWNER.code());
        owner.setGrantedBy(admin.getUsername());
        members.save(owner);

        return GameResponse.of(game);
    }

    /** Políticas e metadados do jogo: só owner. */
    @PatchMapping("/{gameId}")
    @Transactional
    public GameResponse patch(@PathVariable String gameId, @Valid @RequestBody PatchGameRequest request) {
        Game game = access.requireOwner(gameId);

        if (request.name() != null) {
            game.setName(request.name());
        }
        if (request.summary() != null) {
            game.setSummary(request.summary());
        }
        if (request.description() != null) {
            game.setDescription(request.description());
        }
        if (request.status() != null) {
            game.setStatus(requireOneOf(request.status(), "status", "draft", "published", "coming_soon"));
        }
        if (request.readPolicy() != null) {
            game.setReadPolicy(requireOneOf(request.readPolicy(), "readPolicy", "public", "members"));
        }
        if (request.writePolicy() != null) {
            game.setWritePolicy(requireOneOf(request.writePolicy(), "writePolicy", "community", "members"));
        }
        if (request.dailyResetTime() != null) {
            game.setDailyResetTime(LocalTime.parse(request.dailyResetTime()));
        }
        if (request.weeklyResetDay() != null) {
            if (request.weeklyResetDay() < 0 || request.weeklyResetDay() > 6) {
                throw ApiException.badRequest("weeklyResetDay precisa estar entre 0 e 6");
            }
            game.setWeeklyResetDay(request.weeklyResetDay());
        }
        game.setUpdatedAt(Instant.now());

        return GameResponse.of(game);
    }

    private String requireOneOf(String value, String field, String... allowed) {
        for (String option : allowed) {
            if (option.equals(value)) {
                return value;
            }
        }
        throw ApiException.badRequest(field + " precisa ser um de: " + String.join(", ", allowed));
    }

    public record CreateGameRequest(
            @NotBlank @Pattern(regexp = "^[a-z0-9_-]{2,64}$",
                    message = "use 2 a 64 caracteres entre minúsculas, números, hífen ou sublinhado")
            String id,
            @NotBlank @Size(max = 120) String name,
            @Size(max = 500) String summary,
            String description) {
    }

    public record PatchGameRequest(@Size(max = 120) String name, @Size(max = 500) String summary,
                                   String description, String status, String readPolicy,
                                   String writePolicy, String dailyResetTime, Short weeklyResetDay) {
    }

    public record GameResponse(String id, String name, String summary, String description,
                               String status, String readPolicy, String writePolicy,
                               String dailyResetTime, Short weeklyResetDay) {

        static GameResponse of(Game game) {
            return new GameResponse(game.getId(), game.getName(), game.getSummary(),
                    game.getDescription(), game.getStatus(), game.getReadPolicy(),
                    game.getWritePolicy(),
                    game.getDailyResetTime() == null ? null : game.getDailyResetTime().toString(),
                    game.getWeeklyResetDay());
        }
    }
}
