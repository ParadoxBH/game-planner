import { BaseRepository } from './BaseRepository';
import type { Conjunto } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class ConjuntoRepository extends BaseRepository<Conjunto, string> {
  constructor() {
    super(db.conjuntos);
  }
}

export const conjuntoRepository = new ConjuntoRepository();
