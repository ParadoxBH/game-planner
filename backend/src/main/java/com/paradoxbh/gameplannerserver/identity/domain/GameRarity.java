package com.paradoxbh.gameplannerserver.identity.domain;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Raridade declarada por jogo. Era um mapa jsonb solto em games.json;
 * como tabela, vira editável e o rarity_code do conteúdo passa a ter
 * significado verificável. Ver doc/backend_plan.md 4.5.
 */
@Entity
@Table(name = "game_rarity")
@IdClass(GameRarity.Key.class)
@Getter
@Setter
public class GameRarity {

    @Id
    private String gameId;

    @Id
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String color;

    @Column(nullable = false)
    private int ordinal;

    @Getter
    @Setter
    public static class Key implements Serializable {
        private String gameId;
        private String code;

        public Key() {
        }

        public Key(String gameId, String code) {
            this.gameId = gameId;
            this.code = code;
        }

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof Key key)) {
                return false;
            }
            return Objects.equals(gameId, key.gameId) && Objects.equals(code, key.code);
        }

        @Override
        public int hashCode() {
            return Objects.hash(gameId, code);
        }
    }
}
