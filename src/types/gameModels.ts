export interface Item {
  id: string;
  name: string;
  icon?: string;
  category?: string | string[];
  description?: string;
  buyPrice?: number;
  sellPrice?: number;
}

export interface EntityDrop {
  itemId: string;
  chance: number;
  quant: number;
  maxQuant?: number;
}

export interface Entity {
  id: string;
  name: string;
  category?: string | string[];
  description?: string;
  icon?: string;
  buyPrice?: number;
  sellPrice?: number;
  parentId?: string; // Para hierarquia (ex: Cripta dentro de Pântano)
  potentialSpawns?: {
    entityId: string;
    chance?: number;
    quantity?: string;
    conditions?: string;
  }[];
  geom?: {
    type: string;
    coordinates: string;
  };
  requirements?: {
    itemId: string;
    quant: number;
    maxQuant?: number;
  }[];
  drops?: EntityDrop[];
}

export type GameDataTypes = "entity" | "item" | "recipe" | "reference_point" | "event" | "skill" | "category";

export interface RecipeItem {
  id: string;
  name?: string;
  amount: number;
  type?: GameDataTypes;
}

export interface RecipeUnlock {
  id: string;
  type?: string;
  value: string;
}

export interface Recipe {
  id: string;
  name?: string;
  itemId?: string; // Legacy/Single product
  amount?: number; // Legacy amount
  ingredients?: RecipeItem[];
  Ingredients?: any[]; // Raw data support
  products?: RecipeItem[];
  Products?: any[]; // Raw data support
  stations?: string[];
  ProducedIn?: string[]; // Raw data support
  unlock?: RecipeUnlock[];
  craftTime?: number; // Time in seconds
}

export interface ShopCondition {
  type: string;
  id: string;
  description?: string;
}

export interface ShopExchange {
  id: string;
  amount: number;
  type?: GameDataTypes;
}

export interface ShopItem {
  id: string;
  type?: GameDataTypes;
  amount?: number;
  price?: number;
  currency?: string;
  resetType?: "diario" | "semanal" | "unique";
  exchange?: ShopExchange[];
  conditions?: ShopCondition[];
}

export interface ShopGroup {
  name: string;
  resetType?: "diario" | "semanal" | "unique";
  items: ShopItem[];
}

export interface Shop {
  id: string;
  name: string;
  npcId: string;
  groups: ShopGroup[];
  conditional?: ShopCondition[];
}

export interface GameEvent {
  id: string;
  name: string;
  type: "clima" | "season" | "mapa" | "event";
  description: string;
  icon: string;
  banner?: string;
  period: {
    start?: string;
    end?: string;
  };
}

export interface MapMetadata {
  id: string;
  name: string;
  type: "single" | "layered" | "tile" | "procedural";
  defaultView?: "map" | "dashboard";
  availableViews?: ("map" | "dashboard")[];
  gridSize?: number;
  url?: string;
  urlPattern?: string;
  layers?: number;
  bounds: [[number, number], [number, number]];
  minZoom: number;
  maxZoom: number;
  tileMinZoom?: number;
  tileMaxZoom?: number;
  tileRange?: {
    z: number;
    min: [number, number];
    max: [number, number];
  };
  thumbnail?: string;
  description?: string;
}

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  maps: MapMetadata[];
}

export interface ReferencePoints {
  id: string;
  type: "spawn" | "poi" | "location" | "biome" | "rule";
  entityId: string;
  name?: string;
  description?: string;
  icon?: string;
  locationId?: string; // ID da Região/Mapa onde spawna (legado ou para regras)
  parentId?: string; // Para hierarquia (ex: POI dentro de Biome)
  mode?: "once" | "respawn";
  conditions?: Record<string, any>;
  chance?: number;
  quantity?: string;
  geom: {
    type: string;
    coordinates: string;
  };
  mapId?: string;
  respawnDelay?: number;
  data?: Record<string, any>;
}

export interface RedemptionCode {
  code: string;
  rewards: {
    id: string;
    quantity: number;
  }[];
  addedAt: string;
  expiresAt: string;
}
