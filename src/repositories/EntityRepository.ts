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
}

export const entityRepository = new EntityRepository();
