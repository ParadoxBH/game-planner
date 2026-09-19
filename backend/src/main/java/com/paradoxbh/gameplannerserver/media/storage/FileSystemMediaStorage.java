package com.paradoxbh.gameplannerserver.media.storage;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.UUID;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.config.GamePlannerProperties;
import com.paradoxbh.gameplannerserver.media.domain.MediaVariant;

@Component
public class FileSystemMediaStorage implements MediaStorage {

    private final Path root;

    public FileSystemMediaStorage(GamePlannerProperties properties) throws IOException {
        this.root = Path.of(properties.media().storagePath()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    /**
     * ab/cd/abcd…_icon.webp — derivado só do hash, nunca de nome enviado pelo usuário.
     * Os dois níveis de pasta evitam um diretório com dezenas de milhares de arquivos.
     */
    static String keyFor(String mediaId, MediaVariant variant) {
        return mediaId.substring(0, 2) + "/" + mediaId.substring(2, 4) + "/"
                + mediaId + "_" + variant.code() + ".webp";
    }

    @Override
    public String store(String mediaId, MediaVariant variant, Path source) throws IOException {
        String key = keyFor(mediaId, variant);
        Path target = resolve(key);
        if (Files.isRegularFile(target)) {
            return key;
        }

        Files.createDirectories(target.getParent());
        // Grava ao lado e move de uma vez: quem pedir a URL nunca recebe arquivo pela metade.
        // O temporário tem nome próprio por chamada: duas requisições com a mesma imagem chegam juntas
        // (o id é o hash do conteúdo) e, com um .part em comum, uma sobrescrevia ou movia o da outra.
        Path partial = target.resolveSibling(target.getFileName() + "." + UUID.randomUUID() + ".part");
        try {
            Files.copy(source, partial);
            try {
                Files.move(partial, target, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException ex) {
                Files.move(partial, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            // A outra requisição venceu: no Windows, substituir o arquivo que ela acabou de gravar (ou que
            // alguém está lendo) falha. O conteúdo é o mesmo, porque a chave vem do hash.
            if (!Files.isRegularFile(target)) {
                throw ex;
            }
        } finally {
            Files.deleteIfExists(partial);
        }
        return key;
    }

    @Override
    public Optional<Resource> load(String key) {
        Path file = resolve(key);
        return Files.isRegularFile(file) ? Optional.of(new FileSystemResource(file)) : Optional.empty();
    }

    @Override
    public void delete(String key) throws IOException {
        Files.deleteIfExists(resolve(key));
    }

    /** A chave vem do banco, mas ainda assim nunca pode escapar da raiz de mídia. */
    private Path resolve(String key) {
        Path file = root.resolve(key).normalize();
        if (!file.startsWith(root)) {
            throw new IllegalArgumentException("Chave fora do diretório de mídia: " + key);
        }
        return file;
    }
}
