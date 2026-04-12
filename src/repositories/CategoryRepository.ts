import { BaseRepository } from './BaseRepository';
import type { Category } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class CategoryRepository extends BaseRepository<Category, string> {
  constructor() {
    super(db.categories);
  }

  /**
   * Procura uma categoria por ID. Se não existir, retorna um objeto básico 
   * com o ID como nome, para garantir que sempre tenhamos algo para exibir.
   */
  async getByIdWithFallback(id: string): Promise<Category> {
    const cat = await this.getById(id);
    if (cat) return cat;

    return {
      id,
      name: id,
    };
  }

  async getAllSorted(): Promise<Category[]> {
    const all = await this.getAll();
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export const categoryRepository = new CategoryRepository();
