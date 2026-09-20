import { apiRequest } from "./http";
import { and, type ListingSchema, type QueryGroup, type QuerySchema } from "./query";

/** Página máxima aceita pela API. */
export const MAX_PAGE_SIZE = 200;

/** Referência textual a outro conteúdo. `kind` ausente quando a origem não diz o tipo. */
export interface Reference {
  kind?: string | null;
  extId: string;
}

/** Referência como texto, para parâmetro ou valor de filtro: "tipo:id", ou só "id" quando o tipo não é conhecido. */
export function referenceParam(target: Reference): string {
  return target.kind ? `${target.kind}:${target.extId}` : target.extId;
}

/** `map`: fundo de mapa, enviado com a variante `large`. */
export type MediaUsage = "icon" | "capsule" | "thumbnail" | "banner" | "screenshot" | "map";

export interface MediaLink {
  usage: MediaUsage;
  mediaId: string;
  addedBy?: string;
  addedAt?: string;
}

export interface ContentMeta {
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

/** Referência citada, com nome e ícone. `resolvedKind` nulo quando o alvo não está cadastrado. */
export interface ResolvedReference {
  kind: string | null;
  extId: string;
  resolvedKind: string | null;
  name: string | null;
  iconMediaId: string | null;
}

export interface ContentPage<T> {
  content: T[];
  /** Começa em 0. */
  page: number;
  size: number;
  total: number;
  totalPages: number;
  /** Só quando a listagem pede references. */
  references?: ResolvedReference[];
}

interface ContentBase {
  extId: string;
  name: string | null;
  summary: string | null;
  description: string | null;
  media: MediaLink[];
  meta: ContentMeta;
}

export type AttributeValue = number | string | boolean;

export interface ItemDocument extends ContentBase {
  name: string;
  rarityCode: string | null;
  level: number | null;
  baseBuyPrice: number | null;
  baseSellPrice: number | null;
  currency: Reference | null;
  variantOf: string | null;
  categories: string[];
  events: string[];
  attributes: Record<string, AttributeValue>;
}

/** Como comparar o nível do alvo com o exigido: igual, no mínimo ou no máximo. */
export type LevelOperator = "exact" | "min" | "max";

/** Ingrediente de receita ou requisito de entidade. */
export interface Requirement {
  target: Reference;
  amount: number;
  notConsumed: boolean;
  /** Nível exigido do alvo; null, qualquer nível serve. */
  level: number | null;
  levelOperator: LevelOperator | null;
}

export interface Drop {
  target: Reference;
  chance: number | null;
  amount: number;
  maxAmount: number | null;
}

export interface Occupant {
  target: Reference;
  chance: number | null;
  amount: number | null;
  maxAmount: number | null;
  /** Nível em que o alvo está ali, ex.: a forja nível 4; null, sem nível. */
  level: number | null;
}

export interface EntityDocument extends ContentBase {
  name: string;
  rarityCode: string | null;
  level: number | null;
  respawnDelayMinutes: number | null;
  baseBuyPrice: number | null;
  baseSellPrice: number | null;
  variantOf: string | null;
  categories: string[];
  events: string[];
  attributes: Record<string, AttributeValue>;
  requirements: Requirement[];
  drops: Drop[];
}

export interface RecipeOutput {
  target: Reference;
  amount: number;
  chance: number | null;
  level: number | null;
}

export interface RecipeUnlock {
  type: string;
  target: Reference | null;
  value: string | null;
}

/** Bancada exigida pela receita; `level` é o nível mínimo, quando o jogo tem bancada que sobe. */
export interface RecipeStation {
  extId: string;
  level: number | null;
}

export interface RecipeDocument extends ContentBase {
  craftTimeSeconds: number | null;
  stations: RecipeStation[];
  inputs: Requirement[];
  outputs: RecipeOutput[];
  unlock: RecipeUnlock[];
  events: string[];
}

export interface ShopItem {
  target: Reference;
  /** Tamanho do pacote; nulo = avulso. */
  quantity: number | null;
  purchaseLimit: number | null;
  price: number | null;
  currency: Reference | null;
  resetType: string | null;
  rarityCode: string | null;
}

export interface ShopCategoryDocument extends ContentBase {
  name: string;
  shop: string | null;
  resetType: string | null;
  events: string[];
  items: ShopItem[];
}

export interface ShopDocument extends ContentBase {
  name: string;
  npc: string | null;
  resetType: string | null;
  categories: string[];
  events: string[];
}

export interface SpawnPointDocument extends ContentBase {
  map: string | null;
  location: string | null;
  /** WKT em coordenadas de jogo, com ou sem Z. */
  position: string | null;
  respawnMode: string | null;
  respawnDelayMinutes: number | null;
  occupants: Occupant[];
  drops: Drop[];
  events: string[];
}

export interface Reward {
  target: Reference;
  amount: number;
}

export interface RedemptionCodeDocument extends ContentBase {
  addedOn: string | null;
  expiresOn: string | null;
  rewards: Reward[];
}

export interface CollectionGroupDocument extends ContentBase {
  name: string;
  collections: string[];
  members: Reference[];
  events: string[];
}

export interface CategoryDocument extends ContentBase {
  name: string;
  appliesTo: "item" | "entity" | "both";
  /** Categoria principal: abre a listagem de itens e entidades e o menu; as demais são sub-categorias. */
  primary: boolean;
  events: string[];
}

export interface EventDocument extends ContentBase {
  name: string;
  /** Tipo do evento, ex.: season, clima; padrão "event". */
  eventType: string;
  /** Datas ISO (aaaa-mm-dd), inclusivas. */
  periodStart: string | null;
  periodEnd: string | null;
}

export interface CollectionDocument extends ContentBase {
  name: string;
  events: string[];
}

/** Retângulo em coordenadas de jogo. */
export interface MapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Faixa de tiles que cobre o mapa no zoom `z`, e os zooms em que há tile. */
export interface MapTiles {
  z: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  minZoom: number | null;
  maxZoom: number | null;
}

export interface MapDocument extends ContentBase {
  name: string;
  mapType: "single" | "layered" | "tile" | "procedural";
  /** Caminho ou URL da imagem única. */
  imageUrl: string | null;
  /** Caminho ou URL das camadas ({layer}) ou dos tiles ({z}, {x}, {y}). */
  urlPattern: string | null;
  layers: number | null;
  bounds: MapBounds | null;
  minZoom: number | null;
  maxZoom: number | null;
  tiles: MapTiles | null;
  gridSize: number | null;
  /** Quartos de volta do norte do mapa, de 0 a 3. */
  rotate: number | null;
  defaultView: string | null;
  availableViews: string[];
  defaultFilters: { types: string[]; categories: string[]; entities: string[] };
  /** Eventos de clima que acontecem no mapa. */
  weathers: string[];
  events: string[];
}

export interface MarkerOccupant {
  kind: string | null;
  extId: string;
  name: string | null;
  iconMediaId: string | null;
  chance: number | null;
  categories: string[];
  /** Respawn da entidade, em minutos. */
  respawnDelayMinutes: number | null;
  /** Nível em que o ocupante está ali. */
  level: number | null;
}

/** Ponto de spawn compacto para desenhar no mapa. */
export interface MapMarker {
  extId: string;
  name: string | null;
  /** WKT em coordenadas de jogo. */
  position: string;
  location: string | null;
  respawnMode: string | null;
  /** O do ponto ou, sem ele, o do primeiro ocupante que tem. */
  respawnDelayMinutes: number | null;
  iconMediaId: string | null;
  occupants: MarkerOccupant[];
  events: string[];
}

export interface MapMarkers {
  content: MapMarker[];
  total: number;
  /** Ficou ponto de fora por causa do limite. */
  truncated: boolean;
}

export interface SearchHit {
  kind: string;
  extId: string;
  name: string | null;
  iconMediaId: string | null;
}

export interface LocationDocument extends ContentBase {
  locationType: string | null;
  parent: string | null;
  map: string | null;
  /** WKT em coordenadas de jogo. */
  area: string | null;
  events: string[];
}

export interface Details<D, R> {
  kind: string;
  document: D;
  related: R;
  references: ResolvedReference[];
  /** Itens e entidades de cada categoria usada como ingrediente ou produto. */
  categoryMembers: Record<string, ResolvedReference[]>;
}

/** Relações do detalhe de item. Cada uma traz até 200 documentos e o total. */
export interface ItemRelated {
  producedBy: ContentPage<RecipeDocument>;
  usedIn: ContentPage<RecipeDocument>;
  droppedBy: ContentPage<EntityDocument>;
  dropPoints: ContentPage<SpawnPointDocument>;
  spawnPoints: ContentPage<SpawnPointDocument>;
  soldIn: ContentPage<ShopCategoryDocument>;
  requiredBy: ContentPage<EntityDocument>;
  rewardOf: ContentPage<RedemptionCodeDocument>;
  collectionGroups: ContentPage<CollectionGroupDocument>;
  variants: ContentPage<ItemDocument>;
}

/** Relações do detalhe de entidade. */
export interface EntityRelated {
  producedBy: ContentPage<RecipeDocument>;
  usedIn: ContentPage<RecipeDocument>;
  /** Receitas em que a entidade é bancada. */
  craftedHere: ContentPage<RecipeDocument>;
  droppedBy: ContentPage<EntityDocument>;
  spawnPoints: ContentPage<SpawnPointDocument>;
  soldIn: ContentPage<ShopCategoryDocument>;
  requiredBy: ContentPage<EntityDocument>;
  /** Lojas em que a entidade é o NPC. */
  shops: ContentPage<ShopDocument>;
  rewardOf: ContentPage<RedemptionCodeDocument>;
  collectionGroups: ContentPage<CollectionGroupDocument>;
  variants: ContentPage<EntityDocument>;
}

/** Relações do detalhe de receita. */
export interface RecipeRelated {
  soldIn: ContentPage<ShopCategoryDocument>;
  rewardOf: ContentPage<RedemptionCodeDocument>;
}

/** Relações do detalhe de categoria. */
export interface CategoryRelated {
  items: ContentPage<ItemDocument>;
  entities: ContentPage<EntityDocument>;
  shops: ContentPage<ShopDocument>;
  /** Receitas cujo produto é a categoria. */
  producedBy: ContentPage<RecipeDocument>;
  /** Receitas que aceitam qualquer membro da categoria como ingrediente. */
  usedIn: ContentPage<RecipeDocument>;
}

/** Relações do detalhe de evento: tudo que pertence a ele. */
export interface EventRelated {
  items: ContentPage<ItemDocument>;
  entities: ContentPage<EntityDocument>;
  categories: ContentPage<CategoryDocument>;
  recipes: ContentPage<RecipeDocument>;
  shops: ContentPage<ShopDocument>;
  shopCategories: ContentPage<ShopCategoryDocument>;
  maps: ContentPage<MapDocument>;
  /** Mapas em que o evento é um dos climas. */
  mapsWithWeather: ContentPage<MapDocument>;
  locations: ContentPage<LocationDocument>;
  spawnPoints: ContentPage<SpawnPointDocument>;
  collections: ContentPage<CollectionDocument>;
  collectionGroups: ContentPage<CollectionGroupDocument>;
}

/** Relações do detalhe de coleção. */
export interface CollectionRelated {
  /** Grupos da coleção, cada um com os membros. */
  groups: ContentPage<CollectionGroupDocument>;
}

/** Relações do detalhe de loja. */
export interface ShopRelated {
  /** Categorias da loja, cada uma com os itens à venda. */
  categories: ContentPage<ShopCategoryDocument>;
}

export type CraftSource = "recipe" | "shop" | "price" | "base" | "stock" | "category" | "cycle";

/** Nó da árvore de crafting calculada no servidor. Campos ausentes não se aplicam ao nó. */
export interface CraftTreeNode {
  target: Reference;
  name?: string;
  iconMediaId?: string;
  /** O que o pai pede. */
  amount: number;
  /** Quanto disso veio do que sobrou antes na árvore. */
  fromStock?: number;
  /** O que este nó produziu ou comprou além do pedido. */
  leftover?: number;
  notConsumed?: boolean;
  source: CraftSource;
  /** Categoria de onde este alvo foi escolhido. */
  category?: string;
  options?: ResolvedReference[];
  recipe?: {
    extId: string;
    name?: string;
    batches: number;
    produced: number;
    craftTimeSeconds?: number;
    stations: ResolvedReference[];
  };
  /** Receitas que produzem o alvo. */
  alternatives?: string[];
  buyable?: boolean;
  purchase?: {
    shopCategory: string;
    shop?: string;
    packs: number;
    packSize: number;
    price: number;
    currency?: Reference;
    cost: number;
    purchaseLimit?: number;
    resetType?: string;
  };
  price?: { unitPrice: number; currency?: Reference; cost: number };
  children?: CraftTreeNode[];
}

export interface CraftAmount {
  target: Reference;
  name: string | null;
  iconMediaId: string | null;
  amount: number;
}

export interface CurrencyAmount {
  /** Ausente: preço sem moeda informada. */
  currency?: Reference;
  name?: string;
  iconMediaId?: string;
  amount: number;
}

export interface CraftTotals {
  /** Gasto por moeda. */
  costs: CurrencyAmount[];
  baseResources: CraftAmount[];
  tools: CraftAmount[];
  leftovers: CraftAmount[];
  purchases: {
    target: Reference;
    name?: string;
    shopCategory: string;
    shop?: string;
    packs: number;
    cost: number;
    currency?: Reference;
  }[];
  recipes: { extId: string; name: string | null; batches: number }[];
  stations: ResolvedReference[];
  craftTimeSeconds: number;
  openCategories: CraftAmount[];
  cycles: Reference[];
  costWithoutCurrency?: number;
}

export interface CraftingTree {
  root: CraftTreeNode;
  totals: CraftTotals;
}

/** Vários alvos numa árvore só: as sobras de um servem ao próximo. */
export interface CraftingPlan {
  roots: CraftTreeNode[];
  totals: CraftTotals;
  /** Venda dos alvos pelo preço base, por moeda. */
  revenue: CurrencyAmount[];
}

/** Rentabilidade de um lote (ou pacote, sem receita) de um produto. Campos ausentes não se aplicam. */
export interface CraftProfit {
  target: Reference;
  name?: string;
  iconMediaId?: string;
  recipe?: string;
  /** Quanto o lote produz. */
  produced: number;
  /** Tempo de um lote da receita do alvo. */
  craftTimeSeconds?: number;
  /** Moeda em que custo, venda e lucro se comparam; ausente quando não há moeda informada. */
  currency?: ResolvedReference;
  /** Ausente quando o custo tem mais de uma moeda. */
  unitCost?: number;
  sellPrice?: number;
  profit?: number;
  profitPerHour?: number;
  steps: number;
  costs: CurrencyAmount[];
  stations: ResolvedReference[];
  baseResources: CraftAmount[];
  purchases: CraftTotals["purchases"];
  /** Categoria em aberto, ciclo ou árvore grande demais: o custo é parcial. */
  incomplete?: boolean;
}

export interface ProfitQuery {
  search?: string;
  /** Só o que tem tempo de receita. */
  timed?: boolean;
  /** name, profit, unitCost, sellPrice, craftTimeSeconds, profitPerHour ou steps; "-" na frente para decrescente. */
  sort?: string;
  page?: number;
  size?: number;
}

export interface GameInfo {
  id: string;
  name: string;
  summary: string | null;
  description: string | null;
  status: string;
  readPolicy: string;
  writePolicy: string;
  dailyResetTime: string | null;
  weeklyResetDay: number | null;
  media: MediaLink[];
}

export type GameStatus = "draft" | "published" | "coming_soon";

export interface GamePatch {
  name?: string;
  summary?: string;
  description?: string;
  status?: GameStatus;
  readPolicy?: "public" | "members";
  writePolicy?: "community" | "members";
  /** "HH:mm". */
  dailyResetTime?: string;
  /** 0 = domingo ... 6 = sábado. */
  weeklyResetDay?: number;
  media?: { usage: MediaUsage; mediaId: string }[];
}

export interface Rarity {
  code: string;
  name: string;
  color: string;
  ordinal: number;
}

export interface AttributeDefinition {
  key: string;
  label: string;
  dataType: "number" | "text" | "boolean";
  unit: string | null;
  ordinal: number;
}

export type ContentResource =
  | "items"
  | "entities"
  | "categories"
  | "events"
  | "recipes"
  | "shops"
  | "shop-categories"
  | "maps"
  | "locations"
  | "spawn-points"
  | "collections"
  | "collection-groups"
  | "codes";

/**
 * Listagem: o filtro (QueryJson, montado com and/or/rule de ./query), a página e a ordenação. Os campos que
 * cada tipo aceita vêm de contentApi.queryFields.
 */
export interface ListQuery {
  /** Sem filtro, lista tudo. */
  where?: QueryGroup;
  /** Começa em 0. */
  page?: number;
  size?: number;
  /** Com "-" na frente para decrescente, ex.: "-updatedAt". */
  sort?: string;
  /** Traz junto toda referência citada pelos documentos, já com nome e ícone. */
  references?: boolean;
}

function gamePath(gameId: string): string {
  return `/games/${encodeURIComponent(gameId)}`;
}

/** Página, ordenação e references vão na URL; o filtro, no corpo. */
function pageString(query: ListQuery): string {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  if (query.sort) params.set("sort", query.sort);
  if (query.references) params.set("references", "true");
  const text = params.toString();
  return text ? `?${text}` : "";
}

export const contentApi = {
  /** POST, porque o filtro vai no corpo; é leitura, aberta sem login como as demais. */
  list<T>(gameId: string, resource: ContentResource, query: ListQuery, signal?: AbortSignal) {
    return apiRequest<ContentPage<T>>(`${gamePath(gameId)}/${resource}/query${pageString(query)}`, {
      method: "POST",
      body: query.where ?? and(),
      signal,
    });
  },

  /** Busca e filtros de tela da listagem, com as opções do jogo: o que a barra acima da lista desenha. */
  listingFilters(gameId: string, resource: ContentResource, signal?: AbortSignal) {
    return apiRequest<ListingSchema>(`${gamePath(gameId)}/${resource}/query/filters`, { signal });
  },

  /** Campos que o filtro da listagem aceita (nome, tipo, operadores, opções) e chaves de ordenação. */
  queryFields(gameId: string, resource: ContentResource, signal?: AbortSignal) {
    return apiRequest<QuerySchema>(`${gamePath(gameId)}/${resource}/query/fields`, { signal });
  },

  get<T>(gameId: string, resource: ContentResource, extId: string, signal?: AbortSignal) {
    return apiRequest<T>(`${gamePath(gameId)}/${resource}/${encodeURIComponent(extId)}`, { signal });
  },

  /** Cria; 409 se o código já existe. `media` ausente deixa as imagens do código como estão. */
  create<T>(gameId: string, resource: ContentResource, document: object) {
    return apiRequest<T>(`${gamePath(gameId)}/${resource}`, { method: "POST", body: document });
  },

  /** Substitui o documento inteiro: campo ausente vira vazio, exceto `media`, que ausente fica como está. */
  put<T>(gameId: string, resource: ContentResource, extId: string, document: object) {
    return apiRequest<T>(`${gamePath(gameId)}/${resource}/${encodeURIComponent(extId)}`, { method: "PUT", body: document });
  },

  remove(gameId: string, resource: ContentResource, extId: string) {
    return apiRequest<void>(`${gamePath(gameId)}/${resource}/${encodeURIComponent(extId)}`, { method: "DELETE" });
  },

  /** Anexa uma imagem ao código, no fim do uso; a mais nova passa a ser a atual. */
  addMedia(gameId: string, resource: ContentResource, extId: string, link: { usage: MediaUsage; mediaId: string }) {
    return apiRequest<MediaLink[]>(`${gamePath(gameId)}/${resource}/${encodeURIComponent(extId)}/media`, {
      method: "POST",
      body: link,
    });
  },

  /** O documento, os conteúdos ligados a ele e toda referência citada, já com nome e ícone. */
  details<D, R>(gameId: string, resource: ContentResource, extId: string, signal?: AbortSignal) {
    return apiRequest<Details<D, R>>(`${gamePath(gameId)}/${resource}/${encodeURIComponent(extId)}/details`, {
      signal,
    });
  },

  /**
   * Árvore de crafting. `target` é "tipo:id"; cada escolha é "category:x=item:y" (membro da
   * categoria) ou "item:x=buy|base|codigo_da_receita".
   */
  craftingTree(gameId: string, target: string, amount: number, choices: string[], signal?: AbortSignal) {
    const params = new URLSearchParams({ target, amount: String(amount) });
    choices.forEach((choice) => params.append("choices", choice));
    return apiRequest<CraftingTree>(`${gamePath(gameId)}/crafting-tree?${params}`, { signal });
  },

  /** Pontos de spawn de um mapa, compactos para desenhar; o filtro usa os campos de /spawn-points. */
  markers(gameId: string, mapId: string, where: QueryGroup, signal?: AbortSignal) {
    return apiRequest<MapMarkers>(`${gamePath(gameId)}/maps/${encodeURIComponent(mapId)}/spawn-points/query?limit=10000`, {
      method: "POST",
      body: where,
      signal,
    });
  },

  /** Vários alvos numa árvore só, na ordem da lista; escolhas como na árvore. */
  craftingPlan(gameId: string, targets: { target: string; amount: number }[], choices: string[], signal?: AbortSignal) {
    const params = new URLSearchParams();
    targets.forEach(({ target, amount }) => {
      params.append("target", target);
      params.append("amount", String(amount));
    });
    choices.forEach((choice) => params.append("choices", choice));
    return apiRequest<CraftingPlan>(`${gamePath(gameId)}/crafting-plan?${params}`, { signal });
  },

  craftingProfits(gameId: string, query: ProfitQuery, signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.timed) params.set("timed", "true");
    if (query.sort) params.set("sort", query.sort);
    if (query.page !== undefined) params.set("page", String(query.page));
    if (query.size !== undefined) params.set("size", String(query.size));
    return apiRequest<ContentPage<CraftProfit>>(`${gamePath(gameId)}/crafting-profits?${params}`, { signal });
  },
};

