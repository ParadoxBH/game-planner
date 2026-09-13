import type { ReferencePoints } from "../../types/gameModels";

/*
 * Lógica pura dos utilitários, separada das telas.
 * Portada do antigo painel em src/utils/mapper.tsx sem mudar os cálculos.
 */

interface RemapperItem {
  id: string;
  positions: { lat: number; lng: number }[];
}

/** Lista de { id, positions[] } vira um ReferencePoint de spawn por posição. */
export function remapObjects(input: string): string {
  const items = JSON.parse(input) as RemapperItem[];
  const points = items.flatMap((item) =>
    item.positions.map(
      (position, index) =>
        ({
          id: `${item.id}-${index}`,
          type: "spawn",
          entityId: item.id,
          geom: {
            type: "Point",
            coordinates: `POINT(${position.lat} ${position.lng})`,
          },
        }) as ReferencePoints,
    ),
  );
  return JSON.stringify(points);
}

// Escala e deslocamento fixos, os mesmos do painel original.
const SPAWN_SCALE_X = 1;
const SPAWN_OFFSET_X = 512;
const SPAWN_SCALE_Y = 1;
const SPAWN_OFFSET_Y = -510.75;

const WKT_POINT = /POINT\s*\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)/i;

/** Aplica escala e deslocamento às coordenadas POINT de uma lista de ReferencePoints. */
export function repositionSpawners(input: string): string {
  const points = JSON.parse(input) as ReferencePoints[];
  const moved = points.map((point) => {
    const match = point.geom.coordinates.match(WKT_POINT);
    if (!match) return point;

    const x = parseFloat(match[1]) * SPAWN_SCALE_X + SPAWN_OFFSET_X;
    const y = parseFloat(match[2]) * SPAWN_SCALE_Y + SPAWN_OFFSET_Y;
    return {
      ...point,
      geom: { ...point.geom, coordinates: `POINT(${x.toFixed(2)} ${y.toFixed(2)})` },
    };
  });
  return JSON.stringify(moved, null, 2);
}

export interface BoundsInput {
  imgWidth: string;
  imgHeight: string;
  p1ImgX: string;
  p1ImgY: string;
  p1RealX: string;
  p1RealY: string;
  p2ImgX: string;
  p2ImgY: string;
  p2RealX: string;
  p2RealY: string;
}

/** Mesmos nomes e ordem de chave do painel antigo: configs já copiadas continuam colando. */
export const EMPTY_BOUNDS: BoundsInput = {
  imgWidth: "",
  imgHeight: "",
  p1ImgX: "",
  p1ImgY: "",
  p1RealX: "",
  p1RealY: "",
  p2ImgX: "",
  p2ImgY: "",
  p2RealX: "",
  p2RealY: "",
};

export type BoundsResult = { ok: true; text: string } | { ok: false; error: string };

/** Aplica sobre os valores atuais as chaves presentes no JSON colado. Lança se o JSON for inválido. */
export function mergeBoundsConfig(current: BoundsInput, raw: string): BoundsInput {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const next: BoundsInput = { ...current };
  for (const key of Object.keys(EMPTY_BOUNDS) as (keyof BoundsInput)[]) {
    if (parsed[key] !== undefined) next[key] = String(parsed[key]);
  }
  return next;
}

/**
 * Bounds do Leaflet ([[minY, minX], [maxY, maxX]]) a partir de dois pontos conhecidos
 * ao mesmo tempo na imagem (px) e no jogo, por mapeamento linear em cada eixo.
 */
export function calculateBounds(input: BoundsInput): BoundsResult {
  const w = parseFloat(input.imgWidth);
  const h = parseFloat(input.imgHeight);
  const x1 = parseFloat(input.p1ImgX);
  const y1 = parseFloat(input.p1ImgY);
  const rx1 = parseFloat(input.p1RealX);
  const ry1 = parseFloat(input.p1RealY);
  const x2 = parseFloat(input.p2ImgX);
  const y2 = parseFloat(input.p2ImgY);
  const rx2 = parseFloat(input.p2RealX);
  const ry2 = parseFloat(input.p2RealY);

  if ([w, h, x1, y1, rx1, ry1, x2, y2, rx2, ry2].some((value) => Number.isNaN(value))) {
    return { ok: false, error: "Por favor, preencha todos os campos com números válidos." };
  }
  if (x1 === x2) {
    return { ok: false, error: "Erro: Posição X da Imagem dos pontos de referência não podem ser iguais." };
  }
  if (y1 === y2) {
    return { ok: false, error: "Erro: Posição Y da Imagem dos pontos de referência não podem ser iguais." };
  }

  // Real = m * Imagem + c, em cada eixo.
  const mX = (rx2 - rx1) / (x2 - x1);
  const cX = rx1 - mX * x1;
  const mY = (ry2 - ry1) / (y2 - y1);
  const cY = ry1 - mY * y1;

  // Coordenadas do jogo nas bordas da imagem.
  const rxLeft = cX;
  const rxRight = mX * w + cX;
  const ryTop = cY;
  const ryBottom = mY * h + cY;

  const minX = Math.min(rxLeft, rxRight);
  const maxX = Math.max(rxLeft, rxRight);
  const minY = Math.min(ryTop, ryBottom);
  const maxY = Math.max(ryTop, ryBottom);

  const bounds = `[\n  [\n    ${minY.toFixed(2)},\n    ${minX.toFixed(2)}\n  ],\n  [\n    ${maxY.toFixed(2)},\n    ${maxX.toFixed(2)}\n  ]\n]`;

  const text = `${bounds}\n\n// Informações auxiliares:\n// Direção do eixo X real: ${mX > 0 ? "Esquerda -> Direita (+)" : "Esquerda -> Direita (-)"}\n// Direção do eixo Y real: ${mY > 0 ? "Topo -> Fundo (+)" : "Topo -> Fundo (-)"}\n// Real X (0px): ${rxLeft.toFixed(2)}\n// Real X (${w}px): ${rxRight.toFixed(2)}\n// Real Y (0px): ${ryTop.toFixed(2)}\n// Real Y (${h}px): ${ryBottom.toFixed(2)}`;

  return { ok: true, text };
}
