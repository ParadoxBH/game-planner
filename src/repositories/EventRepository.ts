import { BaseRepository } from './BaseRepository';
import type { GameEvent } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class EventRepository extends BaseRepository<GameEvent, string> {
  constructor() {
    super(db.events);
  }
}

export const eventRepository = new EventRepository();
