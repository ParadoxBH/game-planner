import type { GameInfo } from "../types/gameModels";

export async function loadGameData<T>(
  gameId: string,
  dataset: string
): Promise<T[]> {
  const baseUrl = `/data/${gameId}/${dataset}`;
  const manifestUrl = `${baseUrl}/manifest.json`;

  try {
    const manifestResponse = await fetch(manifestUrl);
    
    if (manifestResponse.ok) {
      const files: string[] = await manifestResponse.json();
      console.log(`[DataLoader] Carregando manifest de ${dataset}: ${files.length} arquivos.`);
      
      const results = await Promise.all(
        files.map(async (file) => {
          const response = await fetch(`${baseUrl}/${file}`);
          if (!response.ok) {
            console.error(`[DataLoader] Erro ao carregar arquivo de manifest: ${file} (Status: ${response.status})`);
            throw new Error(`Falha ao carregar ${file} de ${dataset}`);
          }
          return response.json();
        })
      );

      return results.flat() as T[];
    }
  } catch (error: any) {
    // Se o erro foi proposital dentro do bloco 'ok' (fetch de arquivo falhou), propaga
    if (error.message?.includes("Falha ao carregar")) {
      throw error;
    }
    console.warn(`[DataLoader] Manifest não encontrado para ${dataset} em ${gameId}, tentando arquivo único.`);
  }

  // Fallback: carregar arquivo único
  const response = await fetch(`${baseUrl}.json`);
  if (!response.ok) {
    throw new Error(`Falha ao carregar dados de ${dataset} (Manifest e arquivo único não encontrados)`);
  }
  return (await response.json()) as T[];
}

export async function loadGamesList(): Promise<GameInfo[]> {
  try {
    const response = await fetch(`/data/games.json`);
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
    const response = await fetch(`/data/${gameId}/maps.json`);
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
