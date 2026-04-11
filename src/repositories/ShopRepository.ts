import { BaseRepository } from './BaseRepository';
import type { Shop } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class ShopRepository extends BaseRepository<Shop, string> {
  constructor() {
    super(db.shops);
  }

  async getByNpcId(npcId: string): Promise<Shop | undefined> {
    return this.table.where('npcId').equals(npcId).first();
  }
}

export const shopRepository = new ShopRepository();
