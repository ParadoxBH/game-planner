import { useState, useEffect, useMemo, useCallback } from "react";
import { loadGameData, loadGamesList, loadGameMaps } from "../services/dataLoader";
import { ApiService } from "../services/apiService";
import type { GameDataPayload, NormalizedRecipe, SearchOptions, PaginatedResponse } from "../types/apiModels";
import type { Item, Entity } from "../types/gameModels";

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

    const datasets = ["items", "recipes", "entity", "shops", "events", "referencePoints", "codes", "conjuntos"];

    Promise.all([
      ...(datasets.map((ds) => 
        loadGameData<any>(gameId, ds).catch((err) => {
          console.warn(`Dataset ${ds} not found for ${gameId}, using empty list.`, err);
          return [];
        })
      ) as Promise<any>[]),
      loadGamesList(),
      loadGameMaps(gameId)
    ])
      .then((results) => {
        const [items, recipes, entities, shops, events, referencePoints, codes, conjuntos, games, maps = []] = results as any[];
        if (isMounted) {
          const gameInfo = games.find((g: any) => g.id === gameId);
          setData({ 
            items, 
            recipes, 
            entities, 
            shops, 
            events, 
            referencePoints, 
            codes, 
            conjuntos,
            gameInfo,
            maps 
          });
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

  const getItemDetails = useCallback((itemId: string) => {
    return apiService ? apiService.getItemDetails(itemId) : null;
  }, [apiService]);

  const getEntityDetails = useCallback((entityId: string) => {
    return apiService ? apiService.getEntityDetails(entityId) : null;
  }, [apiService]);

  const getItemsList = useCallback((options?: SearchOptions | ((item: Item) => boolean)): Item[] | PaginatedResponse<Item> => {
    return apiService ? apiService.getItems(options) : [];
  }, [apiService]);

  const getEntityList = useCallback((options?: SearchOptions | ((entity: Entity) => boolean)): Entity[] | PaginatedResponse<Entity> => {
    return apiService ? apiService.getEntities(options) : [];
  }, [apiService]);

  const getShopDetails = useCallback((shopId: string) => {
    return apiService ? apiService.getShopDetails(shopId) : null;
  }, [apiService]);

  const getRecipeDetails = useCallback((recipeId: string) => {
    return apiService ? apiService.getRecipeDetails(recipeId) : null;
  }, [apiService]);

  const getRecipesList = useCallback((options?: SearchOptions | ((recipe: NormalizedRecipe) => boolean)): NormalizedRecipe[] | PaginatedResponse<NormalizedRecipe> => {
    return apiService ? apiService.getRecipes(options) : [];
  }, [apiService]);

  const getCodesList = useCallback(() => {
    return data?.codes || [];
  }, [data]);

  const getEventDetails = useCallback((eventId: string) => {
    return apiService ? apiService.getEventDetails(eventId) : null;
  }, [apiService]);

  const getConjuntosList = useCallback((options?: SearchOptions) => {
    return apiService ? apiService.getConjuntos(options) : [];
  }, [apiService]);

  return {
    loading,
    error,
    getItemDetails,
    getEntityDetails,
    getShopDetails,
    getRecipeDetails,
    getEventDetails,
    getItemsList,
    getEntityList,
    getRecipesList,
    getCodesList,
    getConjuntosList,
    // Original data for fallback if needed
    raw: data,
  };
}