export const gameApi = {
  /** Jogos que o usuário atual pode ver. */
  list(signal?: AbortSignal) {
    return apiRequest<GameInfo[]>("/games", { signal });
  },

  /** Quantos conteúdos o jogo tem de cada tipo, pelo código do tipo (item, entity, redemption_code...). */
  contentCounts(gameId: string, signal?: AbortSignal) {
    return apiRequest<Record<string, number>>(`${gamePath(gameId)}/content-counts`, { signal });
  },

  get(gameId: string, signal?: AbortSignal) {
    return apiRequest<GameInfo>(gamePath(gameId), { signal });
  },

  rarities(gameId: string, signal?: AbortSignal) {
    return apiRequest<Rarity[]>(`${gamePath(gameId)}/rarities`, { signal });
  },

  /** Dados, políticas e imagens do jogo; só owner. Campo ausente não muda; `media` presente substitui a lista toda. */
  patch(gameId: string, changes: GamePatch) {
    return apiRequest<GameInfo>(gamePath(gameId), { method: "PATCH", body: changes });
  },

  /** Cria ou substitui a raridade pelo código. Cor em hexadecimal (#RRGGBB ou #RRGGBBAA). */
  putRarity(gameId: string, rarity: Rarity) {
    const { code, ...body } = rarity;
    return apiRequest<Rarity>(`${gamePath(gameId)}/rarities/${encodeURIComponent(code)}`, { method: "PUT", body });
  },

  deleteRarity(gameId: string, code: string) {
    return apiRequest<void>(`${gamePath(gameId)}/rarities/${encodeURIComponent(code)}`, { method: "DELETE" });
  },

  attributes(gameId: string, signal?: AbortSignal) {
    return apiRequest<AttributeDefinition[]>(`${gamePath(gameId)}/attributes`, { signal });
  },

  /** Busca por nome ou código em todos os tipos cadastrados; `kind` restringe a um tipo. */
  search(gameId: string, term: string, kind?: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ q: term, limit: "20" });
    if (kind) params.set("kind", kind);
    return apiRequest<SearchHit[]>(`${gamePath(gameId)}/search?${params}`, { signal });
  },
};
