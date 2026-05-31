import type { GeoJsonGeometry, WktGeometry } from "./geoJsonGeometry";

export type GameDataTypes = "item" | "entity" | "recipe" | "shop" | "event" | "conjunto" | "category" | "skill";

export interface Item {
  id: string;//codigo de referencia do item
  name: string;//nome bonito do item
  icon?: string;//path da imagem de icone com o fundo transparente presente em public/img
  category?: string | string[];//tipo e categoria do item
  description?: string;//descritivo ou historia do item
  buyPrice?: number;//preco para comprar na loja o item
  sellPrice?: number;//preco para vender o item na loja
  level?: number;//nivel po poder do item
  variants?: Partial<Item>[];//caso o item tenha variantes é possivel incluir aqui, uma variante sempre é uma copia do item normal, ou seja oque a variante tem que o original tambem tem não é necessaria informar
  event?: string[];//nome dos eventos que este item pertence (normalmente usado para indicar que o item é de DLC ou temporada)
  image?: string;//path da imagem de screenshot do item dentro do jogo presente em public/img
  rarity?: string;//raridade do item
  metadata?: ItemMetadata[];//informação complementar sobre o item
}

export interface ItemMetadata {
  id: string;
  type?: string;
  value?: string | number | boolean;
}

export interface EntityDrop {
  itemId: string;//id do drop
  chance: number;//chance de dropar o item de 0 até 1
  quant: number;//quantos será dropado ?
  maxQuant?: number;//se tiver variação coloque a quantidade maxima de cair; ou seja caso seja de 1 até 3. coloque quant = 1 e maxQuant = 3
}

export interface Entity {
  id: string;
  name: string;//nome bonito da criatura
  level?: number;//nivel da criatura base
  category?: string | string[];//categoria (npc, criatura, estrutura, ativador e etc)
  description?: string;//descrição ou informação da criatura
  icon?: string;//icone da criatura com fundo transparente (tambem usado para aparecer no mapa)
  image?: string;//imagem de printscreen do item dentro do jogo
  buyPrice?: number;//quando compravel qual é o preço para se obter ele
  sellPrice?: number;//quando vendivel qual é o preço que os npc pagam por padrão
  respawnDelay?: number;//qual é o tempo em minutos que leva para dar respawn na entidade ?
  parentId?: string; // Para hierarquia (ex: Cripta dentro de Pântano)
  potentialSpawns?: {
    entityId: string;
    chance?: number;
    quantity?: string;
    conditions?: string;
  }[];
  geom?: GeoJsonGeometry;
  requirements?: {
    itemId: string;
    quant: number;
    maxQuant?: number;
  }[];
  drops?: EntityDrop[]; // ao Derotar ou destruir oque será caido normalmente da entidade ?
  variants?: Partial<Entity>[];//caso a entidade tenha variantes é possivel incluir aqui, uma variante sempre é uma copia da entidade normal, ou seja oque a variante tem que o original tambem tem não é necessaria informar
  event?: string[];//nome dos eventos que este item pertence (normalmente usado para indicar que o item é de DLC ou temporada)
  rarity?: string;//qual é a raridade da entidade ?
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  banner?: string;
  type?: "item" | "entity" | "both";
  image?: string;
  event?: string[];
  shopId?: string;
  items?: ShopItem[];
}

export interface RecipeItem {
  id: string;
  name?: string;
  amount: number;
  type?: GameDataTypes;
}

export interface RecipeUnlock {
  id: string;
  type?: string;
  value: string;
}

export interface Recipe {
  id: string;// id da receita
  name?: string; // nome personalizada da receita, pois normalmente é utilizado o nome do item de saida como nome da receita quando não definido
  itemId?: string; // item unico de saida
  amount?: number; // quantidade da itens unico de saida
  ingredients?: RecipeItem[];// itens necessarios para craftar
  Ingredients?: any[]; // Raw data support
  products?: RecipeItem[];// quando tem multiplos itens de saida
  Products?: any[]; // Raw data support
  stations?: string[];// ids das bancadas de trabalhos
  ProducedIn?: string[]; // Raw data support
  unlock?: RecipeUnlock[];// requisitos especiais necessarios para habilitar a receita
  craftTime?: number; // quantos segundos leva para construir este item 
  event?: string[]; //nome dos eventos que este item pertence (normalmente usado para indicar que o item é de DLC ou temporada)
}

