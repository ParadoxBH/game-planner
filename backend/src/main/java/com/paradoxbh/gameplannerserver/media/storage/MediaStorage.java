package com.paradoxbh.gameplannerserver.media.storage;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Optional;

import org.springframework.core.io.Resource;

import com.paradoxbh.gameplannerserver.media.domain.MediaVariant;

/**
 * Onde ficam os bytes das imagens. Hoje, disco (volume Docker em produção);
 * a interface existe para trocar por S3 sem mexer no serviço.
 */
public interface MediaStorage {

    /**
     * Grava o arquivo da variante e devolve a chave para lê-lo depois.
     * Idempotente: o nome é derivado do hash, então a mesma chave tem sempre os mesmos bytes.
     */
    String store(String mediaId, MediaVariant variant, Path source) throws IOException;

    Optional<Resource> load(String key);

    void delete(String key) throws IOException;
}
