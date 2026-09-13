package com.paradoxbh.gameplannerserver.content.store;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;

import com.paradoxbh.gameplannerserver.content.model.Reference;

/** Leitura tipada de uma linha devolvida como mapa (coluna → valor JDBC). */
final class Rows {

    private Rows() {
    }

    static String string(Map<String, Object> row, String column) {
        Object value = row.get(column);
        return value == null ? null : value.toString();
    }

    static Integer integer(Map<String, Object> row, String column) {
        Object value = row.get(column);
        return value == null ? null : ((Number) value).intValue();
    }

    static BigDecimal decimal(Map<String, Object> row, String column) {
        Object value = row.get(column);
        if (value == null) {
            return null;
        }
        return value instanceof BigDecimal decimal ? decimal : new BigDecimal(value.toString());
    }

    static Boolean bool(Map<String, Object> row, String column) {
        Object value = row.get(column);
        return value == null ? null : (Boolean) value;
    }

    /** Referência gravada em duas colunas; nula quando não há código. */
    static Reference reference(Map<String, Object> row, String kindColumn, String extIdColumn) {
        String extId = string(row, extIdColumn);
        return extId == null ? null : new Reference(string(row, kindColumn), extId);
    }

    static Instant instant(Map<String, Object> row, String column) {
        Object value = row.get(column);
        if (value == null) {
            return null;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toInstant();
        }
        if (value instanceof OffsetDateTime dateTime) {
            return dateTime.toInstant();
        }
        throw new IllegalStateException("Coluna " + column + " não é timestamp: " + value.getClass());
    }

    static LocalDate date(Map<String, Object> row, String column) {
        Object value = row.get(column);
        if (value == null) {
            return null;
        }
        if (value instanceof java.sql.Date date) {
            return date.toLocalDate();
        }
        if (value instanceof LocalDate date) {
            return date;
        }
        throw new IllegalStateException("Coluna " + column + " não é data: " + value.getClass());
    }
}
