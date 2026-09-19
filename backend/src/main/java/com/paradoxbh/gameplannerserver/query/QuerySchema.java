package com.paradoxbh.gameplannerserver.query;

import java.util.List;

/**
 * O que uma consulta aceita: os campos do filtro e, quando a consulta ordena, as chaves de
 * {@code sort} (com "-" na frente para decrescente).
 */
public record QuerySchema(List<QueryField.Info> fields, List<String> sorts) {
}
