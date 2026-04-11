import { BaseRepository } from './BaseRepository';
import type { Item } from '../types/gameModels';
import { db } from '../db/gameDatabase';

export class ItemRepository extends BaseRepository<Item, string> {
  constructor() {
    super(db.items);
  }
}

export const itemRepository = new ItemRepository();
