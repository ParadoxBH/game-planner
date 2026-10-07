package com.paradoxbh.gameplannerserver.content.store;

import java.util.Map;

import com.paradoxbh.gameplannerserver.content.model.Drop;
import com.paradoxbh.gameplannerserver.content.model.RecipeUnlock;
import com.paradoxbh.gameplannerserver.content.model.Requirement;

/**
 * Linhas-filhas com a mesma forma em mais de uma tabela: requisito (ingrediente de receita,
 * requisito de entidade e de atalho), drop (de entidade e de ponto de spawn) e desbloqueio (de receita
 * e de atalho).
 */
final class ChildMappers {

    private ChildMappers() {
    }

    static Map<String, Object> requirementRow(Requirement requirement) {
        return ChildRows.row(
                "target_kind", requirement.target().kind(),
                "target_ext_id", requirement.target().extId(),
                "amount", requirement.amount(),
                "not_consumed", requirement.notConsumed(),
                "level", requirement.level(),
                "level_operator", requirement.levelOperator());
    }

    static Requirement requirement(Map<String, Object> row) {
        return new Requirement(Rows.reference(row, "target_kind", "target_ext_id"), Rows.decimal(row, "amount"),
                Rows.bool(row, "not_consumed"), Rows.integer(row, "level"), Rows.string(row, "level_operator"));
    }

    static Map<String, Object> dropRow(Drop drop) {
        return ChildRows.row(
                "target_kind", drop.target().kind(),
                "target_ext_id", drop.target().extId(),
                "chance", drop.chance(),
                "amount", drop.amount(),
                "max_amount", drop.maxAmount());
    }

    static Drop drop(Map<String, Object> row) {
        return new Drop(Rows.reference(row, "target_kind", "target_ext_id"), Rows.decimal(row, "chance"),
                Rows.decimal(row, "amount"), Rows.decimal(row, "max_amount"));
    }

    static Map<String, Object> unlockRow(RecipeUnlock unlock) {
        return ChildRows.row(
                "unlock_type", unlock.type(),
                "target_kind", unlock.target() == null ? null : unlock.target().kind(),
                "target_ext_id", unlock.target() == null ? null : unlock.target().extId(),
                "value", unlock.value());
    }

    static RecipeUnlock unlock(Map<String, Object> row) {
        return new RecipeUnlock(Rows.string(row, "unlock_type"), Rows.reference(row, "target_kind", "target_ext_id"),
                Rows.string(row, "value"));
    }
}
