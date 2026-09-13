package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;

/**
 * Um conteúdo de jogo como documento inteiro.
 *
 * O mesmo formato serve de corpo da escrita, de resposta e de snapshot de revisão:
 * a escrita sempre substitui o agregado todo (ver doc/backend_plan.md 4.6) — com uma
 * exceção, as imagens (ver {@link #media()}).
 */
public interface ContentDocument<D extends ContentDocument<D>> {

    String extId();

    String name();

    String summary();

    String description();

    /**
     * Imagens ligadas pela tabela content_media, na ordem de exibição.
     *
     * As ligações pertencem ao código do registro, não ao registro: podem ser anexadas antes de
     * o conteúdo existir. Por isso, na escrita, campo ausente (nulo) deixa as imagens como estão;
     * lista presente, mesmo vazia, substitui.
     */
    List<MediaLink> media();

    /** Preenchido pelo servidor. Ignorado na escrita. */
    ContentMeta meta();

    /**
     * Cópia validada e normalizada, usada para gravar e para comparar com o que está no
     * banco: extId fixado, sem meta e sem autoria de mídia, listas sem duplicatas, números
     * sem zeros à direita. Lança 400 se o documento for inválido.
     */
    D canonical(String extId);

    D withMeta(ContentMeta meta);

    D withMedia(List<MediaLink> media);
}
