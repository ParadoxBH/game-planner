export async function loadGameData<T>(
  gameId: string,
  dataset: string
): Promise<T[]> {
  const baseUrl = `/data/${gameId}/${dataset}`;
  const manifestUrl = `${baseUrl}/manifest.json`;

  try {
    // Tenta carregar o manifest primeiro
    const manifestResponse = await fetch(manifestUrl);
    if (manifestResponse.ok) {
      const files: string[] = await manifestResponse.json();
      const promises = files.map(async (file) => {
        const response = await fetch(`${baseUrl}/${file}`);
        if (!response.ok) throw new Error(`Falha ao carregar ${file}`);
        return response.json();
      });

      const results = await Promise.all(promises);
      return results.flat() as T[];
    }
  } catch (error) {
    console.warn(`Manifest não encontrado para ${dataset} em ${gameId}, tentando arquivo único.`);
    // Continue to fallback if manifest loading fails (e.g., 404 or network error)
  }

  // Fallback: carregar arquivo único
  const response = await fetch(`${baseUrl}.json`);
  if (!response.ok) {
    throw new Error(`Falha ao carregar dados de ${dataset}`);
  }
  return (await response.json()) as T[]; // Cast to T[] as per new return type
}

export async function loadGamesList(): Promise<any[]> {
  try {
    const response = await fetch(`/data/games.json`);
    if (!response.ok) {
      throw new Error(`Failed to load games list`);
    }
    return await response.json();
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
