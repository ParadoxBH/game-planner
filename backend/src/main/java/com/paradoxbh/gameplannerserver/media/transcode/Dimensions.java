package com.paradoxbh.gameplannerserver.media.transcode;

/**
 * Dimensões de saída de uma variante.
 *
 * Calculadas aqui, e não deixadas a cargo do FFmpeg, para que o valor gravado no banco
 * seja exatamente o tamanho do arquivo gerado, sem depender do arredondamento dele.
 */
public record Dimensions(int width, int height) {

    /** Cabe numa caixa quadrada de {@code maxSide}, mantendo a proporção. Nunca amplia. */
    public static Dimensions fit(int width, int height, int maxSide) {
        double ratio = Math.min(1.0, (double) maxSide / Math.max(width, height));
        return new Dimensions(
                Math.max(1, (int) Math.round(width * ratio)),
                Math.max(1, (int) Math.round(height * ratio)));
    }
}
