import type { Item, Recipe, Entity, Shop, GameEvent, RedemptionCode, GameDataTypes } from "./gameModels";

export interface NormalizedRecipe extends Recipe {
  normalizedName: string;
  normalizedStations: string[];
  normalizedIngredients: { id: string; name?: string; amount: number; type?: GameDataTypes }[];
  normalizedProducts: { id: string; name?: string; amount: number; type?: GameDataTypes }[];
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
  recipes: NormalizedRecipe[];
  spawns: any[];
}

export interface ShopDetails {
  shop: Shop;
  npc?: Entity;
}

export interface RecipeDetails {
  recipe: NormalizedRecipe;
  ingredients: {
    id: string;
    name?: string;
    amount: number;
    type?: GameDataTypes;
    data?: Item | Entity;
    dataOptions?: (Item | Entity)[];
  }[];
  products: {
    id: string;
    name?: string;
    amount: number;
    type?: GameDataTypes;
    data?: Item | Entity;
    dataOptions?: (Item | Entity)[];
  }[];
}

export interface GameDataPayload {
  items: Item[];
  recipes: Recipe[];
  entities: Entity[];
  shops: Shop[];
  events: GameEvent[];
  spawns: any[];
  codes: RedemptionCode[];
  gameInfo?: any;
}
