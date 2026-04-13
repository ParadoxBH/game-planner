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
  Grass,
  People,
  Foundation,
  AutoAwesomeMosaic,
} from "@mui/icons-material";
import { useGameData } from "./useGameData";
import { useTheme } from "@mui/material";
import type { 
  Item, 
  Entity, 
  Recipe, 
  Shop, 
  GameEvent, 
  MapMetadata, 
  RedemptionCode 
} from "../types/gameModels";

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
}

const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  resource: <Grass />,
  recurso: <Grass />,
  creature: <Pets />,
  criatura: <Pets />,
  npc: <People />,
  structure: <Foundation />,
  estrutura: <Foundation />,
};

export function useNavigation(gameId: string | null) {
  const theme = useTheme();
  
  const { data: entities } = useGameData<Entity>(gameId || "", "entity");
  const { data: items } = useGameData<Item>(gameId || "", "items");
  const { data: recipes } = useGameData<Recipe>(gameId || "", "recipes");
  const { data: shops } = useGameData<Shop>(gameId || "", "shops");
  const { data: events } = useGameData<GameEvent>(gameId || "", "events");
  const { data: codes } = useGameData<RedemptionCode>(gameId || "", "codes");
  const { data: maps } = useGameData<MapMetadata>(gameId || "", "maps");
  const { data: quests } = useGameData<any>(gameId || "", "quests");

  const dynamicEntityCategories = useMemo(() => {
    if (!entities) return [];
    const sets = new Set<string>();
    entities.forEach((e: Entity) => {
      if (e.category) {
        if (Array.isArray(e.category)) {
          sets.add(e.category[0].toLowerCase());
        } else {
          sets.add(e.category.toLowerCase());
        }
      }
    });
    return Array.from(sets).sort().map(cat => ({
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      path: `/game/${gameId}/entity/list/${cat}`,
      icon: CATEGORY_ICONS[cat] || <Pets />
    }));
  }, [entities, gameId]);

  const dynamicItemCategories = useMemo(() => {
    if (!items) return [];
    const sets = new Set<string>();
    items.forEach((item: Item) => {
      const cats = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
      if(cats.length > 0)
        sets.add(cats[0].toLowerCase());
    });
    return Array.from(sets).sort().map(cat => ({
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      path: `/game/${gameId}/items/list/${cat}`,
    }));
  }, [items, gameId]);

  const dynamicRecipeStations = useMemo(() => {
    if (!recipes) return [];
    const sets = new Set<string>();
    recipes.forEach((r: Recipe) => {
      const stations = r.stations || r.ProducedIn || [];
      stations.forEach((s: string) => sets.add(s));
    });
    return Array.from(sets).sort().map(station => ({
      label: station,
      path: `/game/${gameId}/recipes/list/${station}`,
    }));
  }, [recipes, gameId]);

  const dynamicShops = useMemo(() => {
    if (!shops || !entities) return [];
    const entityMap = new Map<string, Entity>(entities.map((e: Entity) => [e.id, e]));
    return shops.map((shop: Shop) => {
      const npc = entityMap.get(shop.npcId);
      return {
        label: shop.name || npc?.name || shop.npcId,
        path: `/game/${gameId}/shops/list/${shop.id}`,
      };
    });
  }, [shops, entities, gameId]);

  const allMenuItems: NavigationItem[] = useMemo(() => [
    { 
      id: "map",
      label: "Mapa", 
      icon: <MapIcon />, 
      path: `/game/${gameId}/map`, 
      color: theme.palette.primary.main 
    },
    { 
      id: "entities",
      label: "Entidades", 
      icon: <Pets />, 
      path: `/game/${gameId}/entity/list`, 
      color: "#ff9800",
      isDropdown: true,
      options: dynamicEntityCategories
    },
    { 
      id: "items",
      label: "Itens", 
      icon: <Construction />, 
      path: `/game/${gameId}/items/list`, 
      color: "#4caf50",
      isDropdown: true,
      options: dynamicItemCategories
    },
    { 
      id: "conjuntos",
      label: "Conjuntos", 
      icon: <AutoAwesomeMosaic />, 
      path: `/game/${gameId}/conjuntos`, 
      color: "#ffca28"
    },
    { 
      id: "recipes",
      label: "Receitas", 
      icon: <Assignment />, 
      path: `/game/${gameId}/recipes/list`, 
      color: "#f44336",
      isDropdown: true,
      options: dynamicRecipeStations
    },
    { 
      id: "shops",
      label: "Lojas", 
      icon: <Storefront />, 
      path: `/game/${gameId}/shops/list`, 
      color: "#9c27b0",
      isDropdown: true,
      options: dynamicShops
    },
    { 
      id: "events",
      label: "Eventos", 
      icon: <Event />, 
      path: `/game/${gameId}/events`, 
      color: "#e91e63" 
    },
    { 
      id: "codes",
      label: "Códigos", 
      icon: <Redeem />, 
      path: `/game/${gameId}/codes`, 
      color: "#795548" 
    },
    { 
      id: "quests",
      label: "Quests", 
      icon: <Assignment />, 
      path: `/game/${gameId}/quests`, 
      color: "#2196f3" 
    },
    { 
      id: "calculator",
      label: "Calculadora", 
      icon: <Calculate />, 
      path: `/game/${gameId}/calculator`, 
      color: "#00bcd4", // Cyan
      isDropdown: true,
      options: [
        { label: "Crafting", path: `/game/${gameId}/calculator/crafting` },
        { label: "Rentabilidade", path: `/game/${gameId}/calculator/profitability` },
        { label: "Lucro por Tempo", path: `/game/${gameId}/calculator/profit-per-time` },
      ]
    },
  ], [gameId, theme, dynamicEntityCategories, dynamicItemCategories, dynamicRecipeStations, dynamicShops]);

  const menuItems = useMemo(() => {
    return allMenuItems.filter(item => {
      if (item.id === "map") return maps && maps.length > 0;
      if (item.id === "entities") return entities && entities.length > 0;
      if (item.id === "items") return items && items.length > 0;
      if (item.id === "recipes") return recipes && recipes.length > 0;
      if (item.id === "shops") return shops && shops.length > 0;
      if (item.id === "events") return events && events.length > 0;
      if (item.id === "codes") return codes && codes.length > 0;
      if (item.id === "quests") return quests && quests.length > 0;
      return true;
    });
  }, [allMenuItems, maps, entities, items, recipes, shops, events, codes]);

  return { menuItems };
}
