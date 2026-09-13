package com.paradoxbh.gameplannerserver.media.transcode;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DimensionsTest {

    @Test
    void keepsLandscapeProportion() {
        assertThat(Dimensions.fit(800, 600, 128)).isEqualTo(new Dimensions(128, 96));
    }

    @Test
    void keepsPortraitProportion() {
        assertThat(Dimensions.fit(600, 800, 128)).isEqualTo(new Dimensions(96, 128));
    }

    @Test
    void neverUpscales() {
        assertThat(Dimensions.fit(64, 40, 1920)).isEqualTo(new Dimensions(64, 40));
    }

    @Test
    void extremeProportionKeepsAtLeastOnePixel() {
        assertThat(Dimensions.fit(4000, 2, 128)).isEqualTo(new Dimensions(128, 1));
    }
}
