package com.paradoxbh.gameplannerserver.media.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.paradoxbh.gameplannerserver.config.GamePlannerProperties;
import com.paradoxbh.gameplannerserver.media.domain.MediaVariant;

class FileSystemMediaStorageTest {

    private static final String ID = "ab".repeat(32);

    @TempDir
    Path root;

    private FileSystemMediaStorage storage() throws IOException {
        GamePlannerProperties.Media media = new GamePlannerProperties.Media(
                root.toString(), 40, 300, Duration.ofSeconds(20), "ffmpeg", "ffprobe", 85, 128, 512, 1920);
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

    @Test
    void refusesKeysThatEscapeTheStorageRoot() throws IOException {
        FileSystemMediaStorage storage = storage();
        assertThrows(IllegalArgumentException.class, () -> storage.load("../fora.webp"));
    }
}
