import Dexie, { type Table } from 'dexie';
import type { 
  Item, 
  Recipe, 
  Entity, 
  Shop, 
  GameEvent, 
  ReferencePoints, 
  RedemptionCode, 
  Conjunto,
  GameInfo,
  MapMetadata
} from '../types/gameModels';

export class GameDatabase extends Dexie {
  items!: Table<Item, string>;
  recipes!: Table<Recipe, string>;
  entities!: Table<Entity, string>;
  shops!: Table<Shop, string>;
  events!: Table<GameEvent, string>;
  referencePoints!: Table<ReferencePoints, string>;
  codes!: Table<RedemptionCode, string>;
  conjuntos!: Table<Conjunto, string>;
  gameInfo!: Table<GameInfo, string>;
  maps!: Table<MapMetadata, string>;

  constructor() {
    super('GamePlannerDB');
    
    // Schema definition
    // The first field is the primary key. 
    // Other fields are indexed for faster searching.
    this.version(1).stores({
      items: 'id, name, *category, *event',
      recipes: 'id, name, itemId, *stations, *event',
      entities: 'id, name, *category, parentId, *event',
      shops: 'id, name, npcId',
      events: 'id, name, type',
      referencePoints: 'id, entityId, locationId, parentId, mapId, type',
      codes: 'code',
      conjuntos: 'id, name, category, *event',
      gameInfo: 'id, name',
      maps: 'id, name, type'
    });
  }

  /**
   * Clears all tables for a fresh start (reconstruction)
   */
  async clearAll() {
    return Promise.all(this.tables.map(table => table.clear()));
  }
}

export const db = new GameDatabase();
