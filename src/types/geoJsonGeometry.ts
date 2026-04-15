export type GeoJsonGeometry = GeoJsonGeometryPoint | GeoJsonGeometryLine | GeoJsonGeometryPolygon;

export interface GeoJsonGeometryPoint {
  type: "Point";
  coordinates: number[];
}

export interface GeoJsonGeometryLine {
  type: "LineString";
  coordinates: number[][];
}

export interface GeoJsonGeometryPolygon {
  type: "Polygon";
  coordinates: number[][];
}

export interface WktGeometry {
    type: "Point" | "LineString" | "Polygon";
    coordinates: string;
}