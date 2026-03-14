import { useState, useEffect, useMemo } from "react";
import { loadGameData, loadGamesList } from "../services/dataLoader";
import { ApiService } from "../services/apiService";
import type { GameDataPayload, NormalizedRecipe } from "../types/apiModels";
import type { Item, Entity, GameInfo } from "../types/gameModels";

export function useApi(gameId: string | undefined) {
  const [data, setData] = useState<GameDataPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const datasets = ["items", "recipes", "entity", "shops", "events", "spawns", "codes"];

    Promise.all([
      ...(datasets.map((ds) => loadGameData<any>(gameId, ds)) as Promise<any>[]),
      loadGamesList()
    ])
      .then((results) => {
        const [items, recipes, entities, shops, events, spawns, codes, games] = results as any[];
        if (isMounted) {
          const gameInfo = games.find((g: any) => g.id === gameId);
          setData({ items, recipes, entities, shops, events, spawns, codes, gameInfo });
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load game data");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  const apiService = useMemo(() => {
    if (!data) return null;
    return new ApiService(data);
  }, [data]);

  const getItemDetails = (itemId: string) => {
    return apiService ? apiService.getItemDetails(itemId) : null;
  };

  const getEntityDetails = (entityId: string) => {
    return apiService ? apiService.getEntityDetails(entityId) : null;
  };

  const getItemsList = (filter?: (item: Item) => boolean) => {
    return apiService ? apiService.getItems(filter) : [];
  };

  const getEntityList = (filter?: (entity: Entity) => boolean) => {
    return apiService ? apiService.getEntities(filter) : [];
  };

  const getShopDetails = (shopId: string) => {
    return apiService ? apiService.getShopDetails(shopId) : null;
  };

  const getRecipeDetails = (recipeId: string) => {
    return apiService ? apiService.getRecipeDetails(recipeId) : null;
  };

  const getRecipesList = (filter?: (recipe: NormalizedRecipe) => boolean) => {
    if (!apiService) return [];
    const normalized = data?.recipes.map(r => apiService.normalizeRecipe(r)) || [];
    return filter ? normalized.filter(filter) : normalized;
  };

  const getCodesList = () => {
    return data?.codes || [];
  };

  return {
    loading,
    error,
    getItemDetails,
    getEntityDetails,
    getShopDetails,
    getRecipeDetails,
    getItemsList,
    getEntityList,
    getRecipesList,
    getCodesList,
    // Original data for fallback if needed
    raw: data,
  };
}
