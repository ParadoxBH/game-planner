package com.paradoxbh.gameplannerserver.content.model;

/**
 * Referência citada, com nome e ícone quando o alvo está cadastrado. {@code kind} é o tipo citado
 * (nulo quando a origem não diz); {@code resolvedKind}, o tipo encontrado — nulo quando o alvo não
 * está cadastrado.
 */
public record ResolvedReference(String kind, String extId, String resolvedKind, String name, String iconMediaId) {
}
