package com.paradoxbh.gameplannerserver.identity.web;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.identity.domain.AppUser;
import com.paradoxbh.gameplannerserver.identity.repo.AppUserRepository;
import com.paradoxbh.gameplannerserver.identity.service.CurrentUser;

import jakarta.validation.Valid;

/**
 * Administração de contas. Enquanto o sistema de vínculo não existe, é aqui que
 * um platform_admin liga a flag {@code verified} que libera escrita.
 */
@RestController
@RequestMapping("/api/v1/users")
public class UserAdminController {

    private final AppUserRepository users;
    private final CurrentUser currentUser;

    public UserAdminController(AppUserRepository users, CurrentUser currentUser) {
        this.users = users;
        this.currentUser = currentUser;
    }

    @PatchMapping("/{username}")
    @Transactional
    public UserResponse patch(@PathVariable String username, @Valid @RequestBody PatchUserRequest request) {
        AppUser admin = currentUser.requirePlatformAdmin();

        AppUser user = users.findById(username)
                .orElseThrow(() -> ApiException.notFound("Usuário " + username));

        if (request.verified() != null) {
            user.setVerified(request.verified());
        }
        if (request.status() != null) {
            if (!"active".equals(request.status()) && !"suspended".equals(request.status())) {
                throw ApiException.badRequest("status precisa ser active ou suspended");
            }
            if (user.getUsername().equals(admin.getUsername()) && "suspended".equals(request.status())) {
                throw ApiException.badRequest("Um administrador não pode suspender a própria conta");
            }
            user.setStatus(request.status());
        }

        return new UserResponse(user.getUsername(), user.getDisplayName(), user.isVerified(),
                user.getStatus(), user.isPlatformAdmin());
    }

    public record PatchUserRequest(Boolean verified, String status) {
    }

    public record UserResponse(String username, String displayName, boolean verified, String status,
                               boolean platformAdmin) {
    }
}
