package com.paradoxbh.gameplannerserver.media.transcode;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeoutException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.config.GamePlannerProperties;

@Component
public class FfmpegTranscoder {

    private static final Logger log = LoggerFactory.getLogger(FfmpegTranscoder.class);

    /**
     * Demuxers aceitos. Lista fechada, aplicada ao ffprobe e ao ffmpeg por
     * -format_whitelist. Sem ela, um arquivo "imagem" que na verdade é uma playlist HLS
     * ou um script concat faria o FFmpeg abrir arquivos locais do servidor — e olhar a
     * extensão não protege, porque o FFmpeg decide o formato pelo conteúdo.
     */
    static final List<String> ALLOWED_FORMATS = List.of("png_pipe", "jpeg_pipe", "webp_pipe", "gif", "gif_pipe");

    private static final String FORMAT_WHITELIST = String.join(",", ALLOWED_FORMATS);
    private static final String UNSUPPORTED = "Formato não suportado. Envie PNG, JPEG, WebP ou GIF.";

    private final GamePlannerProperties.Media config;

    public FfmpegTranscoder(GamePlannerProperties properties) {
        this.config = properties.media();
    }

    public ProbeResult probe(Path source) {
        ProcessRunner.Result result = run(List.of(
                config.ffprobePath(),
                "-v", "error",
                "-protocol_whitelist", "file",
                "-format_whitelist", FORMAT_WHITELIST,
                "-count_packets",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_name,width,height,nb_read_packets:format=format_name",
                "-of", "default=noprint_wrappers=1",
                source.toString()));

        ProbeResult probe = ProbeResult.parse(result.stdout());
        if (result.exitCode() != 0
                || !ALLOWED_FORMATS.contains(probe.format())
                || probe.width() <= 0
                || probe.height() <= 0) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported-media", UNSUPPORTED);
        }
        return probe;
    }

    /** Reconverte para WebP no tamanho pedido, sem metadados (EXIF, GPS) e com saída reprodutível. */
    public void toWebp(Path source, ProbeResult probe, Dimensions size, Path target) {
        List<String> command = new ArrayList<>(List.of(
                config.ffmpegPath(),
                "-nostdin", "-hide_banner", "-v", "error",
                "-protocol_whitelist", "file",
                "-format_whitelist", FORMAT_WHITELIST,
                // Demuxer já identificado pelo ffprobe: aqui não há autodetecção.
                "-f", probe.format(),
                "-i", source.toString(),
                "-map", "0:v:0",
                "-map_metadata", "-1",
                "-vf", "scale=%d:%d:flags=lanczos".formatted(size.width(), size.height()),
                "-c:v", "libwebp",
                "-quality", String.valueOf(config.webpQuality()),
                "-threads", "2",
                // bitexact: a mesma entrada gera os mesmos bytes, e é isso que faz o hash deduplicar.
                "-fflags", "+bitexact",
                "-flags:v", "+bitexact"));
        if (probe.animated()) {
            command.addAll(List.of("-loop", "0"));
        } else {
            command.addAll(List.of("-frames:v", "1"));
        }
        command.addAll(List.of("-f", "webp", "-y", target.toString()));

        ProcessRunner.Result result = run(command);
        if (result.exitCode() != 0 || !isNonEmptyFile(target)) {
            log.warn("FFmpeg falhou (código {}): {}", result.exitCode(), result.stderr().strip());
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "media-conversion-failed",
                    "Não foi possível converter a imagem");
        }
    }

    /** Não impede a aplicação de subir: sem FFmpeg, só o upload de mídia fica indisponível. */
    @EventListener(ApplicationReadyEvent.class)
    public void reportToolAvailability() {
        for (String tool : List.of(config.ffmpegPath(), config.ffprobePath())) {
            try {
                ProcessRunner.Result result = ProcessRunner.run(List.of(tool, "-version"), Duration.ofSeconds(10));
                log.info("Mídia: {}", result.stdout().lines().findFirst().orElse(tool));
            } catch (Exception ex) {
                log.warn("Mídia: '{}' não encontrado. O upload de imagens vai responder 503 até ser "
                        + "instalado — ver backend/README.md.", tool);
            }
        }
    }

    private ProcessRunner.Result run(List<String> command) {
        try {
            return ProcessRunner.run(command, config.ffmpegTimeout());
        } catch (ProcessRunner.ToolUnavailableException ex) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "media-unavailable",
                    "Processamento de imagem indisponível: FFmpeg não está instalado no servidor");
        } catch (TimeoutException ex) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "media-timeout",
                    "A imagem demorou demais para ser processada");
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static boolean isNonEmptyFile(Path file) {
        try {
            return Files.isRegularFile(file) && Files.size(file) > 0;
        } catch (IOException ex) {
            return false;
        }
    }
}
