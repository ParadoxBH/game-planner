import type { MapDocument, MapTiles } from "../../api/content";
import { currentMedia, mediaUrl } from "../../api/references";
import { parseWKTPoint } from "../../utils/wkt";
import { CRS, Transformation } from "leaflet";

/** [[y, x], [y, x]]: limites no formato do Leaflet, com lat = y e lng = x. */
export type LatLngBounds = [[number, number], [number, number]];

const FALLBACK_BOUNDS: LatLngBounds = [
  [0, 0],
  [1000, 1000],
];

export const MAP_PLACEHOLDER = "https://placehold.co/600x400/333/fff?text=Map";

export function leafletBounds(map: MapDocument): LatLngBounds {
  const bounds = map.bounds;
  return bounds
    ? [
        [bounds.minY, bounds.minX],
        [bounds.maxY, bounds.maxX],
      ]
    : FALLBACK_BOUNDS;
}

/** Limites no formato do documento de mapa, para copiar para a base. */
export function boundsDocument(bounds: LatLngBounds) {
  return { minX: bounds[0][1], minY: bounds[0][0], maxX: bounds[1][1], maxY: bounds[1][0] };
}

/** Miniatura do mapa: a imagem de miniatura ou, sem ela, o ícone. */
export function mapThumbnail(map: MapDocument): string | null {
  const id = currentMedia(map.media, "thumbnail") ?? currentMedia(map.media, "icon");
  return id ? mediaUrl(id, "thumb") : null;
}

/** [lat, lng] de um WKT de ponto (x y ou x y z). */
export function pointLatLng(wkt: string): [number, number] {
  const [x, y] = parseWKTPoint(wkt);
  return [y, x];
}

/** CRS que leva as coordenadas de jogo à imagem ou aos tiles do mapa. */
export function createMapCRS(bounds: LatLngBounds, tiles: MapTiles | null) {
  const [min, max] = bounds;
  const width = Math.abs(max[1] - min[1]) || 1;
  const height = Math.abs(max[0] - min[0]) || 1;
  if (tiles) {
    const scale = 256 / Math.pow(2, tiles.z);
    const scaleX = (tiles.maxX * scale - tiles.minX * scale) / width;
    const offsetX = tiles.minX * scale - min[1] * scaleX;
    const scaleY = (tiles.minY * scale - tiles.maxY * scale) / height;
    const offsetY = tiles.minY * scale - max[0] * scaleY;
    return Object.assign({}, CRS.Simple, { transformation: new Transformation(scaleX, offsetX, scaleY, offsetY) });
  }
  const scaleX = 256 / width;
  const scaleY = -256 / height;
  return Object.assign({}, CRS.Simple, {
    transformation: new Transformation(scaleX, -min[1] * scaleX, scaleY, -max[0] * scaleY),
  });
}
