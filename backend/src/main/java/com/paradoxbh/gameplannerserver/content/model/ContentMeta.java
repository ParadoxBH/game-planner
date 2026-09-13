package com.paradoxbh.gameplannerserver.content.model;

import java.time.Instant;

/** Metadados de auditoria. {@code revision} é o número da revisão mais recente. */
public record ContentMeta(String createdBy, String updatedBy, Instant createdAt, Instant updatedAt, int revision) {
}
