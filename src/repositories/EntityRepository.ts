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

  async getAllCategories(): Promise<string[]> {
    const all = await this.table.toArray();
    const categories = new Set<string>();
    
    all.forEach(entity => {
      const cats = entity.category;
      if (Array.isArray(cats)) {
        cats.forEach(c => { if (c) categories.add(c); });
      } else if (typeof cats === 'string' && cats) {
        categories.add(cats);
      }
    });

    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }

  async getEntitiesByCategory(category: string): Promise<Entity[]> {
    const searchLower = category.toLowerCase();
    return this.table.filter(entity => {
      const cats = entity.category;
      if (Array.isArray(cats)) {
        return cats.some(c => c.toLowerCase() === searchLower);
      } else if (typeof cats === 'string') {
        return cats.toLowerCase() === searchLower;
      }
      return false;
    }).toArray();
  }

  async getSubCategoriesByPrimary(primary: string): Promise<string[]> {
    const all = await this.table.toArray();
    const categories = new Set<string>();
    const searchLower = primary ? primary.toLowerCase() : "all";
    
    all.forEach(entity => {
      const cats = Array.isArray(entity.category) ? entity.category : (entity.category ? [entity.category] : []);
      if (searchLower === "all" || (cats[0]?.toLowerCase() === searchLower)) {
        if (cats.length > 1) {
          cats.slice(1).forEach(c => { if (c) categories.add(c); });
        }
      }
    });

    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }
}

export const entityRepository = new EntityRepository();
