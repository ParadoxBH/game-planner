import type {
  Item,
  Recipe,
  Entity,
  Conjunto,
} from "../types/gameModels";
import type {
  NormalizedRecipe,
  ItemDetails,
  EntityDetails,
  RecipeDetails,
  ShopDetails,
  EventDetails,
  SearchOptions,
  PaginatedResponse,
} from "../types/apiModels";
import { getCraftingTotals } from "../utils/craftingTree";
import type { TreeOptions } from "../utils/craftingTree";
import { isPointInPolygon } from "../utils/spatial";
import { parseWKTPoint, parseWKTPolygon } from "../utils/wkt";

import { itemRepository } from "../repositories/ItemRepository";
import { recipeRepository } from "../repositories/RecipeRepository";
import { entityRepository } from "../repositories/EntityRepository";
import { shopRepository } from "../repositories/ShopRepository";
import { eventRepository } from "../repositories/EventRepository";
import { conjuntoRepository } from "../repositories/ConjuntoRepository";
import { referencePointRepository } from "../repositories/ReferencePointRepository";

export class ApiService {
  /**
   * Data access via Repositories. Methods return Promises to mirror a real Backend API.
   */

  public async getItems(options?: SearchOptions | ((item: Item) => boolean)): Promise<Item[] | PaginatedResponse<Item>> {
    if (typeof options === "function") {
      const all = await itemRepository.getAll();
      return all.filter(options);
    }
    return itemRepository.search(options);
  }

  public async getEntities(options?: SearchOptions | ((entity: Entity) => boolean)): Promise<Entity[] | PaginatedResponse<Entity>> {
    if (typeof options === "function") {
      const all = await entityRepository.getAll();
      return all.filter(options);
    }
    return entityRepository.search(options);
  }

  public async getRecipes(options?: SearchOptions | ((recipe: NormalizedRecipe) => boolean)): Promise<NormalizedRecipe[] | PaginatedResponse<NormalizedRecipe>> {
    // Note: We might want a specialized Recipe repository or service if normalization is heavy
    const results = await recipeRepository.search(options);
    
    // Normalize if it's a list
    if (Array.isArray(results)) {
      return Promise.all(results.map(r => this.normalizeRecipe(r)));
    } else {
      return {
        ...results,
        data: await Promise.all(results.data.map(r => this.normalizeRecipe(r)))
      };
    }
  }

  public async getConjuntos(options?: SearchOptions): Promise<Conjunto[] | PaginatedResponse<Conjunto>> {
    return conjuntoRepository.search(options);
  }

