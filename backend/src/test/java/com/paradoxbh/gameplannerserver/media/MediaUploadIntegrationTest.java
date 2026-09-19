package com.paradoxbh.gameplannerserver.media;

import static java.nio.charset.StandardCharsets.US_ASCII;
import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.media.domain.Media;
import com.paradoxbh.gameplannerserver.media.domain.MediaFile;
import com.paradoxbh.gameplannerserver.media.service.MediaService;
import com.paradoxbh.gameplannerserver.media.service.MediaService.UploadResult;
import com.paradoxbh.gameplannerserver.media.transcode.Dimensions;
import com.paradoxbh.gameplannerserver.support.PostgisIntegrationTest;

/**
 * Upload de ponta a ponta com FFmpeg de verdade, banco de verdade e disco de verdade.
 * Pulado automaticamente onde o FFmpeg não está instalado.
 */
@EnabledIf("ffmpegAvailable")
class MediaUploadIntegrationTest extends PostgisIntegrationTest {

    private static final Path STORAGE = createTempDir();

    @DynamicPropertySource
    static void mediaStorage(DynamicPropertyRegistry registry) {
        registry.add("gameplanner.media.storage-path", STORAGE::toString);
    }

    @Autowired
    MediaService media;

    @Test
    void convertsToThreeWebpVariantsWithoutUpscaling() throws IOException {
        Media stored = media.upload(png("icone.png", 800, 600), "tester").media();

        assertThat(stored.getId()).matches("[0-9a-f]{64}");
        assertThat(stored.getSourceFormat()).isEqualTo("png_pipe");
        assertThat(stored.getVariants()).containsOnlyKeys("icon", "thumb", "full");
        assertThat(size(stored, "icon")).isEqualTo(new Dimensions(128, 96));
        assertThat(size(stored, "thumb")).isEqualTo(new Dimensions(512, 384));
        assertThat(size(stored, "full")).isEqualTo(new Dimensions(800, 600));

        for (MediaFile file : stored.getVariants().values()) {
            byte[] bytes = Files.readAllBytes(STORAGE.resolve(file.getStoragePath()));
            assertThat(new String(bytes, 0, 4, US_ASCII)).isEqualTo("RIFF");
            assertThat(new String(bytes, 8, 4, US_ASCII)).isEqualTo("WEBP");
            assertThat((long) bytes.length).isEqualTo(file.getByteSize());
        }
    }

    @Test
    void sameImageUploadedTwiceIsStoredOnce() throws IOException {
        UploadResult first = media.upload(png("primeiro.png", 300, 200), "tester");
        UploadResult second = media.upload(png("segundo.png", 300, 200), "outra-pessoa");

        assertThat(second.created()).isFalse();
        assertThat(second.media().getId()).isEqualTo(first.media().getId());
        assertThat(second.media().getUploadedBy()).isEqualTo("tester");
    }

    @Test
    void largeUploadAlsoGeneratesLargeVariant() throws IOException {
        Media stored = media.upload(png("mapa.png", 3000, 1500), "tester", true).media();

        assertThat(stored.getVariants()).containsOnlyKeys("icon", "thumb", "full", "large");
        assertThat(size(stored, "full")).isEqualTo(new Dimensions(1920, 960));
        assertThat(size(stored, "large")).isEqualTo(new Dimensions(3000, 1500));
    }

    @Test
    void largeUploadOfExistingImageAddsTheLargeVariant() throws IOException {
        UploadResult plain = media.upload(png("comum.png", 2400, 1200), "tester");
        assertThat(plain.media().getVariants()).doesNotContainKey("large");

        UploadResult large = media.upload(png("mapa.png", 2400, 1200), "outra-pessoa", true);

        assertThat(large.created()).isFalse();
        assertThat(large.media().getId()).isEqualTo(plain.media().getId());
        assertThat(size(large.media(), "large")).isEqualTo(new Dimensions(2400, 1200));
        assertThat(media.find(plain.media().getId()).getVariants()).containsKey("large");
    }

    @Test
    void plainUploadKeepsTheSmallerByteLimit() throws IOException {
        MockMultipartFile big = new MockMultipartFile("file", "grande.png", "image/png", new byte[9 * 1024 * 1024]);

        ApiException error = assertThrows(ApiException.class, () -> media.upload(big, "tester"));
        assertThat(error.status()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
    }

    @Test
    void rejectsFileThatIsNotAnImage() {
        MockMultipartFile text = new MockMultipartFile(
                "file", "falso.png", "image/png", "isto nao e uma imagem".getBytes(UTF_8));

        ApiException error = assertThrows(ApiException.class, () -> media.upload(text, "tester"));
        assertThat(error.status()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    /**
     * Playlist HLS com extensão de imagem: o ataque clássico contra FFmpeg.
     * O teste garante a rejeição; quem impede o FFmpeg de seguir as entradas da playlist
     * já durante a identificação é o -format_whitelist passado ao ffprobe.
     */
    @Test
    void rejectsPlaylistDisguisedAsImage() {
        String playlist = """
                #EXTM3U
                #EXT-X-MEDIA-SEQUENCE:0
                #EXTINF:10.0,
                file:///etc/passwd
                #EXT-X-ENDLIST
                """;
        MockMultipartFile disguised = new MockMultipartFile(
                "file", "icone.png", "image/png", playlist.getBytes(UTF_8));

        ApiException error = assertThrows(ApiException.class, () -> media.upload(disguised, "tester"));
        assertThat(error.status()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    static boolean ffmpegAvailable() {
        try {
            Process process = new ProcessBuilder("ffmpeg", "-version").redirectErrorStream(true).start();
            process.getInputStream().readAllBytes();
            return process.waitFor(10, TimeUnit.SECONDS) && process.exitValue() == 0;
        } catch (IOException ex) {
            return false;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private static Dimensions size(Media media, String variant) {
        MediaFile file = media.getVariants().get(variant);
        return new Dimensions(file.getWidth(), file.getHeight());
    }

    private static MockMultipartFile png(String name, int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        // Semitransparente: exercita o canal alfa na conversão.
        graphics.setColor(new Color(255, 68, 0, 180));
        graphics.fillRect(0, 0, width, height / 2);
        graphics.dispose();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return new MockMultipartFile("file", name, "image/png", out.toByteArray());
    }

    private static Path createTempDir() {
        try {
            return Files.createTempDirectory("gp-media-test-");
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }
}
