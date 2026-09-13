package com.paradoxbh.gameplannerserver.media.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.paradoxbh.gameplannerserver.media.domain.Media;

public interface MediaRepository extends JpaRepository<Media, String> {
}
