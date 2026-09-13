import { apiRequest } from "./http";

/** Página máxima aceita pela API. */
export const MAX_PAGE_SIZE = 200;

/** Referência textual a outro conteúdo. `kind` ausente quando a origem não diz o tipo. */
export interface Reference {
  kind?: string | null;
  extId: string;
}

/** Referência como parâmetro de URL: "tipo:id", ou só "id" quando o tipo não é conhecido. */
export function referenceParam(target: Reference): string {
  return target.kind ? `${target.kind}:${target.extId}` : target.extId;
}

export type MediaUsage = "icon" | "capsule" | "thumbnail" | "banner" | "screenshot";

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
  /** Só quando a listagem pede references=true. */
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

/** Ingrediente de receita ou requisito de entidade. */
export interface Requirement {
  target: Reference;
  amount: number;
  notConsumed: boolean;
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

export interface RecipeDocument extends ContentBase {
  craftTimeSeconds: number | null;
  stations: string[];
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

/** Bancada citada por receitas do jogo. */
export interface RecipeStation {
  extId: string;
  name: string | null;
  iconMediaId: string | null;
  registered: boolean;
  recipeCount: number;
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

export interface CraftTotals {
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
 * Filtros de listagem: os comuns e, em `filters`, os próprios de cada tipo
 * (produces, sells, trade, activeEvents, withoutCategory, references...). Valor undefined não é enviado.
 */
export interface ListQuery {
  search?: string;
  /** Todas precisam estar no conteúdo. */
  categories?: string[];
  event?: string;
  rarity?: string;
  /** Começa em 0. */
  page?: number;
  size?: number;
  /** Com "-" na frente para decrescente, ex.: "-updatedAt". */
  sort?: string;
  filters?: Record<string, string | undefined>;
}

function gamePath(gameId: string): string {
  return `/games/${encodeURIComponent(gameId)}`;
}

function queryString(query: ListQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  query.categories?.forEach((category) => params.append("category", category));
  if (query.event) params.set("event", query.event);
  if (query.rarity) params.set("rarity", query.rarity);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.size !== undefined) params.set("size", String(query.size));
  if (query.sort) params.set("sort", query.sort);
  Object.entries(query.filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, value);
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

export const contentApi = {
  list<T>(gameId: string, resource: ContentResource, query: ListQuery, signal?: AbortSignal) {
    return apiRequest<ContentPage<T>>(`${gamePath(gameId)}/${resource}${queryString(query)}`, { signal });
  },

  get<T>(gameId: string, resource: ContentResource, extId: string, signal?: AbortSignal) {
    return apiRequest<T>(`${gamePath(gameId)}/${resource}/${encodeURIComponent(extId)}`, { signal });
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
};

export const gameApi = {
  get(gameId: string, signal?: AbortSignal) {
    return apiRequest<GameInfo>(gamePath(gameId), { signal });
  },

  rarities(gameId: string, signal?: AbortSignal) {
    return apiRequest<Rarity[]>(`${gamePath(gameId)}/rarities`, { signal });
  },

  attributes(gameId: string, signal?: AbortSignal) {
    return apiRequest<AttributeDefinition[]>(`${gamePath(gameId)}/attributes`, { signal });
  },

  recipeStations(gameId: string, signal?: AbortSignal) {
    return apiRequest<RecipeStation[]>(`${gamePath(gameId)}/recipe-stations`, { signal });
  },
};
