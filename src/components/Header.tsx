import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Stack,
  Breadcrumbs
} from "@mui/material";
import {
  Construction,
  Map as MapIcon,
  Pets,
  Assignment,
  NavigateNext,
  Grass,
  People,
  Foundation,
  Storefront,
  Event,
  Redeem
} from "@mui/icons-material";
import { Link, useLocation } from 'react-router-dom';
import { useGameData } from "../hooks/useGameData";
import { useMemo } from "react";
import type { GameEntity } from "./EntityPage";


const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  resource: <Grass />,
  recurso: <Grass />,
  creature: <Pets />,
  criatura: <Pets />,
  npc: <People />,
  structure: <Foundation />,
  estrutura: <Foundation />,
};

import { HeaderNavDropdown } from "./common/HeaderNavDropdown";

export function Header() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  // Basic heuristic: Se a rota for /game/:gameId/..., extrai o gameId
  const isGameRoute = pathParts[0] === 'game' && pathParts.length >= 2;
  const gameId = isGameRoute ? pathParts[1] : null;

  const { data: entities } = useGameData<GameEntity[]>(gameId || "", "entity");
  const { data: items } = useGameData<any[]>(gameId || "", "items");
  const { data: recipes } = useGameData<any[]>(gameId || "", "recipes");
  const { data: shops } = useGameData<any[]>(gameId || "", "shops");

  const dynamicEntityCategories = useMemo(() => {
    if (!entities) return [];
    const sets = new Set<string>();
    entities.forEach(e => {
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
    items.forEach(item => {
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
    recipes.forEach(r => {
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
    const entityMap = new Map<string, GameEntity>(entities.map(e => [e.id, e]));
    return shops.map(shop => {
      const npc = entityMap.get(shop.npcId);
      return {
        label: shop.name || npc?.name || shop.npcId,
        path: `/game/${gameId}/shops/list/${shop.id}`,
      };
    });
  }, [shops, entities, gameId]);

  return (
    <AppBar position="static" sx={{ backgroundColor: "#1a1a1a" }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Stack sx={{ flexGrow: 1 }} alignItems={"start"}>
            <Breadcrumbs separator={<NavigateNext fontSize="small" color="primary" />} aria-label="breadcrumb">
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Typography
                  variant="h6"
                  noWrap
                  component="div"
                  color="primary"
                  sx={{ fontWeight: "bold", letterSpacing: 1 }}
                >
                  Game Planner
                </Typography>
              </Link>
              {gameId && (
                <Link to={`/game/${gameId}`} style={{ textDecoration: 'none' }}>
                  <Typography
                    variant="h6"
                    noWrap
                    component="div"
                    color="text.secondary"
                    sx={{ textTransform: 'capitalize', fontWeight: "bold" }}
                  >
                    {gameId}
                  </Typography>
                </Link>
              )}
            </Breadcrumbs>
          </Stack>

          {/* Somente exibe abas extras se estiver dentro de um jogo */}
          {gameId && (
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: 'center' }}>
              <Button
                component={Link} 
                to={`/game/${gameId}/map`}
                startIcon={<MapIcon />}
                sx={{ 
                  my: 2, 
                  color: location.pathname.includes('/map') ? "primary.main" : "white", 
                  display: "flex", 
                  mx: 1,
                  textTransform: 'none',
                  transition: 'all 0.2s',
                  borderBottom: location.pathname.includes('/map') ? '2px solid #ff4400' : '2px solid transparent',
                  borderRadius: 0,
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }
                }}
              >
                Mapa
              </Button>

              <HeaderNavDropdown 
                label="Entidades" 
                icon={<Pets />} 
                rootPath={`/game/${gameId}/entity/list`} 
                options={dynamicEntityCategories} 
              />

              <HeaderNavDropdown 
                label="Itens" 
                icon={<Construction />} 
                rootPath={`/game/${gameId}/items/list`} 
                options={dynamicItemCategories} 
              />

              <HeaderNavDropdown 
                label="Receitas" 
                icon={<Assignment />} 
                rootPath={`/game/${gameId}/recipes/list`} 
                options={dynamicRecipeStations} 
              />

              <HeaderNavDropdown 
                label="Lojas" 
                icon={<Storefront />} 
                rootPath={`/game/${gameId}/shops/list`} 
                options={dynamicShops} 
              />

              <Button
                component={Link} 
                to={`/game/${gameId}/events`}
                startIcon={<Event />}
                sx={{ 
                  my: 2, 
                  color: location.pathname.includes('/events') ? "primary.main" : "white", 
                  display: "flex", 
                  mx: 1,
                  textTransform: 'none',
                  transition: 'all 0.2s',
                  borderBottom: location.pathname.includes('/events') ? '2px solid #ff4400' : '2px solid transparent',
                  borderRadius: 0,
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }
                }}
              >
                Eventos
              </Button>

              <Button
                component={Link} 
                to={`/game/${gameId}/codes`}
                startIcon={<Redeem />}
                sx={{ 
                  my: 2, 
                  color: location.pathname.includes('/codes') ? "primary.main" : "white", 
                  display: "flex", 
                  mx: 1,
                  textTransform: 'none',
                  transition: 'all 0.2s',
                  borderBottom: location.pathname.includes('/codes') ? '2px solid #ff4400' : '2px solid transparent',
                  borderRadius: 0,
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }
                }}
              >
                Códigos
              </Button>

              <Button
                component={Link} 
                to={`/game/${gameId}/quests`}
                startIcon={<Assignment />}
                sx={{ 
                  my: 2, 
                  color: location.pathname.includes('/quests') ? "primary.main" : "white", 
                  display: "flex", 
                  mx: 1,
                  textTransform: 'none',
                  transition: 'all 0.2s',
                  borderBottom: location.pathname.includes('/quests') ? '2px solid #ff4400' : '2px solid transparent',
                  borderRadius: 0,
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }
                }}
              >
                Quests
              </Button>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
