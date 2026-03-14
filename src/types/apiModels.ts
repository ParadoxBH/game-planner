import type { Item, Recipe, Entity, Shop, GameEvent, RedemptionCode } from "./gameModels";

export interface NormalizedRecipe extends Recipe {
  normalizedName: string;
  normalizedStations: string[];
  normalizedIngredients: { id: string; name?: string; amount: number }[];
  normalizedProducts: { id: string; name?: string; amount: number }[];
}

export interface ItemDetails {
  item: Item;
  productionRecipes: NormalizedRecipe[];
  usagesAsIngredient: NormalizedRecipe[];
  dropsFrom: Entity[];
  soldIn: {
    shop: Shop;
    shopItem: {
      id: string;
      price?: number;
      currency?: string;
      amount?: number;
    };
  }[];
}

export interface EntityDetails {
  entity: Entity;
  drops: {
    item?: Item;
    chance: number;
    quant: number;
    maxQuant?: number;
  }[];
}

export interface ShopDetails {
  shop: Shop;
  npc?: Entity;
}

export interface GameDataPayload {
  items: Item[];
  recipes: Recipe[];
  entities: Entity[];
  shops: Shop[];
  events: GameEvent[];
  spawns: any[];
  codes: RedemptionCode[];
}
