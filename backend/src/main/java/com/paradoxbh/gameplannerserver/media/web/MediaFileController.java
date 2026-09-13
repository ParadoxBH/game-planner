package com.paradoxbh.gameplannerserver.media.web;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.media.domain.MediaVariant;
import com.paradoxbh.gameplannerserver.media.service.MediaService;

/** Entrega dos arquivos WebP. Fica fora de /api: é o endereço que vai direto num {@code <img>}. */
@RestController
public class MediaFileController {

    private static final MediaType WEBP = MediaType.parseMediaType("image/webp");

    private final MediaService media;

    public MediaFileController(MediaService media) {
        this.media = media;
    }

    static String urlFor(String id, MediaVariant variant) {
        return "/media/" + id + "/" + variant.code() + ".webp";
    }

    @GetMapping("/media/{id}/{variant}.webp")
    public ResponseEntity<Resource> serve(@PathVariable String id, @PathVariable String variant) {
        MediaVariant kind = MediaVariant.fromCode(variant).orElseThrow(() -> ApiException.notFound("Imagem"));
        MediaService.StoredFile file = media.openVariant(id, kind).orElseThrow(() -> ApiException.notFound("Imagem"));

        return ResponseEntity.ok()
                // Tipo fixo: o que sai daqui é sempre o WebP que o próprio servidor gerou.
                .contentType(WEBP)
                .contentLength(file.byteSize())
                .eTag("\"" + id + "-" + kind.code() + "\"")
                // O id é o hash do conteúdo: uma URL nunca muda de bytes, então o cache pode ser permanente.
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                .header("X-Content-Type-Options", "nosniff")
                .body(file.resource());
    }
}
