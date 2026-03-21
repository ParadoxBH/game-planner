import type {
  Item,
  Recipe,
  Entity,
  ReferencePoints,
} from "../types/gameModels";
import type {
  NormalizedRecipe,
  ItemDetails,
  EntityDetails,
  RecipeDetails,
  ShopDetails,
  EventDetails,
  GameDataPayload,
  SearchOptions,
  PaginatedResponse,
} from "../types/apiModels";
import { getCraftingTotals } from "../utils/craftingTree";
import type { TreeOptions } from "../utils/craftingTree";
import { isPointInPolygon } from "../utils/spatial";
import { parseWKTPoint, parseWKTPolygon } from "../utils/wkt";

export class ApiService {
  private data: GameDataPayload;
  private cachedNormalizedRecipes: NormalizedRecipe[];

  constructor(data: GameDataPayload) {
    this.data = data;
    this.cachedNormalizedRecipes = data.recipes.map(r => this.normalizeRecipe(r));
  }

  private applyAdvancedSearch<T>(list: T[], options?: SearchOptions): PaginatedResponse<T> | T[] {
    if (!options) return list;

    let filteredList = [...list];

    if (options.filters) {
      const filters = options.filters;
      const processedFilters = Object.entries(filters)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
          const values = Array.isArray(value) ? value : [value];
          const rules = values.map(v => {
            const str = String(v);
            const negate = str.startsWith("!");
            return { negate, target: negate ? str.substring(1) : str };
          });
          return { key, rules };
        });

