import type {
  Item,
  Recipe,
  Entity,
} from "../types/gameModels";
import type {
  NormalizedRecipe,
  ItemDetails,
  EntityDetails,
  RecipeDetails,
  ShopDetails,
  GameDataPayload,
} from "../types/apiModels";

export class ApiService {
  private data: GameDataPayload;

  constructor(data: GameDataPayload) {
    this.data = data;
  }

  public getItems(filter?: (item: Item) => boolean): Item[] {
    return filter ? this.data.items.filter(filter) : this.data.items;
  }

  public getEntities(filter?: (entity: Entity) => boolean): Entity[] {
    return filter ? this.data.entities.filter(filter) : this.data.entities;
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

    const drops = (entity.drops || []).map((d) => ({
      item: this.data.items.find((i) => i.id === d.itemId),
      chance: d.chance,
      quant: d.quant,
      maxQuant: d.maxQuant,
    }));

    const recipes = this.data.recipes
      .map((r) => this.normalizeRecipe(r))
      .filter((r) => r.normalizedProducts.some((p) => p.id === entityId && p.type === "entity"));

    const spawns = this.data.spawns.filter((s) => s.entityId === entityId);

    return {
      entity,
      drops,
      recipes,
      spawns,
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

    const ingredients = recipe.normalizedIngredients.map((ing) => ({
      ...ing,
      data: ing.type === "entity" 
        ? this.data.entities.find((e) => e.id === ing.id)
        : this.data.items.find((i) => i.id === ing.id),
    }));

    const products = recipe.normalizedProducts.map((p) => ({
      ...p,
      data: p.type === "entity"
        ? this.data.entities.find((e) => e.id === p.id)
        : this.data.items.find((i) => i.id === p.id),
    }));

    return {
      recipe,
      ingredients,
      products,
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
