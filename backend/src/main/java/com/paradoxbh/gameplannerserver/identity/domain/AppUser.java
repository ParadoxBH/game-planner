package com.paradoxbh.gameplannerserver.identity.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "app_user")
@Getter
@Setter
public class AppUser {

    @Id
    private String username;

    @Column(nullable = false)
    private String passwordHash;

    private String displayName;

    /**
     * A flag "autenticado": o usuário tem vínculo válido com algo externo.
     * Hoje é ligada à mão por um platform_admin; quando o sistema de vínculo
     * existir, passa a ser derivada dele. Ver doc/backend_plan.md 4.2.
     */
    @Column(nullable = false)
    private boolean verified;

    @Column(nullable = false)
    private String status = "active";

    @Column(nullable = false)
    private boolean platformAdmin;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public boolean isActive() {
        return "active".equals(status);
    }

    /** Escrever exige conta ativa e com vínculo. */
    public boolean canWrite() {
        return isActive() && verified;
    }
}
