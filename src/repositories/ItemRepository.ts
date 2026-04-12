import { BaseRepository } from './BaseRepository';
import type { Item } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class ItemRepository extends BaseRepository<Item, string> {
  constructor() {
    super(db.items);
  }

  /**
   * Retorna apenas as categorias primárias (primeiro elemento do array category)
   */
  async getPrimaryCategories(): Promise<string[]> {
    const all = await this.table.toArray();
    const categories = new Set<string>();
    
    all.forEach(item => {
      const cats = item.category;
      if (Array.isArray(cats)) {
        if (cats[0]) categories.add(cats[0]);
      } else if (typeof cats === 'string' && cats) {
        categories.add(cats);
      }
    });

    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }

  async getAllCategories(): Promise<string[]> {
    const all = await this.table.toArray();
    const categories = new Set<string>();
    
    all.forEach(item => {
      const cats = item.category;
      if (Array.isArray(cats)) {
        cats.forEach(c => { if (c) categories.add(c); });
      } else if (typeof cats === 'string' && cats) {
        categories.add(cats);
      }
    });

    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }
}

export const itemRepository = new ItemRepository();
