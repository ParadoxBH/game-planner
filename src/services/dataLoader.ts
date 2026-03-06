export async function loadGameData<T>(
  gameId: string,
  dataset: string
): Promise<T> {
  try {
    const response = await fetch(`/data/${gameId}/${dataset}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${dataset} for ${gameId}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Error loading data for ${gameId}/${dataset}:`, error);
    throw error;
  }
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
