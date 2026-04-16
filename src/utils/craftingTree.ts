import type { Recipe, RecipeItem, Item, Entity } from "../types/gameModels";

export interface CraftNode {
  id: string;
  name: string;
  icon?: string;
  amount: number;
  type: "category";
  recipe?: Recipe;
  ingredients: CraftNode[];
  isBaseResource: boolean;
  buyPrice: number;
  sellPrice: number;
  totalCost: number;
  shopName?: string;
  categoryId?: string; // If resolved from a category
}

export interface TreeOptions {
  itemMap: Map<string, Item>;
  entityMap: Map<string, Entity>;
  recipeMapByProduct: Map<string, Recipe>;
  allRecipesByProduct?: Map<string, Recipe[]>;
  shopMap?: Map<string, string>; // item/entity id -> shop id
  shopNames?: Map<string, string>; // shop id -> shop name
  categoryChoices?: Record<string, string>;
  recipeChoices?: Record<string, string>; // itemId -> recipeId
}

export function getCraftingTree(
  id: string,
  amount: number,
  type: string,
  options: TreeOptions,
  visited: Set<string> = new Set()
): CraftNode {
  const { itemMap, entityMap, categoryChoices } = options;

  // Resolve category if choice exists
  let actualId = id;
  let actualType = type;
  let resolvedFromCategory = false;

  if (type === "category" && categoryChoices?.[id]) {
    actualId = categoryChoices[id];
    actualType = itemMap.has(actualId) ? "item" : entityMap.has(actualId) ? "entity" : "item";
    resolvedFromCategory = true;
  }
  const categoryId = type === "category" ? id : undefined;

  const item = itemMap.get(actualId);
  const entity = entityMap.get(actualId);
  
  // Resolve recipe choice
  let recipe = options.recipeMapByProduct.get(actualId);
  if (options.recipeChoices?.[actualId]) {
    const chosenRecipeId = options.recipeChoices[actualId];
    const alts = options.allRecipesByProduct?.get(actualId);
    if (alts) {
        recipe = alts.find(r => r.id === chosenRecipeId) || recipe;
    }
  }
  
  const name = item?.name || entity?.name || (resolvedFromCategory ? `${id} (${actualId})` : id);
  const icon = item?.icon || entity?.icon;
  const buyPrice = item?.buyPrice ?? entity?.buyPrice ?? 0;
  const sellPrice = item?.sellPrice ?? entity?.sellPrice ?? 0;

  const shopId = options.shopMap?.get(actualId);
  const shopName = shopId ? options.shopNames?.get(shopId) : undefined;

  const node: CraftNode = {
    id: actualId,
    name,
    icon,
    amount,
    type: actualType,
    ingredients: [],
    isBaseResource: !recipe,
    buyPrice,
    sellPrice,
    totalCost: buyPrice * amount,
    shopName,
    categoryId,
  };

  if (!recipe || visited.has(actualId)) {
    return node;
  }

  node.recipe = recipe;
  const newVisited = new Set(visited);
  newVisited.add(actualId);

  // Calculate batches needed
  let productAmount = recipe.amount || 1;
  const product = recipe.products?.find((p) => p.id === actualId);
  if (product) {
    productAmount = product.amount;
  }

  const batches = Math.ceil(amount / productAmount);

  const ingredients: RecipeItem[] = recipe.ingredients || [];
  ingredients.forEach((ing) => {
    const ingNode = getCraftingTree(
      ing.id,
      ing.amount * batches,
      ing.type || "item",
      options,
      newVisited
    );
    node.ingredients.push(ingNode);
  });

  // Calculate total cost recursively if not buying the item directly
  // However, in the calculators, they often want "base cost" which means decomposing everything.
  // We'll let the UI decide if it wants to show the sum of ingredients or the buy price.
  
  return node;
}

export interface CraftingTotals {
  totalCost: number;
  recipeIds: Set<string>;
  shopIds: Set<string>;
  baseResources: Map<string, number>;
}

export function getCraftingTotals(
  id: string,
  amount: number,
  type: string,
  options: TreeOptions,
  cache: Map<string, CraftingTotals> = new Map(),
  visited: Set<string> = new Set()
): CraftingTotals {
  const cacheKey = `${type}-${id}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!;
    
    // Scale cached results for the current amount
    return {
      totalCost: cached.totalCost * amount, // Cache stores for amount = 1
      recipeIds: new Set(cached.recipeIds),
      shopIds: new Set(cached.shopIds),
      baseResources: new Map(Array.from(cached.baseResources.entries()).map(([k, v]) => [k, v * amount]))
    };
  }

  const { itemMap, entityMap, recipeMapByProduct, shopMap } = options;
  const recipe = (type === "item" || type === "entity" || type === "category") ? recipeMapByProduct.get(id) : undefined;

  if (!recipe || visited.has(id)) {
    const item = itemMap.get(id);
    const entity = entityMap.get(id);
    const buyPrice = item?.buyPrice ?? entity?.buyPrice ?? 0;
    const shopId = shopMap?.get(id);
    
    const baseResources = new Map<string, number>();
    if (buyPrice === 0) {
      baseResources.set(id, amount);
    }

    const shopIds = new Set<string>();
    if (shopId) shopIds.add(shopId);

    return {
      totalCost: buyPrice * amount,
      recipeIds: new Set(),
      shopIds,
      baseResources
    };
  }

  const result: CraftingTotals = {
    totalCost: 0,
    recipeIds: new Set([recipe.id]),
    shopIds: new Set(),
    baseResources: new Map()
  };

  const newVisited = new Set(visited);
  newVisited.add(id);

  let productAmount = recipe.amount || 1;
  const product = recipe.products?.find((p) => p.id === id);
  if (product) productAmount = product.amount;

  const batches = amount / productAmount;

  const ingredients: RecipeItem[] = recipe.ingredients || [];
  ingredients.forEach((ing) => {
    const ingTotals = getCraftingTotals(
      ing.id,
      ing.amount * batches,
      ing.type || "item",
      options,
      cache,
      newVisited
    );

    result.totalCost += ingTotals.totalCost;
    ingTotals.recipeIds.forEach((rid) => result.recipeIds.add(rid));
    ingTotals.shopIds.forEach((sid) => result.shopIds.add(sid));
    ingTotals.baseResources.forEach((amt, rid) => {
      result.baseResources.set(rid, (result.baseResources.get(rid) || 0) + amt);
    });
  });

  // Store in cache as unit of 1 for future scaling
  const unitResult: CraftingTotals = {
    totalCost: result.totalCost / amount,
    recipeIds: result.recipeIds,
    shopIds: result.shopIds,
    baseResources: new Map(Array.from(result.baseResources.entries()).map(([k, v]) => [k, v / amount]))
  };
  cache.set(cacheKey, unitResult);

  return result;
}
