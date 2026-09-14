import type { GameInfo, MediaUsage } from "./content";
import { currentMedia, mediaUrl, type MediaVariant } from "./references";

/** A primeira imagem que o jogo tem entre os usos, na ordem de preferência. */
export function gameImage(game: GameInfo, usages: MediaUsage[], variant: MediaVariant = "thumb"): string | null {
  for (const usage of usages) {
    const id = currentMedia(game.media, usage);
    if (id) return mediaUrl(id, variant);
  }
  return null;
}

export function isComingSoon(game: GameInfo): boolean {
  return game.status === "coming_soon";
}

const ACCESS_LOG = "gameAccessLog";

/** Último acesso a cada jogo, guardado no navegador, para ordenar a lista pelos mais usados. */
export function readAccessLog(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_LOG) || "{}");
  } catch {
    return {};
  }
}

export function recordAccess(gameId: string) {
  try {
    const log = readAccessLog();
    log[gameId] = Date.now();
    localStorage.setItem(ACCESS_LOG, JSON.stringify(log));
  } catch {
    // Sem armazenamento no navegador, a lista só não fica ordenada pelo uso.
  }
}
