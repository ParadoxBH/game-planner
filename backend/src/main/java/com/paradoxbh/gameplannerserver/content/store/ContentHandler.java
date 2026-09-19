package com.paradoxbh.gameplannerserver.content.store;

import java.util.Optional;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentDocument;
import com.paradoxbh.gameplannerserver.content.model.ContentPage;
import com.paradoxbh.gameplannerserver.content.model.ContentQuery;
import com.paradoxbh.gameplannerserver.query.QuerySchema;

/**
 * Persistência de um tipo de conteúdo. Sem regra de negócio nem autorização: isso fica
 * no ContentService, que é igual para todos os tipos.
 */
public interface ContentHandler<D extends ContentDocument<D>> {

    ContentKind kind();

    Class<D> documentType();

    Optional<D> find(String gameId, String extId);

    boolean exists(String gameId, String extId);

    ContentPage<D> list(String gameId, ContentQuery query);

    /** Campos que o filtro da listagem aceita e chaves de ordenação. */
    QuerySchema querySchema();

    /** Etiquetas que o documento carrega; tipos sem categoria ou atributo devolvem listas vazias. */
    ContentTags tagsOf(D document);

    void insert(String gameId, D document, String actor);

    void update(String gameId, D document, String actor);

    void delete(String gameId, String extId);
}