      if (processedFilters.length > 0) {
        filteredList = filteredList.filter((item: any) => {
          return processedFilters.every(({ key, rules }) => {
            const itemValue = item[key];
            const isArray = Array.isArray(itemValue);
            
            return rules.every(({ negate, target }) => {
              if (isArray) {
                const matches = itemValue.some(v => String(v) === target);
                return negate ? !matches : matches;
              }
              const matches = String(itemValue) === target;
              return negate ? !matches : matches;
            });
          });
        });
      }
    }

    if (!options.pagination) {
      return filteredList;
    }

    const { page = 1, perPage = 20 } = options.pagination;
    const total = filteredList.length;
    const lastPage = Math.ceil(total / perPage);
    const offset = (page - 1) * perPage;
    const paginatedData = filteredList.slice(offset, offset + perPage);

    return {
      data: paginatedData,
      total,
      page,
      perPage,
      lastPage,
    };
  }

  public getItems(options?: SearchOptions | ((item: Item) => boolean)): Item[] | PaginatedResponse<Item> {
    if (typeof options === "function") {
      return this.data.items.filter(options);
    }
    return this.applyAdvancedSearch(this.data.items, options) as Item[] | PaginatedResponse<Item>;
  }

  public getEntities(options?: SearchOptions | ((entity: Entity) => boolean)): Entity[] | PaginatedResponse<Entity> {
    if (typeof options === "function") {
      return this.data.entities.filter(options);
    }
    return this.applyAdvancedSearch(this.data.entities, options) as Entity[] | PaginatedResponse<Entity>;
  }

  public getRecipes(options?: SearchOptions | ((recipe: NormalizedRecipe) => boolean)): NormalizedRecipe[] | PaginatedResponse<NormalizedRecipe> {
    const normalized = this.cachedNormalizedRecipes;
    if (typeof options === "function") {
      return normalized.filter(options);
    }
    return this.applyAdvancedSearch(normalized, options) as NormalizedRecipe[] | PaginatedResponse<NormalizedRecipe>;
  }

  public getItemDetails(itemId: string): ItemDetails | null {
    const item = this.data.items.find((i) => i.id === itemId);
    if (!item) return null;

    const normalizedRecipes = this.data.recipes.map((r) =>
      this.normalizeRecipe(r)
    );

    const productionRecipes = normalizedRecipes.filter((r) =>
      r.normalizedProducts.some((p) => p.id === itemId)
    );

    const usagesAsIngredient = normalizedRecipes.filter((r) =>
      r.normalizedIngredients.some((ing) => ing.id === itemId)
    );

    const dropsFrom = this.data.entities.filter((e) =>
      e.drops?.some((d) => d.itemId === itemId)
    );

    const soldIn: ItemDetails["soldIn"] = [];
    this.data.shops.forEach((s) => {
      s.groups.forEach((g) => {
        g.items.forEach((i) => {
          if (i.id === itemId) {
            soldIn.push({
              shop: s,
              shopItem: {
                id: i.id as string,
                price: i.price,
                currency: i.currency,
                amount: i.amount,
              },
            });
          }
        });
      });
    });

    return {
      item,
      productionRecipes,
      usagesAsIngredient,
      dropsFrom,
      soldIn,
    };
  }

  public getEntityDetails(entityId: string): EntityDetails | null {
    const entity = this.data.entities.find((e) => e.id === entityId);
    if (!entity) return null;

    // Hierarchy
    const parent = entity.parentId ? this.data.entities.find(e => e.id === entity.parentId) : undefined;
    const children = this.data.entities.filter(e => e.parentId === entityId);

    // Potential Spawns (Explicit Rules)
    const explicitSpawns = this.data.referencePoints
      .filter(s => s.locationId === entityId || (s.type === "rule" && s.locationId === entityId))
      .map(s => ({
        entity: this.data.entities.find(e => e.id === s.entityId) || this.data.items.find(i => i.id === s.entityId),
        chance: s.chance,
        quantity: s.quantity,
        conditions: s.conditions
      }))
      .filter(s => s.entity) as EntityDetails["potentialSpawns"];

    // Spatial Spawns (Point-in-Polygon Detection)
    let spatialSpawns: EntityDetails["potentialSpawns"] = [];
    if (entity.geom?.type === "Polygon") {
      const polygonCoords = parseWKTPolygon(entity.geom.coordinates);
      if (polygonCoords.length > 0) {
        const pointsInside = this.data.referencePoints.filter(s => {
          if (!s.geom || s.geom.type !== "Point") return false;
          const pointCoords = parseWKTPoint(s.geom.coordinates);
          // WKT is [X, Y]
          return isPointInPolygon([pointCoords[0], pointCoords[1]], polygonCoords);
        });

        spatialSpawns = pointsInside.map(s => ({
          entity: this.data.entities.find(e => e.id === s.entityId) || this.data.items.find(i => i.id === s.entityId),
          chance: s.chance,
          quantity: s.quantity,
          conditions: s.conditions
        })).filter(s => s.entity) as EntityDetails["potentialSpawns"];
      }
    }

    // Merge potential spawns
    const potentialSpawns = [...(explicitSpawns || []), ...(spatialSpawns || [])];
    // Remove duplicates
    const uniquePotentialSpawns = potentialSpawns.filter((v, i, a) => a.findIndex(t => t.entity.id === v.entity.id) === i);

    const drops = (entity.drops || []).map((d) => ({
      item: this.data.items.find((i) => i.id === d.itemId),
      chance: d.chance,
      quant: d.quant,
      maxQuant: d.maxQuant,
    }));

    const recipes = this.data.recipes
      .map((r) => this.normalizeRecipe(r))
      .filter((r) => {
        return r.normalizedProducts.some((p) => {
          if (p.id === entityId) return true;
          if (p.type === "category") {
            const categories = Array.isArray(entity.category) ? entity.category : [entity.category];
            return categories.includes(p.id);
          }
          return false;
        });
      });

    const referencePoints = this.data.referencePoints.filter((s) => s.entityId?.toLowerCase() === entityId.toLowerCase());
    const shop = this.data.shops.find((s) => s.npcId?.toLowerCase() === entityId.toLowerCase());

    return {
      entity,
      parent,
      children,
      potentialSpawns: uniquePotentialSpawns,
      drops,
      recipes,
      referencePoints,
      shop,
    };
  }

  public getShopDetails(shopId: string): ShopDetails | null {
    const shop = this.data.shops.find((s) => s.id === shopId);
    if (!shop) return null;

    const npc = this.data.entities.find((e) => e.id === shop.npcId);

    return {
      shop,
      npc,
    };
  }

  public getRecipeDetails(recipeId: string): RecipeDetails | null {
    const rawRecipe = this.data.recipes.find((r) => r.id === recipeId);
    if (!rawRecipe) return null;

    const recipe = this.normalizeRecipe(rawRecipe);

    // Setup options for cost calculation
    const itemToShopIdMap = new Map<string, string>();
    this.data.shops.forEach((shop) => {
      shop.groups.forEach((group) => {
        group.items.forEach((shopItem) => {
          itemToShopIdMap.set(shopItem.id, shop.id);
        });
      });
    });

    const recipeMapByProduct = new Map<string, Recipe>();
    this.data.recipes.forEach((r) => {
      if (r.itemId) recipeMapByProduct.set(r.itemId, r);
      r.products?.forEach((p) => recipeMapByProduct.set(p.id, r));
    });

    const itemMap = new Map<string, Item>();
    this.data.items.forEach((i) => itemMap.set(i.id, i));
    const entityMap = new Map<string, Entity>();
    this.data.entities.forEach((e) => entityMap.set(e.id, e));

    const options: TreeOptions = {
      itemMap,
      entityMap,
      recipeMapByProduct,
      shopMap: itemToShopIdMap,
    };

    const ingredients = recipe.normalizedIngredients.map((ing) => {
      const isCategory = ing.type === "category";
      let dataOptions: (Item | Entity)[] | undefined = undefined;
      let bestOptionId: string | undefined = undefined;

      if (isCategory) {
        const itemOptions = this.data.items
          .filter((item) => {
            if (Array.isArray(item.category)) {
              return item.category.includes(ing.id);
            }
            return item.category === ing.id;
          })
          .map((i) => ({ ...i, type: "item" as const }));

        const entityOptions = this.data.entities
          .filter((e) => {
            if (Array.isArray(e.category)) {
              return e.category.includes(ing.id);
            }
            return e.category === ing.id;
          })
          .map((e) => ({ ...e, type: "entity" as const }));

        dataOptions = [...itemOptions, ...entityOptions];

        // Find best option using calculator logic
        if (dataOptions.length > 0) {
          let minCost = Infinity;
          dataOptions.forEach((opt) => {
            const totals = getCraftingTotals(opt.id, 1, "item", options);
            console.log(`[ApiService] Cost for ${opt.id}: ${totals.totalCost}`);
            // If an item has a price/cost, it might be better to show it than items with 0 (unknown)
            if (totals.totalCost < minCost) {
              minCost = totals.totalCost;
              bestOptionId = opt.id;
            }
          });
          console.log(`[ApiService] Best option for ${ing.id}: ${bestOptionId} (Min cost: ${minCost})`);
        }
      }

      return {
        ...ing,
        data: isCategory
          ? undefined
          : ing.type === "entity"
          ? this.data.entities.find((e) => e.id === ing.id)
          : this.data.items.find((i) => i.id === ing.id),
        dataOptions,
        bestOptionId,
      };
    });

    const products = recipe.normalizedProducts.map((p) => {
      const isCategory = p.type === "category";
      let dataOptions: (Item | Entity)[] | undefined = undefined;

      if (isCategory) {
        const itemOptions = this.data.items
          .filter((item) => {
            if (Array.isArray(item.category)) {
              return item.category.includes(p.id);
            }
            return item.category === p.id;
          })
          .map((i) => ({ ...i, type: "item" as const }));

        const entityOptions = this.data.entities
          .filter((e) => {
            if (Array.isArray(e.category)) {
              return e.category.includes(p.id);
            }
            return e.category === p.id;
          })
          .map((e) => ({ ...e, type: "entity" as const }));

        dataOptions = [...itemOptions, ...entityOptions];
      }

      return {
        ...p,
        data: isCategory
          ? undefined
          : p.type === "entity"
          ? this.data.entities.find((e) => e.id === p.id)
          : this.data.items.find((i) => i.id === p.id),
        dataOptions,
      };
    });

    return {
      recipe,
      ingredients,
      products,
    };
  }

  public getEventDetails(eventId: string): EventDetails | null {
    const event = this.data.events.find((e) => e.id === eventId);
    if (!event) return null;

    // Items belonging to this event or category
    const items = this.data.items.filter((item) => {
      if (Array.isArray(item.category)) {
        return item.category.includes(eventId);
      }
      return item.category === eventId;
    });

    // Recipes unlocked by this event or using stations belonging to this event
    const normalizedRecipes = this.cachedNormalizedRecipes;
    const recipes = normalizedRecipes.filter((r) => {
      const isUnlockedByEvent = r.unlock?.some(
        (u) => u.type === "event" && u.value === eventId
      );
      const isProducedInEventStation = r.normalizedStations.some((s) => {
        const station = this.data.entities.find((e) => e.id === s);
        if (Array.isArray(station?.category)) {
          return station?.category.includes(eventId);
        }
        return station?.category === eventId;
      });
      return isUnlockedByEvent || isProducedInEventStation;
    });

    // Entities belonging to this event category
    const entities = this.data.entities.filter((entity) => {
      if (Array.isArray(entity.category)) {
        return entity.category.includes(eventId);
      }
      return entity.category === eventId;
    });

    return {
      event,
      items,
      recipes,
      entities,
    };
  }

  public normalizeRecipe(recipe: Recipe): NormalizedRecipe {
    const stations = recipe.stations || recipe.ProducedIn || [];

    // Normalize ingredients
    let ingredients: { id: string; name?: string; amount: number }[] = [];
    if (recipe.ingredients) {
      ingredients = recipe.ingredients.map((i) => ({ ...i }));
    } else if (recipe.Ingredients) {
      ingredients = recipe.Ingredients.map((i: any) => ({
        id: i.ClassName || i.id,
        name: i.Name || i.name,
        amount: i.Amount || i.amount || 1,
        type: i.type || (this.data.entities.some(e => e.id === (i.ClassName || i.id)) ? "entity" : "item")
      }));
    }

    // Normalize products
    let products: { id: string; name?: string; amount: number }[] = [];
    if (recipe.itemId) {
      products.push({ id: recipe.itemId, amount: recipe.amount || 1 });
    } else if (recipe.products) {
      products = recipe.products.map((p) => ({ ...p }));
    } else if (recipe.Products) {
      products = recipe.Products.map((p: any) => ({
        id: p.ClassName || p.id,
        name: p.Name || p.name,
        amount: p.Amount || p.amount || 1,
        type: p.type || (this.data.entities.some(e => e.id === (p.ClassName || p.id)) ? "entity" : "item")
      }));
    }

    const firstProduct = products[0];
    const itemData = firstProduct
      ? this.data.items.find((i) => i.id === firstProduct.id)
      : null;

    const normalizedName =
      recipe.name || 
      itemData?.name || 
      this.data.entities.find((e) => e.id === firstProduct?.id)?.name ||
      firstProduct?.id || 
      recipe.id;

    return {
      ...recipe,
      normalizedName,
      normalizedStations: stations,
      normalizedIngredients: ingredients,
      normalizedProducts: products,
    };
  }
}
