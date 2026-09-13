package com.paradoxbh.gameplannerserver.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Set;

import org.junit.jupiter.api.Test;

import com.paradoxbh.gameplannerserver.common.ApiException;

class GeometriesTest {

    private static final Set<String> POINT = Set.of("Point");
    private static final Set<String> AREA = Set.of("Polygon", "MultiPolygon", "Point");

    @Test
    void canonicalWktIgnoresSpacingAndTrailingZerosAndKeepsHeight() {
        assertThat(Geometries.canonical("POINT Z (1147.01 1185.50 37.39)", "position", POINT))
                .isEqualTo(Geometries.canonical("POINT Z(1147.010 1185.5 37.390)", "position", POINT))
                .isEqualTo("POINT Z(1147.01 1185.5 37.39)");
        assertThat(Geometries.canonical("POLYGON (( 0 0,10 0, 10 10 ,0 10,0 0 ))", "area", AREA))
                .isEqualTo("POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0))");
        assertThat(Geometries.canonical("  ", "position", POINT)).isNull();
    }

    @Test
    void databaseRoundTripThroughWkbKeepsEveryDigit() {
        for (String wkt : new String[] {
                "POINT (-290.60842840254935 383.5155120695764)",
                "POINT Z(1147.01 1185.5 37.39)",
                "POLYGON ((-133.56309570312501 -400.30326660156254, 0 0, 10 -5, -133.56309570312501 -400.30326660156254))"}) {
            String canonical = Geometries.canonical(wkt, "geom", AREA);
            assertThat(Geometries.fromWkb(Geometries.toWkb(canonical))).isEqualTo(canonical);
        }
    }

    @Test
    void rejectsWhatIsNotAValidGeometryOfTheRightType() {
        assertThatThrownBy(() -> Geometries.canonical("POINT (1)", "position", POINT))
                .isInstanceOf(ApiException.class).hasMessageContaining("WKT");
        assertThatThrownBy(() -> Geometries.canonical("POLYGON ((0 0, 1 0, 1 1, 0 0))", "position", POINT))
                .isInstanceOf(ApiException.class).hasMessageContaining("Point");
        assertThatThrownBy(() -> Geometries.canonical("POLYGON ((0 0, 10 10, 10 0, 0 10, 0 0))", "area", AREA))
                .isInstanceOf(ApiException.class).hasMessageContaining("Self-intersection");
    }
}
