import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { contentApi, gameApi, type ContentResource, type ListQuery, type ProfitQuery } from "./content";

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

/** Um documento pelo código. Sem código, não consulta. */
export function useContentDocument<T>(gameId: string | undefined, resource: ContentResource, extId: string | null | undefined) {
  return useQuery({
    queryKey: ["content", gameId, resource, "get", extId],
    queryFn: ({ signal }) => contentApi.get<T>(gameId!, resource, extId!, signal),
    enabled: Boolean(gameId && extId),
  });
}

/** Marcadores de um mapa. Ao mudar filtro no mesmo mapa, mantém os anteriores até chegar a resposta. */
export function useMapMarkers(gameId: string | undefined, mapId: string | undefined, filters: Record<string, string | undefined>) {
  return useQuery({
    queryKey: ["map-markers", gameId, mapId, filters],
    queryFn: ({ signal }) => contentApi.markers(gameId!, mapId!, filters, signal),
    enabled: Boolean(gameId && mapId),
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2] === mapId ? previous : undefined),
  });
}

/** Busca por nome ou código, a partir de 2 letras. */
export function useSearch(gameId: string | undefined, term: string, kind?: string) {
  return useQuery({
    queryKey: ["search", gameId, term, kind],
    queryFn: ({ signal }) => gameApi.search(gameId!, term.trim(), kind, signal),
    enabled: Boolean(gameId) && term.trim().length >= 2,
  });
}

/** Plano com vários alvos. Sem alvos, não consulta. */
export function useCraftingPlan(gameId: string | undefined, targets: { target: string; amount: number }[], choices: string[]) {
  return useQuery({
    queryKey: ["crafting-plan", gameId, targets, choices],
    queryFn: ({ signal }) => contentApi.craftingPlan(gameId!, targets, choices, signal),
    enabled: Boolean(gameId) && targets.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useCraftingProfits(gameId: string | undefined, query: ProfitQuery) {
  return useQuery({
    queryKey: ["crafting-profits", gameId, query],
    queryFn: ({ signal }) => contentApi.craftingProfits(gameId!, query, signal),
    enabled: Boolean(gameId),
    placeholderData: keepPreviousData,
  });
}

export function useGames(enabled = true) {
  return useQuery({
    queryKey: ["games"],
    queryFn: ({ signal }) => gameApi.list(signal),
    enabled,
  });
}

/** Contagem de conteúdo por tipo, usada para montar o menu do jogo. */
export function useContentCounts(gameId: string | undefined) {
  return useQuery({
    queryKey: ["game", gameId, "content-counts"],
    queryFn: ({ signal }) => gameApi.contentCounts(gameId!, signal),
    enabled: Boolean(gameId),
    staleTime: RARELY_CHANGES,
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
