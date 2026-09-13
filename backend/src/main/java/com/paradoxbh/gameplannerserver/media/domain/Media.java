package com.paradoxbh.gameplannerserver.media.domain;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.data.domain.Persistable;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "media")
@Getter
@Setter
public class Media implements Persistable<String> {

    /** SHA-256 da variante "full" já convertida. Mesma imagem, mesmo id. */
    @Id
    private String id;

    /** Dimensões da imagem enviada, antes de redimensionar. */
    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    @Column(nullable = false)
    private boolean animated;

    /** Nome original do arquivo, só para exibição. Nunca usado em caminho de disco. */
    private String sourceName;

    /** Formato identificado pelo ffprobe na entrada — não o que o cliente declarou. */
    @Column(nullable = false)
    private String sourceFormat;

    @Column(nullable = false)
    private long sourceBytes;

    @Column(nullable = false)
    private String uploadedBy;

    @Column(nullable = false, updatable = false)
    private Instant uploadedAt = Instant.now();

    /** Chave: código da variante (icon, thumb, full). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "media_variant", joinColumns = @JoinColumn(name = "media_id"))
    @MapKeyColumn(name = "variant")
    private Map<String, MediaFile> variants = new HashMap<>();

    /**
     * O id é atribuído pela aplicação, então o Spring Data não teria como saber que a
     * entidade é nova e faria merge (SELECT + UPDATE). Marcando explicitamente, salvar
     * vira INSERT: dois uploads simultâneos da mesma imagem esbarram na chave primária
     * em vez de um sobrescrever o outro.
     */
    @Transient
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean persisted;

    @Override
    public boolean isNew() {
        return !persisted;
    }

    @PostLoad
    @PostPersist
    void markPersisted() {
        this.persisted = true;
    }
}
