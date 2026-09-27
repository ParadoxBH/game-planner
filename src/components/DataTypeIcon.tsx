import { createElement } from "react";
import {
  AutoAwesomeMosaic,
  Bolt,
  Calculate,
  Category,
  Construction,
  Diamond,
  Event,
  Explore,
  Help,
  Inventory,
  Pets,
  Map as MapIcon,
  Place,
  Redeem,
  Settings,
  SportsEsports,
  Storefront,
} from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import type { SvgIconProps } from "@mui/material";

/**
 * Símbolo de cada tipo de dado do sistema — a fonte única dos ícones de tipo (menu, seletores,
 * abas e o fallback de conteúdo sem imagem).
 */
const DATA_TYPE_ICONS = {
  item: Inventory,
  entity: Pets,
  category: Category,
  rarity: Diamond,
  event: Event,
  recipe: Construction,
  shop: Storefront,
  shop_category: Storefront,
  map: MapIcon,
  location: Place,
  spawn_point: Place,
  collection: AutoAwesomeMosaic,
  collection_group: AutoAwesomeMosaic,
  redemption_code: Redeem,
  game: SportsEsports,
  // Seções do jogo que não são conteúdo da API.
  simulator: Explore,
  calculator: Calculate,
  settings: Settings,
} satisfies Record<string, SvgIconComponent>;

export type DataType = keyof typeof DATA_TYPE_ICONS;

interface DataTypeIconProps extends SvgIconProps {
  /** O tipo do dado, como a API o nomeia: "item", "entity", "recipe"... */
  value: DataType | (string & {}) | null | undefined;
  /** Ícone para tipo desconhecido ou ausente. */
  fallback?: SvgIconComponent;
}

const ICONS: Record<string, SvgIconComponent> = DATA_TYPE_ICONS;

/** Ícone que representa um tipo de dado. */
export function DataTypeIcon({ value, fallback = Help, ...props }: DataTypeIconProps) {
  return createElement((value && ICONS[value]) || fallback, props);
}
