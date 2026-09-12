package com.paradoxbh.gameplannerserver.identity.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.identity.domain.AppUser;
import com.paradoxbh.gameplannerserver.identity.domain.GameMember;
import com.paradoxbh.gameplannerserver.identity.domain.GameRole;
import com.paradoxbh.gameplannerserver.identity.repo.AppUserRepository;
import com.paradoxbh.gameplannerserver.identity.repo.GameMemberRepository;
import com.paradoxbh.gameplannerserver.identity.service.CurrentUser;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/v1/games/{gameId}/members")
public class GameMemberController {

    private final GameMemberRepository members;
    private final AppUserRepository users;
    private final GameAccess access;
    private final CurrentUser currentUser;

    public GameMemberController(GameMemberRepository members, AppUserRepository users,
                                GameAccess access, CurrentUser currentUser) {
        this.members = members;
        this.users = users;
        this.access = access;
        this.currentUser = currentUser;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<MemberResponse> list(@PathVariable String gameId) {
        access.requireReadable(gameId);
        return members.findByGameIdOrderByUsername(gameId).stream()
                .map(m -> new MemberResponse(m.getUsername(), m.getRole(), m.getGrantedBy()))
                .toList();
    }

    @PutMapping("/{username}")
    @Transactional
    public MemberResponse grant(@PathVariable String gameId, @PathVariable String username,
                                @Valid @RequestBody GrantRequest request) {
        access.requireOwner(gameId);
        AppUser actor = currentUser.require();

        GameRole role = parseRole(request.role());
        if (!users.existsById(username)) {
            throw ApiException.notFound("Usuário " + username);
        }

        GameMember existing = members.findByGameIdAndUsername(gameId, username).orElse(null);
        if (existing != null && existing.roleAsEnum() == GameRole.OWNER && role != GameRole.OWNER) {
            requireAnotherOwnerRemains(gameId, username);
        }

        GameMember member = existing != null ? existing : new GameMember();
        member.setGameId(gameId);
        member.setUsername(username);
        member.setRole(role.code());
        member.setGrantedBy(actor.getUsername());
        members.save(member);

        return new MemberResponse(username, role.code(), actor.getUsername());
    }

    @DeleteMapping("/{username}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void revoke(@PathVariable String gameId, @PathVariable String username) {
        access.requireOwner(gameId);

        GameMember member = members.findByGameIdAndUsername(gameId, username)
                .orElseThrow(() -> ApiException.notFound("Membro " + username));

        if (member.roleAsEnum() == GameRole.OWNER) {
            requireAnotherOwnerRemains(gameId, username);
        }
        members.delete(member);
    }

    /** Um jogo sem owner não teria como voltar a ter: só owner concede papéis. */
    private void requireAnotherOwnerRemains(String gameId, String username) {
        if (members.countByGameIdAndRole(gameId, GameRole.OWNER.code()) <= 1) {
            throw ApiException.conflict(
                    "O jogo ficaria sem owner. Promova outro membro antes de remover " + username);
        }
    }

    private GameRole parseRole(String role) {
        try {
            return GameRole.fromCode(role);
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("role precisa ser um de: owner, moderator, editor");
        }
    }

    public record GrantRequest(@NotBlank String role) {
    }

    public record MemberResponse(String username, String role, String grantedBy) {
    }
}
