package com.paradoxbh.gameplannerserver.identity.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.paradoxbh.gameplannerserver.identity.domain.GameMember;

public interface GameMemberRepository extends JpaRepository<GameMember, GameMember.Key> {

    List<GameMember> findByGameIdOrderByUsername(String gameId);

    List<GameMember> findByUsername(String username);

    Optional<GameMember> findByGameIdAndUsername(String gameId, String username);

    long countByGameIdAndRole(String gameId, String role);
}
