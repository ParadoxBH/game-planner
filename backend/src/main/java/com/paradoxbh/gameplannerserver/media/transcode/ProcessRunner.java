package com.paradoxbh.gameplannerserver.media.transcode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Executa ffmpeg/ffprobe.
 *
 * Sem shell e com argumentos em lista: nada do que o usuário envia é interpretado
 * como comando. Saídas vão para arquivo, e não para pipe, para o processo nunca
 * travar esperando alguém ler.
 */
final class ProcessRunner {

    record Result(int exitCode, String stdout, String stderr) {
    }

    /** O executável não pôde ser iniciado — em geral, não instalado ou fora do PATH. */
    static final class ToolUnavailableException extends IOException {
        ToolUnavailableException(String tool, IOException cause) {
            super("Não foi possível executar '" + tool + "'", cause);
        }
    }

    private ProcessRunner() {
    }

    static Result run(List<String> command, Duration timeout) throws IOException, TimeoutException {
        Path stdout = Files.createTempFile("gp-proc-", ".out");
        Path stderr = Files.createTempFile("gp-proc-", ".err");
        try {
            Process process;
            try {
                process = new ProcessBuilder(command)
                        .redirectOutput(stdout.toFile())
                        .redirectError(stderr.toFile())
                        .start();
            } catch (IOException ex) {
                throw new ToolUnavailableException(command.getFirst(), ex);
            }
            process.getOutputStream().close();

            boolean finished;
            try {
                finished = process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS);
            } catch (InterruptedException ex) {
                process.destroyForcibly();
                Thread.currentThread().interrupt();
                throw new IOException("Execução interrompida", ex);
            }
            if (!finished) {
                kill(process);
                throw new TimeoutException(command.getFirst() + " passou de " + timeout.toSeconds() + "s");
            }
            return new Result(process.exitValue(), read(stdout), read(stderr));
        } finally {
            deleteQuietly(stdout);
            deleteQuietly(stderr);
        }
    }

    private static void kill(Process process) {
        process.destroyForcibly();
        try {
            process.waitFor(2, TimeUnit.SECONDS);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    /** Leitura tolerante: saída de ferramenta pode ter bytes que não são UTF-8 válido. */
    private static String read(Path file) throws IOException {
        return new String(Files.readAllBytes(file), StandardCharsets.UTF_8);
    }

    private static void deleteQuietly(Path file) {
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // No Windows o processo recém-morto pode ainda segurar o arquivo; o SO limpa o temporário.
        }
    }
}
