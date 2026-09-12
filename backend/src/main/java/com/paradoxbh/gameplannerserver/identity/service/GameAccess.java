package com.paradoxbh.gameplannerserver.identity.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.identity.domain.AppUser;
import com.paradoxbh.gameplannerserver.identity.domain.Game;
import com.paradoxbh.gameplannerserver.identity.domain.GameRole;
import com.paradoxbh.gameplannerserver.identity.repo.GameMemberRepository;
import com.paradoxbh.gameplannerserver.identity.repo.GameRepository;

/**
 * A matriz de autorização de doc/backend_plan.md 4.2, num lugar só.
 *
 * Permissão é sempre por jogo e sempre consultada no banco — nunca vem do token.
 */
@Service
@Transactional(readOnly = true)
public class GameAccess {

    private final GameRepository games;
    private final GameMemberRepository members;
    private final CurrentUser currentUser;

    public GameAccess(GameRepository games, GameMemberRepository members, CurrentUser currentUser) {
        this.games = games;
        this.members = members;
        this.currentUser = currentUser;
    }

    /** O jogo, se o solicitante puder enxergá-lo. Caso contrário 404 — não 403. */
    public Game requireReadable(String gameId) {
        Game game = games.findById(gameId).orElseThrow(() -> ApiException.notFound("Jogo"));
        if (game.isPubliclyReadable()) {
            return game;
        }
        // Jogo de leitura restrita responde 404 para quem não é membro: 403 revelaria
        // que o jogo existe, que é justamente o que read_policy=members quer esconder.
        String username = currentUser.usernameOrNull();
        if (username != null && roleOf(gameId, username).isPresent()) {
            return game;
        }
        throw ApiException.notFound("Jogo");
    }

    /** Quem pode criar e editar conteúdo do jogo. */
    public Game requireWritable(String gameId) {
        Game game = requireReadable(gameId);
        AppUser user = currentUser.requireWriter();

        if (game.isCommunityWritable()) {
            return game;
        }
        requireRole(game.getId(), user, GameRole.EDITOR);
        return game;
    }

    /** Quem pode apagar conteúdo e restaurar revisões. */
    public Game requireModerator(String gameId) {
        Game game = requireReadable(gameId);
        requireRole(game.getId(), currentUser.requireWriter(), GameRole.MODERATOR);
        return game;
    }

    /** Quem pode gerir membros e mudar as políticas do jogo. */
    public Game requireOwner(String gameId) {
        Game game = requireReadable(gameId);
        requireRole(game.getId(), currentUser.requireWriter(), GameRole.OWNER);
        return game;
    }

    public Optional<GameRole> roleOf(String gameId, String username) {
        return members.findByGameIdAndUsername(gameId, username).map(m -> m.roleAsEnum());
    }

    private void requireRole(String gameId, AppUser user, GameRole required) {
        // platform_admin atravessa a hierarquia de papéis: é quem cria os jogos
        // e precisa poder destravar um jogo cujo owner sumiu.
        if (user.isPlatformAdmin()) {
            return;
        }
        GameRole role = roleOf(gameId, user.getUsername())
                .orElseThrow(() -> ApiException.forbidden("Você não é membro deste jogo"));
        if (!role.atLeast(required)) {
            throw ApiException.forbidden(
                    "Ação exige papel " + required.code() + " neste jogo");
        }
    }
}
