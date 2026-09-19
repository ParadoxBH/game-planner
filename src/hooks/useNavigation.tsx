import { useMemo } from "react";
import {
  Map as MapIcon,
  Construction,
  Pets,
  Assignment,
  Storefront,
  Event,
  Redeem,
  Calculate,
  AutoAwesomeMosaic,
  Category,
  Diamond,
  Settings,
} from "@mui/icons-material";
import { useTheme } from "@mui/material";
import { MAX_PAGE_SIZE, type ShopDocument } from "../api/content";
import type { ListingSchema } from "../api/query";
import { contentRoute, mediaUrl } from "../api/references";
import { useGameAdmin } from "./useGameAdmin";
import { useContentCounts, useContentList, useListingFilters, useRecipeStations } from "../api/useContent";

export interface NavigationOption {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  isDropdown?: boolean;
  options?: NavigationOption[];
  /** No dropdown, a entrada "Todas" que leva a `path`. Padrão true. */
  showAll?: boolean;
}

function optionIcon(mediaId: string | null | undefined, label: string): React.ReactNode {
  return mediaId ? <img src={mediaUrl(mediaId)} alt={label} style={{ width: 20, height: 20, objectFit: "contain" }} /> : undefined;
}

/**
 * Menu do jogo lido da API: cada seção aparece quando o jogo tem conteúdo daquele tipo; entidades e
 * itens listam as categorias, receitas as bancadas e lojas as lojas.
 */
export function useNavigation(gameId: string | null) {
  const theme = useTheme();
  const id = gameId ?? undefined;
  const counts = useContentCounts(id);
  // As mesmas categorias do filtro Categoria de cada listagem: as principais que o tipo usa.
  const itemFilters = useListingFilters(id, "items");
  const entityFilters = useListingFilters(id, "entities");
  const shops = useContentList<ShopDocument>(id, "shops", { size: MAX_PAGE_SIZE, sort: "name" });
  const stations = useRecipeStations(id);
  const { isAdmin } = useGameAdmin(id);

  const menuItems = useMemo<NavigationItem[]>(() => {
    if (!gameId) return [];
    const base = `/game/${gameId}`;
    const count = (kind: string) => counts.data?.[kind] ?? 0;

    const categoryOptions = (schema: ListingSchema | undefined, listPath: string): NavigationOption[] =>
      (schema?.filters.find((filter) => filter.key === "category")?.options ?? []).map((option) => ({
        label: option.label,
        path: `${listPath}/${encodeURIComponent(option.value)}`,
        icon: optionIcon(option.iconMediaId, option.label),
      }));

    const all: NavigationItem[] = [
      { id: "map", label: "Mapa", icon: <MapIcon />, path: `${base}/map`, color: theme.palette.primary.main },
      {
        id: "entities",
        label: "Entidades",
        icon: <Pets />,
        path: `${base}/entity`,
        color: "#ff9800",
        isDropdown: true,
        options: categoryOptions(entityFilters.data, `${base}/entity/list`),
      },
      {
        id: "items",
        label: "Itens",
        icon: <Construction />,
        path: `${base}/items`,
        color: "#4caf50",
        isDropdown: true,
        options: categoryOptions(itemFilters.data, `${base}/items/list`),
      },
      { id: "conjuntos", label: "Conjuntos", icon: <AutoAwesomeMosaic />, path: `${base}/conjuntos`, color: "#ffca28" },
      {
        id: "recipes",
        label: "Receitas",
        icon: <Assignment />,
        path: `${base}/recipes`,
        color: "#f44336",
        isDropdown: true,
        options: (stations.data ?? []).map((station) => ({
          label: station.name ?? station.extId,
          path: `${base}/recipes/list/${encodeURIComponent(station.extId)}`,
          icon: optionIcon(station.iconMediaId, station.name ?? station.extId),
        })),
      },
      {
        id: "shops",
        label: "Lojas",
        icon: <Storefront />,
        path: `${base}/shops/list`,
        color: "#9c27b0",
        isDropdown: true,
        options: (shops.data?.content ?? []).map((shop) => ({ label: shop.name, path: contentRoute(gameId, "shop", shop.extId)! })),
      },
      { id: "events", label: "Eventos", icon: <Event />, path: `${base}/events`, color: "#e91e63" },
      { id: "codes", label: "Códigos", icon: <Redeem />, path: `${base}/codes`, color: "#795548" },
      // Telas de administração: só aparecem para quem administra o jogo.
      ...(isAdmin
        ? [
            {
              id: "manage",
              label: "Gerenciar",
              icon: <Settings />,
              path: `${base}/categories`,
              color: "#607d8b",
              isDropdown: true,
              showAll: false,
              options: [
                { label: "Categorias", path: `${base}/categories`, icon: <Category fontSize="small" /> },
                { label: "Raridades", path: `${base}/rarities`, icon: <Diamond fontSize="small" /> },
              ],
            },
          ]
        : []),
      {
        id: "calculator",
        label: "Calculadora",
        icon: <Calculate />,
        path: `${base}/calculator`,
        color: "#00bcd4",
        isDropdown: true,
        options: [
          { label: "Crafting", path: `${base}/calculator/crafting` },
          { label: "Rentabilidade", path: `${base}/calculator/profitability` },
          { label: "Lucro por tempo", path: `${base}/calculator/profit-per-time` },
        ],
      },
    ];

    const kindOf: Record<string, string> = {
      map: "map",
      entities: "entity",
      items: "item",
      conjuntos: "collection",
      recipes: "recipe",
      shops: "shop",
      events: "event",
      codes: "redemption_code",
    };
    // O mapa aparece para admin mesmo sem nenhum: é na seleção de mapas que se cria o primeiro.
    return all.filter((item) => !kindOf[item.id] || count(kindOf[item.id]) > 0 || (item.id === "map" && isAdmin));
  }, [gameId, theme, counts.data, itemFilters.data, entityFilters.data, shops.data, stations.data, isAdmin]);

  return { menuItems };
}
