package com.paradoxbh.gameplannerserver.media.transcode;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ProbeResultTest {

    @Test
    void readsFfprobeKeyValueOutput() {
        ProbeResult probe = ProbeResult.parse("""
                codec_name=png
                width=800
                height=600
                nb_read_packets=1
                format_name=png_pipe
                """);

        assertThat(probe.format()).isEqualTo("png_pipe");
        assertThat(probe.codec()).isEqualTo("png");
        assertThat(probe.width()).isEqualTo(800);
        assertThat(probe.height()).isEqualTo(600);
        assertThat(probe.pixels()).isEqualTo(480_000L);
        assertThat(probe.animated()).isFalse();
    }

    @Test
    void detectsAnimationByPacketCountWithWindowsLineEndings() {
        ProbeResult probe = ProbeResult.parse(
                "codec_name=gif\r\nwidth=300\r\nheight=300\r\nnb_read_packets=20\r\nformat_name=gif\r\n");

        assertThat(probe.frames()).isEqualTo(20);
        assertThat(probe.animated()).isTrue();
    }

    @Test
    void unreadableOutputYieldsEmptyProbe() {
        ProbeResult probe = ProbeResult.parse("Invalid data found when processing input");

        assertThat(probe.format()).isEmpty();
        assertThat(probe.width()).isZero();
        assertThat(probe.frames()).isEqualTo(1);
    }
}
