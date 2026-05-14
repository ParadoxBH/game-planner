import { BaseRepository } from './BaseRepository';
import type { ConjuntoGroup } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class ConjuntoGroupRepository extends BaseRepository<ConjuntoGroup, string> {
  constructor() {
    super(db.conjuntoGroups);
  }
}

export const conjuntoGroupRepository = new ConjuntoGroupRepository();
