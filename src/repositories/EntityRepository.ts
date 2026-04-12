import { BaseRepository } from './BaseRepository';
import type { Entity } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class EntityRepository extends BaseRepository<Entity, string> {
  constructor() {
    super(db.entities);
  }

  async getByParentId(parentId: string): Promise<Entity[]> {
    return this.table.where('parentId').equals(parentId).toArray();
  }

  /**
   * Retorna apenas as categorias primárias (primeiro elemento do array category)
   */
  async getPrimaryCategories(): Promise<string[]> {
    const all = await this.table.toArray();
    const categories = new Set<string>();
    
    all.forEach(entity => {
      const cats = entity.category;
      if (Array.isArray(cats)) {
        if (cats[0]) categories.add(cats[0]);
      } else if (typeof cats === 'string' && cats) {
        categories.add(cats);
      }
    });

    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }
}

export const entityRepository = new EntityRepository();
