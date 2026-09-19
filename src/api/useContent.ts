import {
  keepPreviousData,
  queryOptions,
  useQueries,
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { contentApi, gameApi, type ContentResource, type GamePatch, type ListQuery, type MediaUsage, type ProfitQuery, type Rarity } from "./content";
import { useEventFilter } from "../context/EventFilterContext";
import { and, inActiveEvents, listingWhere, rule, type FilterValues, type QueryGroup } from "./query";

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

function listingFiltersQuery(gameId: string, resource: ContentResource) {
  return queryOptions({
    queryKey: ["content", gameId, resource, "query-filters"],
    queryFn: ({ signal }) => contentApi.listingFilters(gameId, resource, signal),
  });
}

/** Busca e filtros de tela de uma listagem, com as opções do jogo, para desenhar o QueryBuilder. */
export function useListingFilters(gameId: string | undefined, resource: ContentResource) {
  return useQuery({ ...listingFiltersQuery(gameId ?? "", resource), enabled: Boolean(gameId) });
}

/** Listagem pela barra de filtros do backend: busca e valores escolhidos viram QueryJson pelo schema da listagem. */
export interface ListingQuery extends Omit<ListQuery, "where"> {
  /** Texto da caixa de busca. */
  search?: string;
  /** Valores da barra, pela `key` de cada filtro. */
  values?: FilterValues;
  /** Filtro de fora da barra, somado com "and": eventos ativos, códigos já coletados... */
  where?: QueryGroup;
}

/**
 * Página de uma listagem com barra de filtros. Lê antes o schema da barra (o mesmo cache de useListingFilters),
 * então um filtro que veio pela URL já vale na primeira busca, e erro no schema aparece como erro da listagem.
 * Quando a listagem tem eventos, o filtro global de eventos ativos (cabeçalho) entra aqui, como um grupo na
 * raiz: as telas não o repassam.
 */
export function useListing<T>(
  gameId: string | undefined,
  resource: ContentResource,
  query: ListingQuery,
  options: { enabled?: boolean } = {},
) {
  const client = useQueryClient();
  const { activeEventIds } = useEventFilter();
  return useQuery({
    queryKey: ["content", gameId, resource, "listing", query, activeEventIds],
    queryFn: async ({ signal }) => {
      const schema = await client.ensureQueryData(listingFiltersQuery(gameId!, resource));
      const { search, values, where, ...page } = query;
      const filter = and(
        schema.activeEvents && inActiveEvents(activeEventIds),
        listingWhere(schema, search, values ?? {}),
        where,
      );
      return contentApi.list<T>(gameId!, resource, { ...page, where: filter }, signal);
    },
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

/** Fora do hook: o combine precisa ser a mesma função para o useQueries devolver o mesmo Map enquanto nada muda. */
function documentsById<T extends { extId: string }>(results: UseQueryResult<T>[]): Map<string, T> {
  const byId = new Map<string, T>();
  results.forEach((result) => {
    if (result.data) byId.set(result.data.extId, result.data);
  });
  return byId;
}

/**
 * Vários documentos pelo código, um pedido por código e com o mesmo cache de useContentDocument. Devolve só os
 * que já chegaram. Para poucos códigos: a listagem é paginada e não filtra por lista de ids.
 */
export function useContentDocuments<T extends { extId: string }>(
  gameId: string | undefined,
  resource: ContentResource,
  extIds: string[],
): Map<string, T> {
  return useQueries({
    queries: extIds.map((extId) => ({
      queryKey: ["content", gameId, resource, "get", extId],
      queryFn: ({ signal }: { signal: AbortSignal }) => contentApi.get<T>(gameId!, resource, extId, signal),
      enabled: Boolean(gameId),
    })),
    combine: documentsById<T>,
  });
}

/** Campos do filtro de uma listagem. Não mudam enquanto o backend não muda. */
export function useQueryFields(gameId: string | undefined, resource: ContentResource) {
  return useQuery({
    queryKey: ["content", gameId, resource, "query-fields"],
    queryFn: ({ signal }) => contentApi.queryFields(gameId!, resource, signal),
    enabled: Boolean(gameId),
    staleTime: RARELY_CHANGES,
  });
}

/**
 * Marcadores de um mapa, com o filtro global de eventos ativos na raiz (ponto de spawn sempre tem eventos). Ao mudar
 * filtro no mesmo mapa, mantém os anteriores até chegar a resposta.
 */
export function useMapMarkers(gameId: string | undefined, mapId: string | undefined, where: QueryGroup) {
  const { activeEventIds } = useEventFilter();
  return useQuery({
    queryKey: ["map-markers", gameId, mapId, where, activeEventIds],
    queryFn: ({ signal }) => contentApi.markers(gameId!, mapId!, and(inActiveEvents(activeEventIds), where), signal),
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

/**
 * Escrita de conteúdo: criar, substituir, apagar e anexar imagem. Depois de cada uma, relê tudo o que
 * é do jogo (toda chave com o jogo na segunda posição) — uma categoria muda filtros, menus e contagens;
 * um item muda árvores de crafting, buscas e marcadores.
 */
export function useContentWrites(gameId: string, resource: ContentResource) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ predicate: (query) => query.queryKey[1] === gameId });
  return {
    create: useMutation({
      mutationFn: (document: object) => contentApi.create(gameId, resource, document),
      onSuccess: refresh,
    }),
    put: useMutation({
      mutationFn: ({ extId, document }: { extId: string; document: object }) =>
        contentApi.put(gameId, resource, extId, document),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (extId: string) => contentApi.remove(gameId, resource, extId),
      onSuccess: refresh,
    }),
    addMedia: useMutation({
      mutationFn: ({ extId, usage, mediaId }: { extId: string; usage: MediaUsage; mediaId: string }) =>
        contentApi.addMedia(gameId, resource, extId, { usage, mediaId }),
      onSuccess: refresh,
    }),
  };
}

/**
 * Escrita de raridades: salvar (cria ou substitui) e apagar. Depois, relê tudo o que é do jogo — a raridade
 * dá nome e cor a itens e entidades em todas as telas.
 */
export function useRarityWrites(gameId: string) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ predicate: (query) => query.queryKey[1] === gameId });
  return {
    put: useMutation({
      mutationFn: (rarity: Rarity) => gameApi.putRarity(gameId, rarity),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (code: string) => gameApi.deleteRarity(gameId, code),
      onSuccess: refresh,
    }),
  };
}

/** Quantos registros da listagem têm `field` igual a `code`: a página de tamanho 1, só pelo total. */
export function useCountWhere(gameId: string, resource: ContentResource, field: string, code: string | undefined) {
  const where = code ? and(rule(field, "equal", code)) : undefined;
  return useContentList(gameId, resource, { where, size: 1 }, { enabled: Boolean(code) });
}

/** Quantos itens e quantas entidades usam a raridade. */
export function useRarityUsage(gameId: string, code: string | undefined) {
  const items = useCountWhere(gameId, "items", "rarity", code);
  const entities = useCountWhere(gameId, "entities", "rarity", code);
  return {
    items: items.data?.total,
    entities: entities.data?.total,
    isPending: items.isPending || entities.isPending,
  };
}

/** Salva dados do jogo. Relê o jogo, a lista de jogos (nome e capa na tela inicial) e o que é dele. */
export function useUpdateGame(gameId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: GamePatch) => gameApi.patch(gameId, changes),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ["games"] }),
        client.invalidateQueries({ predicate: (query) => query.queryKey[1] === gameId }),
      ]),
  });
}
