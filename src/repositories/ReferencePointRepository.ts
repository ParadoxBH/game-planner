import { BaseRepository } from './BaseRepository';
import type { ReferencePoints } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class ReferencePointRepository extends BaseRepository<ReferencePoints, string> {
  constructor() {
    super(db.referencePoints);
  }

  async getByEntityId(entityId: string): Promise<ReferencePoints[]> {
    return this.table.where('entityId').equalsIgnoreCase(entityId).toArray();
  }

  async getByLocationId(locationId: string): Promise<ReferencePoints[]> {
    return this.table.where('locationId').equals(locationId).toArray();
  }

  async getByMapId(mapId: string): Promise<ReferencePoints[]> {
    return this.table.where('mapId').equals(mapId).toArray();
  }
}

export const referencePointRepository = new ReferencePointRepository();
