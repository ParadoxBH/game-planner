package com.paradoxbh.gameplannerserver.media.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.paradoxbh.gameplannerserver.media.domain.Media;

public interface MediaRepository extends JpaRepository<Media, String> {

    /** Mídia sem nenhuma ligação na tabela content_media, em nenhum jogo. */
    @Query(value = """
            SELECT m.* FROM media m
            WHERE NOT EXISTS (SELECT 1 FROM content_media l WHERE l.media_id = m.id)
            ORDER BY m.uploaded_at
            """, nativeQuery = true)
    List<Media> findOrphans();
}
