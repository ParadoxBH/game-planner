package com.paradoxbh.gameplannerserver.media.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.util.unit.DataSize;

import com.paradoxbh.gameplannerserver.config.GamePlannerProperties;
import com.paradoxbh.gameplannerserver.media.domain.MediaVariant;

class FileSystemMediaStorageTest {

    private static final String ID = "ab".repeat(32);

    @TempDir
    Path root;

    private FileSystemMediaStorage storage() throws IOException {
        GamePlannerProperties.Media media = new GamePlannerProperties.Media(
                root.toString(), 40, 300, Duration.ofSeconds(20), "ffmpeg", "ffprobe", 85, 128, 512, 1920,
                DataSize.ofMegabytes(8),
                new GamePlannerProperties.Media.Large(8192, DataSize.ofMegabytes(40), 70, Duration.ofSeconds(120)));
        return new FileSystemMediaStorage(new GamePlannerProperties(null, null, null, media));
    }

    @Test
    void keyIsDerivedOnlyFromHashAndVariant() {
        assertThat(FileSystemMediaStorage.keyFor(ID, MediaVariant.ICON)).isEqualTo("ab/ab/" + ID + "_icon.webp");
    }

    @Test
    void storeIsIdempotentAndDeleteRemovesTheFile() throws IOException {
        FileSystemMediaStorage storage = storage();
        Path source = Files.writeString(root.resolve("entrada.webp"), "bytes");

        String key = storage.store(ID, MediaVariant.THUMB, source);

        assertThat(storage.store(ID, MediaVariant.THUMB, source)).isEqualTo(key);
        assertThat(root.resolve(key)).exists();
        assertThat(root.resolve(key + ".part")).doesNotExist();
        assertThat(storage.load(key)).isPresent();

        storage.delete(key);
        assertThat(storage.load(key)).isEmpty();
    }

    /** A mesma imagem enviada em paralelo (id = hash) não pode derrubar nenhuma das requisições. */
    @Test
    void concurrentStoresOfTheSameMediaAllSucceed() throws Exception {
        FileSystemMediaStorage storage = storage();
        int writers = 8;
        List<Path> sources = new ArrayList<>();
        for (int i = 0; i < writers; i++) {
            sources.add(Files.write(root.resolve("entrada" + i + ".webp"), new byte[256 * 1024]));
        }

        ExecutorService pool = Executors.newFixedThreadPool(writers);
        try {
            for (int round = 0; round < 20; round++) {
                MediaVariant variant = MediaVariant.values()[round % MediaVariant.values().length];
                String id = String.format("%064x", round);
                CountDownLatch start = new CountDownLatch(1);
                List<Future<String>> results = new ArrayList<>();
                for (Path source : sources) {
                    results.add(pool.submit(() -> {
                        start.await();
                        return storage.store(id, variant, source);
                    }));
                }
                start.countDown();
                for (Future<String> result : results) {
                    assertThat(root.resolve(result.get())).exists();
                }
            }
        } finally {
            pool.shutdownNow();
        }

        try (Stream<Path> files = Files.walk(root)) {
            assertThat(files.filter(p -> p.toString().endsWith(".part"))).isEmpty();
        }
    }

    @Test
    void refusesKeysThatEscapeTheStorageRoot() throws IOException {
        FileSystemMediaStorage storage = storage();
        assertThrows(IllegalArgumentException.class, () -> storage.load("../fora.webp"));
    }
}
