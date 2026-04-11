import { useState, useEffect, useMemo, useCallback } from "react";
import { apiService } from "../services/apiService";
import { dbService } from "../services/dbService";
import { codeRepository } from "../repositories/CodeRepository";
import type { NormalizedRecipe, SearchOptions, PaginatedResponse } from "../types/apiModels";
import type { Item, Entity } from "../types/gameModels";

import { useEventFilter } from "../context/EventFilterContext";

export function useApi(gameId: string | undefined) {
  const { activeEventIds } = useEventFilter();
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

    // Reconstruct database on game change
    dbService.reconstructDatabase(gameId)
      .then(() => {
        if (isMounted) {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(`[useApi] Error during DB reconstruction:`, err);
          setError(err.message || "Failed to load game data");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  const getItemDetails = useCallback(async (itemId: string) => {
    return apiService.getItemDetails(itemId);
  }, []);

  const getEntityDetails = useCallback(async (entityId: string) => {
    return apiService.getEntityDetails(entityId);
  }, []);

  const getItemsList = useCallback(async (options?: SearchOptions | ((item: Item) => boolean)): Promise<Item[] | PaginatedResponse<Item>> => {
    if (typeof options === "function") {
      return apiService.getItems(options);
    }
    return apiService.getItems({ ...options, activeEventIds });
  }, [activeEventIds]);

  const getEntityList = useCallback(async (options?: SearchOptions | ((entity: Entity) => boolean)): Promise<Entity[] | PaginatedResponse<Entity>> => {
    if (typeof options === "function") {
      return apiService.getEntities(options);
    }
    return apiService.getEntities({ ...options, activeEventIds });
  }, [activeEventIds]);

  const getShopDetails = useCallback(async (shopId: string) => {
    return apiService.getShopDetails(shopId);
  }, []);

  const getRecipeDetails = useCallback(async (recipeId: string) => {
    return apiService.getRecipeDetails(recipeId);
  }, []);

  const getRecipesList = useCallback(async (options?: SearchOptions | ((recipe: NormalizedRecipe) => boolean)): Promise<NormalizedRecipe[] | PaginatedResponse<NormalizedRecipe>> => {
    if (typeof options === "function") {
      return apiService.getRecipes(options);
    }
    return apiService.getRecipes({ ...options, activeEventIds });
  }, [activeEventIds]);

  const getCodesList = useCallback(async () => {
    return codeRepository.getAll();
  }, []);

  const getEventDetails = useCallback(async (eventId: string) => {
    return apiService.getEventDetails(eventId);
  }, []);

  const getConjuntosList = useCallback(async (options?: SearchOptions) => {
    return apiService.getConjuntos({ ...options, activeEventIds });
  }, [activeEventIds]);

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
  };
}
