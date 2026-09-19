package com.paradoxbh.gameplannerserver.media.web;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.paradoxbh.gameplannerserver.identity.service.CurrentUser;
import com.paradoxbh.gameplannerserver.media.domain.Media;
import com.paradoxbh.gameplannerserver.media.domain.MediaFile;
import com.paradoxbh.gameplannerserver.media.domain.MediaVariant;
import com.paradoxbh.gameplannerserver.media.service.MediaService;

@RestController
@RequestMapping("/api/v1/media")
public class MediaController {

    private final MediaService media;
    private final CurrentUser currentUser;

    public MediaController(MediaService media, CurrentUser currentUser) {
        this.media = media;
        this.currentUser = currentUser;
    }

    /**
     * 201 quando a imagem é nova; 200 quando já existia (mesmo hash). Com {@code large=true}
     * (imagem de mapa), gera também a variante {@code large}, com limites próprios.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadResponse> upload(@RequestParam("file") MultipartFile file,
                                                 @RequestParam(defaultValue = "false") boolean large) {
        String uploader = currentUser.requireWriter().getUsername();
        MediaService.UploadResult result = media.upload(file, uploader, large);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(new UploadResponse(result.created(), MediaResponse.of(result.media())));
    }

    /**
     * Mídia que nenhum conteúdo referencia. Restrito a platform_admin: a mídia é global,
     * compartilhada entre jogos, então "moderador de um jogo" não se aplica.
     */
    @GetMapping("/orphans")
    public List<MediaResponse> orphans() {
        currentUser.requirePlatformAdmin();
        return media.orphans().stream().map(MediaResponse::of).toList();
    }

    @GetMapping("/{id}")
    public MediaResponse get(@PathVariable String id) {
        return MediaResponse.of(media.find(id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        media.delete(id, currentUser.requireWriter());
    }

    public record UploadResponse(boolean created, MediaResponse media) {
    }

    public record VariantResponse(String url, int width, int height, long bytes) {
    }

    /** {@code variants} na ordem icon, thumb, full e, quando existe, large. URLs relativas à origem da API. */
    public record MediaResponse(String id, int width, int height, boolean animated,
                                Map<String, VariantResponse> variants, String uploadedBy, Instant uploadedAt) {

        static MediaResponse of(Media media) {
            Map<String, VariantResponse> variants = new LinkedHashMap<>();
            for (MediaVariant variant : MediaVariant.values()) {
                MediaFile file = media.getVariants().get(variant.code());
                if (file != null) {
                    variants.put(variant.code(), new VariantResponse(
                            MediaFileController.urlFor(media.getId(), variant),
                            file.getWidth(), file.getHeight(), file.getByteSize()));
                }
            }
            return new MediaResponse(media.getId(), media.getWidth(), media.getHeight(), media.isAnimated(),
                    variants, media.getUploadedBy(), media.getUploadedAt());
        }
    }
}
