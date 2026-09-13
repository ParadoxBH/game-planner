package com.paradoxbh.gameplannerserver.content;

import java.util.Set;
import java.util.TreeSet;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKBReader;
import org.locationtech.jts.io.WKBWriter;
import org.locationtech.jts.io.WKTReader;
import org.locationtech.jts.io.WKTWriter;
import org.locationtech.jts.operation.valid.IsValidOp;

import com.paradoxbh.gameplannerserver.common.ApiException;

/**
 * Geometria em coordenadas de jogo (SRID 0), com ou sem Z. Na API é WKT, como nos dados atuais;
 * no banco, PostGIS. A troca com o banco passa por WKB, que preserva cada double: o mesmo WKT
 * escrito com outro espaçamento dá o mesmo texto canônico e não gera revisão.
 */
public final class Geometries {

    private Geometries() {
    }

    /**
     * Lê, valida e devolve o WKT canônico. Nulo ou em branco vira nulo. {@code allowedTypes} são
     * nomes do JTS: Point, Polygon, MultiPolygon.
     */
    public static String canonical(String wkt, String field, Set<String> allowedTypes) {
        if (wkt == null || wkt.isBlank()) {
            return null;
        }
        Geometry geometry = parse(wkt, field);
        if (!allowedTypes.contains(geometry.getGeometryType())) {
            throw ApiException.badRequest(field + " precisa ser " + String.join(" ou ", new TreeSet<>(allowedTypes))
                    + ", não " + geometry.getGeometryType());
        }
        if (geometry.isEmpty()) {
            throw ApiException.badRequest(field + " está vazio");
        }
        IsValidOp validation = new IsValidOp(geometry);
        if (!validation.isValid()) {
            throw ApiException.badRequest(field + " inválido: " + validation.getValidationError().getMessage());
        }
        return write(geometry);
    }

    /** WKB para gravar com ST_GeomFromEWKB; Z só quando a geometria tem. */
    public static byte[] toWkb(String canonicalWkt) {
        if (canonicalWkt == null) {
            return null;
        }
        Geometry geometry = parse(canonicalWkt, "geometria");
        return new WKBWriter(hasZ(geometry) ? 3 : 2).write(geometry);
    }

    /** WKT canônico a partir do que o banco devolve em ST_AsEWKB. */
    public static String fromWkb(Object wkb) {
        if (wkb == null) {
            return null;
        }
        try {
            return write(new WKBReader().read((byte[]) wkb));
        } catch (ParseException ex) {
            throw new IllegalStateException("Geometria ilegível vinda do banco", ex);
        }
    }

    private static Geometry parse(String wkt, String field) {
        try {
            return new WKTReader().read(wkt);
        } catch (ParseException | RuntimeException ex) {
            throw ApiException.badRequest(field + " não é WKT válido: " + ex.getMessage());
        }
    }

    private static String write(Geometry geometry) {
        return new WKTWriter(hasZ(geometry) ? 3 : 2).write(geometry);
    }

    private static boolean hasZ(Geometry geometry) {
        for (Coordinate coordinate : geometry.getCoordinates()) {
            if (!Double.isNaN(coordinate.getZ())) {
                return true;
            }
        }
        return false;
    }
}
