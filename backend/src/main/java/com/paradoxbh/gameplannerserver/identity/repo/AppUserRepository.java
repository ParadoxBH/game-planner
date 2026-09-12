package com.paradoxbh.gameplannerserver.identity.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.paradoxbh.gameplannerserver.identity.domain.AppUser;

public interface AppUserRepository extends JpaRepository<AppUser, String> {
}