export interface ShopCondition {
  type: string;
  id: string;
  description?: string;
}

export interface ShopExchange {
  id: string;
  amount: number;
  type?: GameDataTypes;
}

export interface ShopItem {
  id: string;
  type?: GameDataTypes;
  amount?: number;
  quant?: number;
  price?: number;
  currency?: string;
  resetType?: "diario" | "semanal" | "unique";
  exchange?: ShopExchange[];
  conditions?: ShopCondition[];
  rarity?: string;
}

export interface ShopGroup {
  name: string;
  resetType?: "diario" | "semanal" | "unique";
  items: ShopItem[];
  event?: string[];
}

export interface Shop {
  id: string;
  name: string;
  npcId?: string;
  icon?: string;
  banner?: string;
  groups: ShopGroup[];
  conditional?: ShopCondition[];
  event?: string[];
  category?: string | string[];
}

export interface GameEvent {
  id: string;
  name: string;
  type: "clima" | "season" | "mapa" | "event" | string;
  description?: string;
  icon: string;
  banner?: string;
  period?: {
    start?: string;
    end?: string;
  };
}

export interface MapMetadata {
  id: string;
  name: string;
  type: "single" | "layered" | "tile" | "procedural";
  defaultView?: "map" | "dashboard";
  availableViews?: ("map" | "dashboard")[];
  gridSize?: number;
  url?: string;
  urlPattern?: string;
  layers?: number;
  bounds: [[number, number], [number, number]];
  minZoom: number;
  maxZoom: number;
  tileMinZoom?: number;
  tileMaxZoom?: number;
  tileRange?: {
    z: number;
    min: [number, number];
    max: [number, number];
  };
  thumbnail?: string;
  description?: string;
  defaultFilters?: {
    types?: string[];
    categories?: string[];
    entities?: string[];
  };
  availableWeathers?: string[]; // IDs de eventos/climas disponíveis para este mapa
}

export type GameRarityDefinitionMap = {[key: string]: GameRarityDefinition};
export type GameRarityDefinition = { name: string, color: string };

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  capsule?: string;
  icon?: string;
  comingSoon?: boolean;
  rarity?: GameRarityDefinitionMap;
  dailyResetTime?: string; // HH:mm
  weeklyResetDay?: number; // 0-6 (Sunday-Saturday)
}

export type ReferencePointsRespawnMode = "once" | "respawn" | "weekly" | "daily";

export interface ReferencePointSpawn {
  entityId: string;
  chance?: number;
  quantity?: string;
  conditions?: Record<string, any>;
  customDrops?: EntityDrop[];
}

export interface ReferencePoints {
  id: string;
  type: "spawn" | "poi" | "location" | "biome" | "rule";
  entityId?: string;
  spawns?: ReferencePointSpawn[];
  name?: string;
  description?: string;
  icon?: string;
  thumb?: string;
  locationId?: string; // ID da Região/Mapa onde spawna (legado ou para regras)
  parentId?: string; // Para hierarquia (ex: POI dentro de Biome)
  mode?: ReferencePointsRespawnMode;
  conditions?: Record<string, any>;
  customDrops?: EntityDrop[];
  chance?: number;
  quantity?: string;
  geom: WktGeometry;
  mapId?: string;
  respawnDelay?: number;
  data?: Record<string, any>;
  image?: string;
  event?: string | string[];
}

export interface RedemptionCode {
  code: string;
  rewards: {
    id: string;
    quantity: number;
  }[];
  addedAt: string;
  expiresAt: string;
}

export interface ConjuntoGroup {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  items?: string[]; // Array of Item IDs
  entitys?: string[]; // Array of Entity IDs
  event?: string[];
  image?: string;
  conjuntoIds?: string[]; // Array of Conjunto IDs
}

export interface Conjunto {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  event?: string[];
  image?: string;
}
