package com.paradoxbh.gameplannerserver.media.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Um arquivo WebP gerado: uma variante de uma mídia. */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MediaFile {

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    @Column(nullable = false)
    private long byteSize;

    /** Chave no MediaStorage: hoje, caminho relativo no disco; amanhã, chave de S3. */
    @Column(nullable = false)
    private String storagePath;
}
