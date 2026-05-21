import { BaseRepository } from './BaseRepository';
import type { ReferencePoints } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class ReferencePointRepository extends BaseRepository<ReferencePoints, string> {
  constructor() {
    super(db.referencePoints);
  }

  async getByEntityId(entityId: string): Promise<ReferencePoints[]> {
    return this.table.filter(p => {
      if (p.entityId?.toLowerCase() === entityId.toLowerCase()) return true;
      if (p.spawns && p.spawns.some(s => s.entityId.toLowerCase() === entityId.toLowerCase())) return true;
      return false;
    }).toArray();
  }

  async getByLocationId(locationId: string): Promise<ReferencePoints[]> {
    return this.table.where('locationId').equals(locationId).toArray();
  }

  async getByMapId(mapId: string): Promise<ReferencePoints[]> {
    return this.table.where('mapId').equals(mapId).toArray();
  }
  
  async getByEventId(eventId: string): Promise<ReferencePoints[]> {
    return this.table.where('event').equals(eventId).toArray();
  }
}

export const referencePointRepository = new ReferencePointRepository();
