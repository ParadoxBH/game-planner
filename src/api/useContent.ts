import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { contentApi, gameApi, type ContentResource, type ListQuery } from "./content";

/** Dados que mudam pouco (raridades, definições de atributo, bancadas) não são relidos a cada tela. */
const RARELY_CHANGES = 5 * 60_000;

/** Página de conteúdo. Ao trocar filtro ou página, mantém a anterior na tela até chegar a nova. */
export function useContentList<T>(
  gameId: string | undefined,
  resource: ContentResource,
  query: ListQuery,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["content", gameId, resource, "list", query],
    queryFn: ({ signal }) => contentApi.list<T>(gameId!, resource, query, signal),
    enabled: Boolean(gameId) && (options.enabled ?? true),
    placeholderData: keepPreviousData,
  });
}

export function useContentDetails<D, R>(gameId: string | undefined, resource: ContentResource, extId: string | undefined) {
  return useQuery({
    queryKey: ["content", gameId, resource, "details", extId],
    queryFn: ({ signal }) => contentApi.details<D, R>(gameId!, resource, extId!, signal),
    enabled: Boolean(gameId && extId),
  });
}

/** Árvore de crafting. Ao mudar quantidade ou escolha, mantém a árvore anterior até chegar a nova. */
export function useCraftingTree(gameId: string | undefined, target: string | undefined, amount: number, choices: string[]) {
  return useQuery({
    queryKey: ["crafting-tree", gameId, target, amount, choices],
    queryFn: ({ signal }) => contentApi.craftingTree(gameId!, target!, amount, choices, signal),
    enabled: Boolean(gameId && target),
    placeholderData: keepPreviousData,
  });
}

export function useGame(gameId: string | undefined) {
  return useQuery({
    queryKey: ["game", gameId],
    queryFn: ({ signal }) => gameApi.get(gameId!, signal),
    enabled: Boolean(gameId),
  });
}

export function useRarities(gameId: string | undefined) {
  return useQuery({
    queryKey: ["game", gameId, "rarities"],
    queryFn: ({ signal }) => gameApi.rarities(gameId!, signal),
    enabled: Boolean(gameId),
    staleTime: RARELY_CHANGES,
  });
}

export function useAttributeDefinitions(gameId: string | undefined) {
  return useQuery({
    queryKey: ["game", gameId, "attributes"],
    queryFn: ({ signal }) => gameApi.attributes(gameId!, signal),
    enabled: Boolean(gameId),
    staleTime: RARELY_CHANGES,
  });
}

export function useRecipeStations(gameId: string | undefined) {
  return useQuery({
    queryKey: ["game", gameId, "recipe-stations"],
    queryFn: ({ signal }) => gameApi.recipeStations(gameId!, signal),
    enabled: Boolean(gameId),
    staleTime: RARELY_CHANGES,
  });
}
