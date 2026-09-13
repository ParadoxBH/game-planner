package com.paradoxbh.gameplannerserver.content.model;

/**
 * Referência textual a outro conteúdo, que pode ainda não estar cadastrado.
 * {@code kind} nulo quando a origem não sabe o tipo.
 */
public record Reference(String kind, String extId) {
}
