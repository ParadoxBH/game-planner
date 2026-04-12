import { useState, useEffect, useCallback } from "react";
import { apiService } from "../services/apiService";
import { dbService } from "../services/dbService";
import { codeRepository } from "../repositories/CodeRepository";
import type { NormalizedRecipe, PaginatedResponse } from "../types/apiModels";
import type { Item, Entity } from "../types/gameModels";
import type { GenericFilter, ItemCriteria } from "../types/filterTypes";

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

  const getItemsList = useCallback(async (filter: GenericFilter<ItemCriteria>): Promise<PaginatedResponse<Item>> => {
    return apiService.getItems(filter, activeEventIds);
  }, [activeEventIds]);

  const getEntityList = useCallback(async (filter: GenericFilter<any>): Promise<PaginatedResponse<Entity>> => {
    return apiService.getEntities(filter, activeEventIds);
  }, [activeEventIds]);

  const getItemCategories = useCallback(async () => {
    return apiService.getItemCategories();
  }, []);

  const getEntityCategories = useCallback(async () => {
    return apiService.getEntityCategories();
  }, []);

  const getShopDetails = useCallback(async (shopId: string) => {
    return apiService.getShopDetails(shopId);
  }, []);

  const getRecipeDetails = useCallback(async (recipeId: string) => {
    return apiService.getRecipeDetails(recipeId);
  }, []);

  const getRecipesList = useCallback(async (filter: GenericFilter<any>): Promise<PaginatedResponse<NormalizedRecipe>> => {
    return apiService.getRecipes(filter, activeEventIds);
  }, [activeEventIds]);

  const getCodesList = useCallback(async () => {
    return codeRepository.getAll();
  }, []);

  const getEventDetails = useCallback(async (eventId: string) => {
    return apiService.getEventDetails(eventId);
  }, []);

  const getConjuntosList = useCallback(async (filter: GenericFilter<any>) => {
    return apiService.getConjuntos(filter, activeEventIds);
  }, [activeEventIds]);

  return {
    loading,
    error,
    getItemDetails,
    getItemCategories,
    getEntityDetails,
    getEntityCategories,
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
