/**
 * Utility to parse and format WKT (Well-Known Text) for Points.
 * Supports 2D (POINT(x y)) and 3D (POINT Z (x y z)).
 */

/**
 * Parses a WKT Point string into a coordinate array.
 * @param wkt WKT string (e.g., "POINT(-31 -285)" or "POINT Z (-394.7 2760.4 -25.1)")
 * @returns Array of coordinates [y, x] for Leaflet (Lat, Lng) or [y, x, z]
 * Note: Leaflet uses [lat, lng] which maps to [y, x] in many Cartesian systems.
 * However, the existing data stores coordinates as [y, x] or [x, y, z].
 * Let's keep the internal representation consistent with what the app expects.
 */
export function parseWKTPoint(wkt: string): number[] {
  if (!wkt) return [0, 0];

  // Match POINT(x y) or POINT Z (x y z) or POINT(x y z)
  // We handle both space and comma separators just in case, though WKT uses spaces.
  const match = wkt.match(/POINT\s*(?:Z\s*)?\(([^)]+)\)/i);
  if (!match) return [0, 0];

  const coordsStr = match[1].trim();
  const coords = coordsStr.split(/[\s,]+/).map(Number);

  return coords;
}

/**
 * Formats a coordinate array into a WKT Point string.
 * @param coords Array of coordinates [y, x] or [y, x, z]
 * @returns WKT string
 */
export function formatWKTPoint(coords: number[]): string {
  if (!coords || coords.length < 2) return "POINT(0 0)";

  const is3D = coords.length >= 3;
  const coordsStr = coords.join(" ");

  if (is3D) {
    return `POINT Z (${coordsStr})`;
  }

  return `POINT(${coordsStr})`;
}

/**
 * Formats an array of coordinate arrays into a WKT Polygon string.
 * @param points Array of coordinate arrays [[x1, y1], [x2, y2], ...]
 * @returns WKT string (e.g., "POLYGON((x1 y1, x2 y2, ..., x1 y1))")
 */
export function formatWKTPolygon(points: [number, number][]): string {
  if (!points || points.length < 3) return "POLYGON EMPTY";

  // Ensure the polygon is closed (last point equals first point)
  const closedPoints = [...points];
  if (
    points[0][0] !== points[points.length - 1][0] ||
    points[0][1] !== points[points.length - 1][1]
  ) {
    closedPoints.push(points[0]);
  }

  const coordsStr = closedPoints.map(p => p.join(" ")).join(", ");
  return `POLYGON((${coordsStr}))`;
}
