package com.paradoxbh.gameplannerserver.identity.domain;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Vínculo de um usuário com um jogo. Chave natural composta, sem id artificial. */
@Entity
@Table(name = "game_member")
@IdClass(GameMember.Key.class)
@Getter
@Setter
public class GameMember {

    @Id
    private String gameId;

    @Id
    private String username;

    /** owner | moderator | editor */
    @Column(nullable = false)
    private String role;

    private String grantedBy;

    @Column(nullable = false)
    private Instant grantedAt = Instant.now();

    public GameRole roleAsEnum() {
        return GameRole.fromCode(role);
    }

    @Getter
    @Setter
    public static class Key implements Serializable {
        private String gameId;
        private String username;

        public Key() {
        }

        public Key(String gameId, String username) {
            this.gameId = gameId;
            this.username = username;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof Key key)) {
                return false;
            }
            return Objects.equals(gameId, key.gameId) && Objects.equals(username, key.username);
        }

        @Override
        public int hashCode() {
            return Objects.hash(gameId, username);
        }
    }
}
