package com.paradoxbh.gameplannerserver.query;

import static com.paradoxbh.gameplannerserver.query.Operator.BEGINS_WITH;
import static com.paradoxbh.gameplannerserver.query.Operator.BETWEEN;
import static com.paradoxbh.gameplannerserver.query.Operator.CONTAINS;
import static com.paradoxbh.gameplannerserver.query.Operator.ENDS_WITH;
import static com.paradoxbh.gameplannerserver.query.Operator.EQUAL;
import static com.paradoxbh.gameplannerserver.query.Operator.GREATER;
import static com.paradoxbh.gameplannerserver.query.Operator.GREATER_OR_EQUAL;
import static com.paradoxbh.gameplannerserver.query.Operator.IN;
import static com.paradoxbh.gameplannerserver.query.Operator.INTERSECTS;
import static com.paradoxbh.gameplannerserver.query.Operator.IS_NOT_NULL;
import static com.paradoxbh.gameplannerserver.query.Operator.IS_NULL;
import static com.paradoxbh.gameplannerserver.query.Operator.LESS;
import static com.paradoxbh.gameplannerserver.query.Operator.LESS_OR_EQUAL;
import static com.paradoxbh.gameplannerserver.query.Operator.NOT_CONTAINS;
import static com.paradoxbh.gameplannerserver.query.Operator.NOT_EQUAL;
import static com.paradoxbh.gameplannerserver.query.Operator.NOT_IN;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonValue;
import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.model.Reference;

/**
 * Tipo do valor de um campo: diz quais operadores o campo aceita e como o valor do JSON vira
 * parâmetro SQL.
 *
 * {@code code} é o código de outro registro, com o tipo dele em {@link QueryField#kind()};
 * {@code reference} é "tipo:id", ou só "id" para casar com qualquer tipo; {@code enum} tem as
 * opções em {@link QueryField#options()}.
 */
public enum FieldType {
    TEXT(EQUAL, NOT_EQUAL, IN, NOT_IN, CONTAINS, NOT_CONTAINS, BEGINS_WITH, ENDS_WITH, IS_NULL, IS_NOT_NULL),
    NUMBER(EQUAL, NOT_EQUAL, IN, NOT_IN, LESS, LESS_OR_EQUAL, GREATER, GREATER_OR_EQUAL, BETWEEN, IS_NULL,
            IS_NOT_NULL),
    /** Data sem hora, "2026-09-18". */
    DATE(EQUAL, NOT_EQUAL, LESS, LESS_OR_EQUAL, GREATER, GREATER_OR_EQUAL, BETWEEN, IS_NULL, IS_NOT_NULL),
    /** Instante ISO-8601 com fuso, "2026-09-18T12:00:00Z". */
    DATETIME(LESS, LESS_OR_EQUAL, GREATER, GREATER_OR_EQUAL, BETWEEN, IS_NULL, IS_NOT_NULL),
    BOOLEAN(EQUAL),
    ENUM(EQUAL, NOT_EQUAL, IN, NOT_IN),
    CODE(EQUAL, NOT_EQUAL, IN, NOT_IN, IS_NULL, IS_NOT_NULL),
    REFERENCE(EQUAL, NOT_EQUAL, IN, NOT_IN, IS_NULL, IS_NOT_NULL),
    /** Posição ou área no mapa. */
    GEOMETRY(INTERSECTS, IS_NULL, IS_NOT_NULL);

    /** Texto de busca maior que isso não é filtro, é engano. */
    private static final int MAX_TEXT = 500;

    private final List<Operator> operators;

    FieldType(Operator... operators) {
        this.operators = List.of(operators);
    }

    @JsonValue
    public String code() {
        return name().toLowerCase();
    }

    public List<Operator> operators() {
        return operators;
    }

    /** Converte um valor do JSON para o parâmetro SQL; {@code path} identifica a regra na mensagem de erro. */
    Object convert(Object value, String path) {
        if (value == null) {
            throw ApiException.badRequest(path + ": value é obrigatório");
        }
        return switch (this) {
            case TEXT, ENUM -> text(value, path);
            case NUMBER -> number(value, path);
            case GEOMETRY -> number(value, path).doubleValue();
            case DATE -> date(value, path);
            case DATETIME -> dateTime(value, path);
            case BOOLEAN -> bool(value, path);
            case CODE -> ExtIds.require(text(value, path), path);
            case REFERENCE -> Reference.parse(text(value, path), path);
        };
    }

    private static String text(Object value, String path) {
        if (!(value instanceof String text)) {
            throw ApiException.badRequest(path + ": value precisa ser texto");
        }
        if (text.length() > MAX_TEXT) {
            throw ApiException.badRequest(path + ": value passa de " + MAX_TEXT + " caracteres");
        }
        return text;
    }

    private static BigDecimal number(Object value, String path) {
        try {
            if (value instanceof Number || value instanceof String) {
                return new BigDecimal(value.toString().strip());
            }
        } catch (NumberFormatException ex) {
            // cai na mensagem abaixo
        }
        throw ApiException.badRequest(path + ": value precisa ser número");
    }

    private static LocalDate date(Object value, String path) {
        try {
            return LocalDate.parse(text(value, path));
        } catch (DateTimeParseException ex) {
            throw ApiException.badRequest(path + ": value precisa ser data no formato 2026-09-18");
        }
    }

    private static OffsetDateTime dateTime(Object value, String path) {
        try {
            return OffsetDateTime.parse(text(value, path));
        } catch (DateTimeParseException ex) {
            throw ApiException.badRequest(path + ": value precisa ser instante ISO-8601 com fuso, ex.: "
                    + "2026-09-18T12:00:00Z");
        }
    }

    private static Boolean bool(Object value, String path) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        throw ApiException.badRequest(path + ": value precisa ser true ou false");
    }
}
