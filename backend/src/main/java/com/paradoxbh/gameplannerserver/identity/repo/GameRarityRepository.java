package com.paradoxbh.gameplannerserver.identity.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.paradoxbh.gameplannerserver.identity.domain.GameRarity;

public interface GameRarityRepository extends JpaRepository<GameRarity, GameRarity.Key> {

    List<GameRarity> findByGameIdOrderByOrdinal(String gameId);
}
