package com.paradoxbh.gameplannerserver.media.transcode;

import java.util.HashMap;
import java.util.Map;

/** O que o ffprobe identificou no arquivo enviado. */
public record ProbeResult(String format, String codec, int width, int height, int frames) {

    /** Lê a saída "chave=valor" de {@code ffprobe -of default=noprint_wrappers=1}. */
    static ProbeResult parse(String output) {
        Map<String, String> values = new HashMap<>();
        for (String line : output.split("\\R")) {
            int separator = line.indexOf('=');
            if (separator > 0) {
                values.putIfAbsent(line.substring(0, separator).trim(), line.substring(separator + 1).trim());
            }
        }
        return new ProbeResult(
                values.getOrDefault("format_name", ""),
                values.getOrDefault("codec_name", ""),
                toInt(values.get("width")),
                toInt(values.get("height")),
                Math.max(1, toInt(values.get("nb_read_packets"))));
    }

    public long pixels() {
        return (long) width * height;
    }

    public boolean animated() {
        return frames > 1;
    }

    private static int toInt(String value) {
        if (value == null) {
            return 0;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            return 0;
        }
    }
}
