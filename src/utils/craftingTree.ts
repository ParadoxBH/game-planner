import type { Recipe, RecipeItem, Item, Entity, GameDataTypes } from "../types/gameModels";

export interface CraftNode {
  id: string;
  name: string;
  icon?: string;
  amount: number;
  type: GameDataTypes;
  recipe?: Recipe;
  ingredients: CraftNode[];
  isBaseResource: boolean;
  buyPrice: number;
  sellPrice: number;
  totalCost: number;
  shopName?: string;
  currency?: string;
  categoryId?: string; // If resolved from a category
}

export interface TreeOptions {
  itemMap: Map<string, Item>;
  entityMap: Map<string, Entity>;
  recipeMapByProduct: Map<string, Recipe>;
  allRecipesByProduct?: Map<string, Recipe[]>;
  shopMap?: Map<string, string>; // item/entity id -> shop id
  shopNames?: Map<string, string>; // shop id -> shop name
  shopItemPrices?: Map<string, { price: number; quant?: number; currency?: string; shopName?: string }>; // item/entity id -> price details
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
  let actualType: GameDataTypes = type as GameDataTypes;
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

  const shopId = options.shopMap?.get(actualId);
  const shopPriceInfo = options.shopItemPrices?.get(actualId);
  const shopName = shopPriceInfo?.shopName || (shopId ? options.shopNames?.get(shopId) : undefined);

  let buyPrice = item?.buyPrice ?? entity?.buyPrice ?? 0;
  let currency = "ouro";

  if (shopPriceInfo && shopPriceInfo.price !== undefined) {
    const quant = shopPriceInfo.quant && shopPriceInfo.quant > 1 ? shopPriceInfo.quant : 1;
    buyPrice = shopPriceInfo.price / quant;
    currency = shopPriceInfo.currency || "ouro";
  }
  const sellPrice = item?.sellPrice ?? entity?.sellPrice ?? 0;

  const node: CraftNode = {
    id: actualId,
    name,
    icon,
    amount,
    type: actualType,
    ingredients: [],
    isBaseResource: !recipe && (!shopId && !shopPriceInfo && buyPrice === 0),
    buyPrice,
    sellPrice,
    totalCost: buyPrice * amount,
    shopName,
    currency,
    categoryId,
  };

  if (!recipe || visited.has(actualId)) {
    if (shopPriceInfo && currency !== "ouro" && !visited.has(currency) && (options.shopItemPrices?.has(currency) || options.itemMap?.has(currency))) {
      const ingNode = getCraftingTree(currency, buyPrice * amount, "item", options, new Set([...visited, actualId]));
      node.ingredients.push(ingNode);
    }
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
  
  return node;
}

export interface ShopPurchase {
  id: string;
  amount: number;
  unitPrice: number;
  currency: string;
  shopName?: string;
}

export interface CraftingTotals {
  totalCost: number; // Custo em Ouro
  recipeIds: Set<string>;
  shopIds: Set<string>;
  baseResources: Map<string, number>;
  shopPurchases: Map<string, ShopPurchase>;
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
    
    return {
      totalCost: cached.totalCost * amount,
      recipeIds: new Set(cached.recipeIds),
      shopIds: new Set(cached.shopIds),
      baseResources: new Map(Array.from(cached.baseResources.entries()).map(([k, v]) => [k, v * amount])),
      shopPurchases: new Map(Array.from(cached.shopPurchases.entries()).map(([k, v]) => [k, { ...v, amount: v.amount * amount }]))
    };
  }

  const { itemMap, entityMap, recipeMapByProduct, shopMap } = options;
  const recipe = (type === "item" || type === "entity" || type === "category") ? recipeMapByProduct.get(id) : undefined;

  if (!recipe || visited.has(id)) {
    const item = itemMap.get(id);
    const entity = entityMap.get(id);
    const shopId = shopMap?.get(id);
    const shopPriceInfo = options.shopItemPrices?.get(id);
    const shopName = shopPriceInfo?.shopName || (shopId ? options.shopNames?.get(shopId) : undefined);

    let buyPrice = item?.buyPrice ?? entity?.buyPrice ?? 0;
    let currency = "ouro";
    let isShopItem = false;
    let unitPrice = buyPrice;

    if (shopPriceInfo && shopPriceInfo.price !== undefined) {
      isShopItem = true;
      const quant = shopPriceInfo.quant && shopPriceInfo.quant > 1 ? shopPriceInfo.quant : 1;
      unitPrice = shopPriceInfo.price / quant;
      currency = shopPriceInfo.currency || "ouro";
      if (currency === "ouro") {
        buyPrice = unitPrice;
      } else {
        buyPrice = 0; // Ouro totalCost não soma outras moedas diretamente
      }
    } else if (buyPrice > 0 || shopId) {
      isShopItem = true;
      unitPrice = buyPrice;
    }

    const baseResources = new Map<string, number>();
    const shopPurchases = new Map<string, ShopPurchase>();

    if (isShopItem) {
      if (currency !== "ouro" && !visited.has(currency) && (options.shopItemPrices?.has(currency) || options.itemMap?.has(currency))) {
        const currencyTotals = getCraftingTotals(currency, unitPrice * amount, "item", options, cache, new Set([...visited, id]));
        currencyTotals.baseResources.forEach((amt, rid) => {
          baseResources.set(rid, (baseResources.get(rid) || 0) + amt);
        });
        currencyTotals.shopPurchases.forEach((purchase, pid) => {
          const existing = shopPurchases.get(pid);
          if (existing) {
            existing.amount += purchase.amount;
          } else {
            shopPurchases.set(pid, { ...purchase });
          }
        });
      } else {
        shopPurchases.set(id, {
          id,
          amount,
          unitPrice,
          currency,
          shopName,
        });
      }
    } else {
      baseResources.set(id, amount);
    }

    const shopIds = new Set<string>();
    if (shopId) shopIds.add(shopId);

    return {
      totalCost: buyPrice * amount,
      recipeIds: new Set(),
      shopIds,
      baseResources,
      shopPurchases
    };
  }

  const result: CraftingTotals = {
    totalCost: 0,
    recipeIds: new Set([recipe.id]),
    shopIds: new Set(),
    baseResources: new Map(),
    shopPurchases: new Map()
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
    ingTotals.shopPurchases.forEach((purchase, pid) => {
      const existing = result.shopPurchases.get(pid);
      if (existing) {
        existing.amount += purchase.amount;
      } else {
        result.shopPurchases.set(pid, { ...purchase });
      }
    });
  });

  const unitResult: CraftingTotals = {
    totalCost: result.totalCost / amount,
    recipeIds: result.recipeIds,
    shopIds: result.shopIds,
    baseResources: new Map(Array.from(result.baseResources.entries()).map(([k, v]) => [k, v / amount])),
    shopPurchases: new Map(Array.from(result.shopPurchases.entries()).map(([k, v]) => [k, { ...v, amount: v.amount / amount }]))
  };
  cache.set(cacheKey, unitResult);

  return result;
}
