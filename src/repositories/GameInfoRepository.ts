import { BaseRepository } from './BaseRepository';
import type { GameInfo } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class GameInfoRepository extends BaseRepository<GameInfo, string> {
  constructor() {
    super(db.gameInfo);
  }
}

export const gameInfoRepository = new GameInfoRepository();
