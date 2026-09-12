package com.paradoxbh.gameplannerserver.identity.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.paradoxbh.gameplannerserver.identity.domain.Game;

public interface GameRepository extends JpaRepository<Game, String> {

    /**
     * Jogos que o usuário pode enxergar: os de leitura pública, mais aqueles
     * de leitura restrita em que ele é membro. Username nulo = visitante.
     */
    @Query("""
            select g from Game g
            where g.readPolicy = 'public'
               or exists (select 1 from GameMember m
                          where m.gameId = g.id and m.username = :username)
            order by g.name
            """)
    List<Game> findVisibleTo(@Param("username") String username);
}
