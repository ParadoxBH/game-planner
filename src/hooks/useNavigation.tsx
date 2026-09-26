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
  Explore,
  AutoAwesomeMosaic,
  Category,
  Diamond,
  Settings,
  SportsEsports,
} from "@mui/icons-material";
import { useTheme } from "@mui/material";
import { MAX_PAGE_SIZE, type ShopDocument } from "../api/content";
import type { ListingSchema } from "../api/query";
import { contentRoute, mediaUrl } from "../api/references";
import { useGameAdmin, useGameEditor } from "./useGameAdmin";
import { useContentCounts, useContentList, useListingFilters } from "../api/useContent";

export interface NavigationOption {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

/** Seções com tela de criação: aparecem para quem edita mesmo num jogo ainda sem nada. */
const CREATABLE = new Set(["map", "entities", "items", "recipes", "conjuntos"]);

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
  const recipeFilters = useListingFilters(id, "recipes");
  const { isAdmin, isOwner } = useGameAdmin(id);
  const { canEdit } = useGameEditor(id);

  const menuItems = useMemo<NavigationItem[]>(() => {
    if (!gameId) return [];
    const base = `/game/${gameId}`;
    const count = (kind: string) => counts.data?.[kind] ?? 0;

    const filterOptions = (schema: ListingSchema | undefined, listPath: string, key = "category"): NavigationOption[] =>
      (schema?.filters.find((filter) => filter.key === key)?.options ?? []).map((option) => ({
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
        options: filterOptions(entityFilters.data, `${base}/entity/list`),
      },
      {
        id: "items",
        label: "Itens",
        icon: <Construction />,
        path: `${base}/items`,
        color: "#4caf50",
        isDropdown: true,
        options: filterOptions(itemFilters.data, `${base}/items/list`),
      },
      { id: "conjuntos", label: "Conjuntos", icon: <AutoAwesomeMosaic />, path: `${base}/conjuntos`, color: "#ffca28" },
      {
        id: "recipes",
        label: "Receitas",
        icon: <Assignment />,
        path: `${base}/recipes`,
        color: "#f44336",
        isDropdown: true,
        // As bancadas do filtro da listagem, que terminam em "Sem bancada" quando alguma receita
        // não pede nenhuma.
        options: filterOptions(recipeFilters.data, `${base}/recipes/list`, "station"),
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
                // Os dados do próprio jogo são do owner; moderador gerencia só o conteúdo.
                ...(isOwner ? [{ label: "Jogo", path: `${base}/settings`, icon: <SportsEsports fontSize="small" /> }] : []),
                { label: "Categorias", path: `${base}/categories`, icon: <Category fontSize="small" /> },
                { label: "Raridades", path: `${base}/rarities`, icon: <Diamond fontSize="small" /> },
              ],
            },
          ]
        : []),
      {
        id: "simulador",
        label: "Simulador",
        icon: <Explore />,
        path: `${base}/simulador`,
        color: "#8bc34a",
      },
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
      simulador: "spawn_point",
      map: "map",
      entities: "entity",
      items: "item",
      conjuntos: "collection",
      recipes: "recipe",
      shops: "shop",
      events: "event",
      codes: "redemption_code",
    };
    // Sem nenhum conteúdo do tipo, a seção some — menos para quem edita, que precisa dela para
    // cadastrar o primeiro. Só vale onde há tela de criação (ver CREATABLE).
    return all.filter(
      (item) => !kindOf[item.id] || count(kindOf[item.id]) > 0 || (canEdit && CREATABLE.has(item.id)),
    );
  }, [gameId, theme, counts.data, itemFilters.data, entityFilters.data, shops.data, recipeFilters.data, isAdmin, isOwner, canEdit]);

  return { menuItems };
}
