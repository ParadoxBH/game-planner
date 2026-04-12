import { BaseRepository } from './BaseRepository';
import type { Recipe } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class RecipeRepository extends BaseRepository<Recipe, string> {
  constructor() {
    super(db.recipes);
  }

  async getByProductId(productId: string): Promise<Recipe[]> {
    return this.table.where('itemId').equals(productId).toArray();
  }

  /**
   * Retorna apenas as estações primárias (primeiro elemento do array stations/ProducedIn)
   */
  async getPrimaryStations(): Promise<string[]> {
    const all = await this.table.toArray();
    const stations = new Set<string>();
    
    all.forEach(recipe => {
      const rawStations = recipe.stations || (recipe as any).ProducedIn || [];
      const primary = Array.isArray(rawStations) ? rawStations[0] : rawStations;
      if (primary) stations.add(primary);
    });

    return Array.from(stations).sort((a, b) => a.localeCompare(b));
  }
}

export const recipeRepository = new RecipeRepository();
