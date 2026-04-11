import { BaseRepository } from './BaseRepository';
import type { MapMetadata } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class MapRepository extends BaseRepository<MapMetadata, string> {
  constructor() {
    super(db.maps);
  }
}

export const mapRepository = new MapRepository();
