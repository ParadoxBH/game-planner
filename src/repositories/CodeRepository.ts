import { BaseRepository } from './BaseRepository';
import type { RedemptionCode } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class CodeRepository extends BaseRepository<RedemptionCode, string> {
  constructor() {
    super(db.codes);
  }
}

export const codeRepository = new CodeRepository();