  public async getItemDetails(itemId: string): Promise<ItemDetails | null> {
    const item = await itemRepository.getById(itemId);
    if (!item) return null;

    const allRecipes = await recipeRepository.getAll();
    const normalizedRecipes = await Promise.all(allRecipes.map((r) => this.normalizeRecipe(r)));

    const productionRecipes = normalizedRecipes.filter((r) =>
      r.normalizedProducts.some((p) => p.id === itemId)
    );

    const usagesAsIngredient = normalizedRecipes.filter((r) =>
      r.normalizedIngredients.some((ing) => ing.id === itemId)
    );

    const dropsFrom = await entityRepository.getAll(); // Better to filter in DB if we had Drops table
    const entitiesWithDrops = dropsFrom.filter((e) =>
      e.drops?.some((d) => d.itemId === itemId)
    );

    const shops = await shopRepository.getAll();
    const soldIn: ItemDetails["soldIn"] = [];
    shops.forEach((s) => {
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
      dropsFrom: entitiesWithDrops,
      soldIn,
    };
  }

  public async getEntityDetails(entityId: string): Promise<EntityDetails | null> {
    const entity = await entityRepository.getById(entityId);
    if (!entity) return null;

    // Hierarchy
    const parent = entity.parentId ? await entityRepository.getById(entity.parentId) : undefined;
    const children = await entityRepository.getByParentId(entityId);

    // Potential Spawns
    const referencePoints = await referencePointRepository.getAll();
    const explicitSpawns = referencePoints
      .filter(s => s.locationId === entityId || (s.type === "rule" && s.locationId === entityId))
      .map(async s => ({
        entity: (await entityRepository.getById(s.entityId)) || (await itemRepository.getById(s.entityId)),
        chance: s.chance,
        quantity: s.quantity,
        conditions: s.conditions
      }));

    // Spatial Spawns
    let spatialSpawnsPromises: Promise<any>[] = [];
    if (entity.geom?.type === "Polygon") {
      const polygonCoords = parseWKTPolygon(entity.geom.coordinates);
      if (polygonCoords.length > 0) {
        const pointsInside = referencePoints.filter(s => {
          if (!s.geom || s.geom.type !== "Point") return false;
          const pointCoords = parseWKTPoint(s.geom.coordinates);
          return isPointInPolygon([pointCoords[0], pointCoords[1]], polygonCoords);
        });

        spatialSpawnsPromises = pointsInside.map(async s => ({
          entity: (await entityRepository.getById(s.entityId)) || (await itemRepository.getById(s.entityId)),
          chance: s.chance,
          quantity: s.quantity,
          conditions: s.conditions
        }));
      }
    }

    const potentialSpawnsRaw = await Promise.all([...explicitSpawns, ...spatialSpawnsPromises]);
    const potentialSpawns = potentialSpawnsRaw.filter(s => s.entity) as EntityDetails["potentialSpawns"];
    
    // Remove duplicates
    const uniquePotentialSpawns = potentialSpawns?.filter((v, i, a) => a.findIndex(t => t.entity.id === v.entity.id) === i);

    const drops = await Promise.all((entity.drops || []).map(async (d) => ({
      item: await itemRepository.getById(d.itemId),
      chance: d.chance,
      quant: d.quant,
      maxQuant: d.maxQuant,
    })));

    const allRecipes = await recipeRepository.getAll();
    const normalizedRecipes = await Promise.all(allRecipes.map(r => this.normalizeRecipe(r)));
    const recipes = normalizedRecipes.filter((r) => {
      return r.normalizedProducts.some((p) => {
        if (p.id === entityId) return true;
        if (p.type === "category") {
          const categories = Array.isArray(entity.category) ? entity.category : [entity.category];
          return categories.includes(p.id);
        }
        return false;
      });
    });

    const entityReferencePoints = await referencePointRepository.getByEntityId(entityId);
    const shop = await shopRepository.getByNpcId(entityId);

    return {
      entity,
      parent,
      children,
      potentialSpawns: uniquePotentialSpawns,
      drops: drops as any,
      recipes,
      referencePoints: entityReferencePoints,
      shop,
    };
  }

  public async getShopDetails(shopId: string): Promise<ShopDetails | null> {
    const shop = await shopRepository.getById(shopId);
    if (!shop) return null;

    const npc = shop.npcId ? await entityRepository.getById(shop.npcId) : undefined;

    return {
      shop,
      npc,
    };
  }

  public async getRecipeDetails(recipeId: string): Promise<RecipeDetails | null> {
    const rawRecipe = await recipeRepository.getById(recipeId);
    if (!rawRecipe) return null;

    const recipe = await this.normalizeRecipe(rawRecipe);

    // Setup options for cost calculation (might be expensive if not cached)
    const shops = await shopRepository.getAll();
    const itemToShopIdMap = new Map<string, string>();
    shops.forEach((shop) => {
      shop.groups.forEach((group) => {
        group.items.forEach((shopItem) => {
          itemToShopIdMap.set(shopItem.id, shop.id);
        });
      });
    });

    const allRecipes = await recipeRepository.getAll();
    const recipeMapByProduct = new Map<string, Recipe>();
    allRecipes.forEach((r) => {
      if (r.itemId) recipeMapByProduct.set(r.itemId, r);
      r.products?.forEach((p) => recipeMapByProduct.set(p.id, r));
    });

    const allItems = await itemRepository.getAll();
    const itemMap = new Map<string, Item>();
    allItems.forEach((i) => itemMap.set(i.id, i));
    
    const allEntities = await entityRepository.getAll();
    const entityMap = new Map<string, Entity>();
    allEntities.forEach((e) => entityMap.set(e.id, e));

    const options: TreeOptions = {
      itemMap,
      entityMap,
      recipeMapByProduct,
      shopMap: itemToShopIdMap,
    };

    const ingredients = await Promise.all(recipe.normalizedIngredients.map(async (ing) => {
      const isCategory = ing.type === "category";
      let dataOptions: (Item | Entity)[] | undefined = undefined;
      let bestOptionId: string | undefined = undefined;

      if (isCategory) {
        const itemOptions = allItems
          .filter((item) => {
            if (Array.isArray(item.category)) {
              return item.category.includes(ing.id);
            }
            return item.category === ing.id;
          })
          .map((i) => ({ ...i, type: "item" as const }));

        const entityOptions = allEntities
          .filter((e) => {
            if (Array.isArray(e.category)) {
              return e.category.includes(ing.id);
            }
            return e.category === ing.id;
          })
          .map((e) => ({ ...e, type: "entity" as const }));

        dataOptions = [...itemOptions, ...entityOptions];

        if (dataOptions.length > 0) {
          let minCost = Infinity;
          dataOptions.forEach((opt) => {
            const totals = getCraftingTotals(opt.id, 1, "item", options);
            if (totals.totalCost < minCost) {
              minCost = totals.totalCost;
              bestOptionId = opt.id;
            }
          });
        }
      }

      return {
        ...ing,
        data: isCategory
          ? undefined
          : ing.type === "entity"
          ? await entityRepository.getById(ing.id)
          : await itemRepository.getById(ing.id),
        dataOptions,
        bestOptionId,
      };
    }));

    const products = await Promise.all(recipe.normalizedProducts.map(async (p) => {
      const isCategory = p.type === "category";
      let dataOptions: (Item | Entity)[] | undefined = undefined;

      if (isCategory) {
        const itemOptions = allItems
          .filter((item) => {
            if (Array.isArray(item.category)) {
              return item.category.includes(p.id);
            }
            return item.category === p.id;
          })
          .map((i) => ({ ...i, type: "item" as const }));

        const entityOptions = allEntities
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
          ? await entityRepository.getById(p.id)
          : await itemRepository.getById(p.id),
        dataOptions,
      };
    }));

    return {
      recipe,
      ingredients: ingredients as any,
      products: products as any,
    };
  }

  public async getEventDetails(eventId: string): Promise<EventDetails | null> {
    const event = await eventRepository.getById(eventId);
    if (!event) return null;

    const items = await itemRepository.search({ filters: { event: eventId } }) as Item[];
    
    // For recipes, they have complex logic, but we can search by event index
    const recipesRaw = await recipeRepository.search({ filters: { event: eventId } }) as Recipe[];
    const recipes = await Promise.all(recipesRaw.map(r => this.normalizeRecipe(r)));

    const entities = await entityRepository.search({ filters: { event: eventId } }) as Entity[];
    const conjuntos = await conjuntoRepository.search({ filters: { event: eventId } }) as Conjunto[];

    return {
      event,
      items,
      recipes,
      entities,
      conjuntos,
    };
  }

  public async normalizeRecipe(recipe: Recipe): Promise<NormalizedRecipe> {
    const stations = recipe.stations || recipe.ProducedIn || [];

    // Normalize ingredients
    let ingredients: { id: string; name?: string; amount: number }[] = [];
    if (recipe.ingredients) {
      ingredients = recipe.ingredients.map((i) => ({ ...i }));
    } else if (recipe.Ingredients) {
      ingredients = await Promise.all(recipe.Ingredients.map(async (i: any) => {
        const id = i.ClassName || i.id;
        return {
          id,
          name: i.Name || i.name,
          amount: i.Amount || i.amount || 1,
          event: i.event,
          type: i.type || ((await entityRepository.getById(id)) ? "entity" : "item")
        };
      }));
    }

    // Normalize products
    let products: { id: string; name?: string; amount: number }[] = [];
    if (recipe.itemId) {
      products.push({ id: recipe.itemId, amount: recipe.amount || 1 });
    } else if (recipe.products) {
      products = recipe.products.map((p) => ({ ...p }));
    } else if (recipe.Products) {
      products = await Promise.all(recipe.Products.map(async (p: any) => {
        const id = p.ClassName || p.id;
        return {
          id,
          name: p.Name || p.name,
          amount: p.Amount || p.amount || 1,
          event: p.event,
          type: p.type || ((await entityRepository.getById(id)) ? "entity" : "item")
        };
      }));
    }

    const firstProduct = products[0];
    const itemData = firstProduct ? await itemRepository.getById(firstProduct.id) : null;
    const entityData = firstProduct && !itemData ? await entityRepository.getById(firstProduct.id) : null;

    const normalizedName =
      recipe.name || 
      itemData?.name || 
      entityData?.name ||
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

export const apiService = new ApiService();
