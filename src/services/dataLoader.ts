import type { GameInfo } from "../types/gameModels";
import { getPublicUrl } from "../utils/pathUtils";

const missingManifests = new Set<string>();

/**
 * Helper to fetch data with cache-busting
 */
async function fetchData(url: string) {
  const isDev = import.meta.env.DEV || localStorage.getItem("showDev") === "true";
  
  // Enforce cache-busting for JSON data files
  const separator = url.includes('?') ? '&' : '?';
  
  if (isDev) {
    const bustedUrl = `${url}${separator}t=${Date.now()}`;
    return fetch(bustedUrl, { cache: 'no-store' });
  }

  // In production, we use a slightly more stable bust (every minute)
  // to avoid hammer the CDN too hard while still bypassing long-term caches.
  const prodBust = Math.floor(Date.now() / 60000); 
  const bustedUrl = `${url}${separator}v=${prodBust}`;
  
  return fetch(bustedUrl, { cache: 'reload' });
}

export async function loadVersion(): Promise<{ version: string; timestamp: string }> {
  try {
    const response = await fetchData(getPublicUrl('data/version.json'));
    if (!response.ok) return { version: '0.0.0', timestamp: '' };
    return await response.json();
  } catch (err) {
    console.error('[DataLoader] Failed to load version:', err);
    return { version: '0.0.0', timestamp: '' };
  }
}

export async function loadGameData<T>(
  gameId: string,
  dataset: string
): Promise<T[]> {
  const baseUrl = getPublicUrl(`data/${gameId}/${dataset}`);
  const manifestUrl = `${baseUrl}/manifest.json`;
  const cacheKey = `${gameId}:${dataset}`;

  if (!missingManifests.has(cacheKey)) {
    try {
      const manifestResponse = await fetchData(manifestUrl);
      
      if (manifestResponse.ok) {
        const files: string[] = await manifestResponse.json();
        console.log(`[DataLoader] Carregando manifest de ${dataset}: ${files.length} arquivos.`);
        
        const results = await Promise.all(
          files.map(async (file) => {
            const response = await fetchData(`${baseUrl}/${file}`);
            if (!response.ok) {
              console.error(`[DataLoader] Erro ao carregar arquivo de manifest: ${file} (Status: ${response.status})`);
              throw new Error(`Falha ao carregar ${file} de ${dataset}`);
            }
            return response.json();
          })
        );

        return results.flat() as T[];
      } else {
        missingManifests.add(cacheKey);
      }
    } catch (error: any) {
      // Se o erro foi proposital dentro do bloco 'ok' (fetch de arquivo falhou), propaga
      if (error.message?.includes("Falha ao carregar")) {
        throw error;
      }
      console.warn(`[DataLoader] Manifest não encontrado para ${dataset} em ${gameId}, tentando arquivo único.`);
      missingManifests.add(cacheKey);
    }
  }

  // Fallback: carregar arquivo único
  const response = await fetchData(`${baseUrl}.json`);
  if (!response.ok) {
    throw new Error(`Falha ao carregar dados de ${dataset} (Manifest e arquivo único não encontrados)`);
  }
  return (await response.json()) as T[];
}

export async function loadGamesList(): Promise<GameInfo[]> {
  try {
    const response = await fetchData(getPublicUrl('data/games.json'));
    if (!response.ok) {
      throw new Error(`Failed to load games list`);
    }
    const games: GameInfo[] = await response.json();
    return games.filter(j => !j.disabled);
  } catch (error) {
    console.error(`Error loading games list:`, error);
    throw error;
  }
}

export async function loadGameMaps(gameId: string): Promise<any[]> {
  try {
    const response = await fetchData(getPublicUrl(`data/${gameId}/maps.json`));
    if (!response.ok) {
      console.warn(`No maps.json found for ${gameId}, returning empty maps list.`);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.warn(`Error loading maps for ${gameId}:`, error);
    return [];
  }
}
