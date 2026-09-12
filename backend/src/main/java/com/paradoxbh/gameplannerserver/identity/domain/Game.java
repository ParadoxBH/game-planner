package com.paradoxbh.gameplannerserver.identity.domain;

import java.time.Instant;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "game")
@Getter
@Setter
public class Game {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    private String summary;
    private String description;
    private String thumbnail;
    private String capsule;
    private String icon;

    /** draft | published | coming_soon */
    @Column(nullable = false)
    private String status = "draft";

    /** public | members — quem enxerga o jogo. */
    @Column(nullable = false)
    private String readPolicy = "public";

    /** community | members — quem edita o conteúdo. */
    @Column(nullable = false)
    private String writePolicy = "members";

    private LocalTime dailyResetTime;
    private Short weeklyResetDay;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    public boolean isPubliclyReadable() {
        return "public".equals(readPolicy);
    }

    public boolean isCommunityWritable() {
        return "community".equals(writePolicy);
    }
}
