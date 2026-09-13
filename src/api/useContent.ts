import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { contentApi, gameApi, type ContentResource, type ListQuery } from "./content";

/** Dados que mudam pouco (raridades, definições de atributo) não são relidos a cada tela. */
const RARELY_CHANGES = 5 * 60_000;

/** Página de conteúdo. Ao trocar filtro ou página, mantém a anterior na tela até chegar a nova. */
export function useContentList<T>(gameId: string | undefined, resource: ContentResource, query: ListQuery) {
  return useQuery({
    queryKey: ["content", gameId, resource, "list", query],
    queryFn: ({ signal }) => contentApi.list<T>(gameId!, resource, query, signal),
    enabled: Boolean(gameId),
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
