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
}

export const recipeRepository = new RecipeRepository();
