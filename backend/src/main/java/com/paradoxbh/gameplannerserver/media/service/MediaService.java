package com.paradoxbh.gameplannerserver.media.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.config.GamePlannerProperties;
import com.paradoxbh.gameplannerserver.identity.domain.AppUser;
import com.paradoxbh.gameplannerserver.media.domain.Media;
import com.paradoxbh.gameplannerserver.media.domain.MediaFile;
import com.paradoxbh.gameplannerserver.media.domain.MediaVariant;
import com.paradoxbh.gameplannerserver.media.repo.MediaRepository;
import com.paradoxbh.gameplannerserver.media.storage.MediaStorage;
import com.paradoxbh.gameplannerserver.media.transcode.Dimensions;
import com.paradoxbh.gameplannerserver.media.transcode.FfmpegTranscoder;
import com.paradoxbh.gameplannerserver.media.transcode.ProbeResult;

@Service
public class MediaService {

    private static final Logger log = LoggerFactory.getLogger(MediaService.class);

    private final MediaRepository repository;
    private final MediaStorage storage;
    private final FfmpegTranscoder transcoder;
    private final GamePlannerProperties.Media config;

    public MediaService(MediaRepository repository, MediaStorage storage, FfmpegTranscoder transcoder,
                        GamePlannerProperties properties) {
        this.repository = repository;
        this.storage = storage;
        this.transcoder = transcoder;
        this.config = properties.media();
    }

    public record UploadResult(Media media, boolean created) {
    }

    public record StoredFile(Resource resource, long byteSize) {
    }

    /**
     * Identifica, converte, deduplica e grava. O trabalho pesado (FFmpeg) acontece fora
     * de transação de banco; só a gravação final toca o banco.
     */
    public UploadResult upload(MultipartFile file, String uploadedBy) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Envie a imagem no campo 'file'");
        }

        Path workDir = createWorkDir();
        try {
            // Sem extensão: o formato é decidido pelo ffprobe, nunca pelo nome enviado.
            Path source = workDir.resolve("source");
            file.transferTo(source);

            ProbeResult probe = transcoder.probe(source);
            enforceLimits(probe);

            Map<MediaVariant, Path> outputs = new EnumMap<>(MediaVariant.class);
            Map<MediaVariant, Dimensions> sizes = new EnumMap<>(MediaVariant.class);
            for (MediaVariant variant : MediaVariant.values()) {
                Dimensions size = Dimensions.fit(probe.width(), probe.height(), maxSide(variant));
                Path output = workDir.resolve(variant.code() + ".webp");
                transcoder.toWebp(source, probe, size, output);
                outputs.put(variant, output);
                sizes.put(variant, size);
            }

            String id = sha256(outputs.get(MediaVariant.FULL));
            Optional<Media> existing = repository.findById(id);
            if (existing.isPresent()) {
                return new UploadResult(existing.get(), false);
            }

            Media media = new Media();
            media.setId(id);
            media.setWidth(probe.width());
            media.setHeight(probe.height());
            media.setAnimated(probe.animated());
            media.setSourceName(truncate(file.getOriginalFilename(), 255));
            media.setSourceFormat(probe.format());
            media.setSourceBytes(file.getSize());
            media.setUploadedBy(uploadedBy);

            for (MediaVariant variant : MediaVariant.values()) {
                Path output = outputs.get(variant);
                Dimensions size = sizes.get(variant);
                String key = storage.store(id, variant, output);
                media.getVariants().put(variant.code(),
                        new MediaFile(size.width(), size.height(), Files.size(output), key));
            }

            try {
                return new UploadResult(repository.saveAndFlush(media), true);
            } catch (DataIntegrityViolationException race) {
                // A mesma imagem chegou ao mesmo tempo por outra requisição, que gravou primeiro.
                return repository.findById(id)
                        .map(winner -> new UploadResult(winner, false))
                        .orElseThrow(() -> race);
            }
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        } finally {
            // O arquivo original some aqui: só o WebP gerado sobrevive ao upload.
            deleteRecursively(workDir);
        }
    }

    public Media find(String id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("Mídia"));
    }

    public Optional<StoredFile> openVariant(String id, MediaVariant variant) {
        return repository.findById(id)
                .map(media -> media.getVariants().get(variant.code()))
                .flatMap(file -> storage.load(file.getStoragePath())
                        .map(resource -> new StoredFile(resource, file.getByteSize())));
    }

    /**
     * Quem enviou, ou um admin da plataforma. Moderador de jogo não entra aqui: a mídia é
     * compartilhada entre jogos (mesmo hash, mesma linha), então não pertence a nenhum.
     */
    public void delete(String id, AppUser actor) {
        Media media = find(id);
        if (!actor.isPlatformAdmin() && !actor.getUsername().equals(media.getUploadedBy())) {
            throw ApiException.forbidden("Só quem enviou a imagem ou um administrador da plataforma pode apagá-la");
        }

        repository.deleteById(id);

        // Arquivos só depois do banco: se o DELETE falhar, a imagem continua íntegra.
        for (MediaFile file : media.getVariants().values()) {
            try {
                storage.delete(file.getStoragePath());
            } catch (IOException | IllegalArgumentException ex) {
                log.warn("Não foi possível apagar o arquivo {}: {}", file.getStoragePath(), ex.getMessage());
            }
        }
    }

    private void enforceLimits(ProbeResult probe) {
        long maxPixels = config.maxMegapixels() * 1_000_000L;
        if (probe.pixels() > maxPixels) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "media-too-large",
                    "Imagem de %dx%d passa do limite de %d megapixels"
                            .formatted(probe.width(), probe.height(), config.maxMegapixels()));
        }
        if (probe.frames() > config.maxFrames()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "media-too-many-frames",
                    "Animação com %d quadros passa do limite de %d"
                            .formatted(probe.frames(), config.maxFrames()));
        }
    }

    private int maxSide(MediaVariant variant) {
        return switch (variant) {
            case ICON -> config.iconSize();
            case THUMB -> config.thumbSize();
            case FULL -> config.fullSize();
        };
    }

    private static String sha256(Path file) throws IOException {
        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
        try (InputStream in = Files.newInputStream(file)) {
            byte[] buffer = new byte[64 * 1024];
            for (int read; (read = in.read(buffer)) != -1; ) {
                digest.update(buffer, 0, read);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }

    private static Path createWorkDir() {
        try {
            return Files.createTempDirectory("gp-media-");
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static void deleteRecursively(Path dir) {
        try (Stream<Path> paths = Files.walk(dir)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // Fica para a limpeza de temporários do sistema.
                }
            });
        } catch (IOException ignored) {
            // Diretório já não existe.
        }
    }
}
