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
  Map,
  Pets,
  Assignment,
  NavigateNext,
  Grass,
  People,
  Foundation,
  Storefront
} from "@mui/icons-material";
import { Link, useLocation } from 'react-router-dom';
import { useGameData } from "../hooks/useGameData";
import { useMemo } from "react";

const navItems = [
  { label: "Mapa", pathSuffix: "map", icon: <Map /> },
  { label: 'Itens', pathSuffix: "items", icon: <Construction /> },
  { label: 'Receitas', pathSuffix: "recipes", icon: <Assignment /> },
  { label: 'Loja', pathSuffix: "shops", icon: <Storefront /> },
  { label: 'Quests', pathSuffix: "quests", icon: <Assignment /> },
];

const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  resource: <Grass />,
  recurso: <Grass />,
  creature: <Pets />,
  criatura: <Pets />,
  npc: <People />,
  structure: <Foundation />,
  estrutura: <Foundation />,
};

export function Header() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  // Basic heuristic: Se a rota for /game/:gameId/..., extrai o gameId
  const isGameRoute = pathParts[0] === 'game' && pathParts.length >= 2;
  const gameId = isGameRoute ? pathParts[1] : null;

  const { data: entities } = useGameData<any[]>(gameId || "", "entity");

  const dynamicEntityCategories = useMemo(() => {
    if (!entities) return [];
    const sets = new Set<string>();
    entities.forEach(e => {
      if (e.category) sets.add(e.category.toLowerCase());
    });
    return Array.from(sets).sort().map(cat => ({
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      pathSuffix: `entity/${cat}`,
      icon: CATEGORY_ICONS[cat] || <Pets />
    }));
  }, [entities]);

  const allNavItems = useMemo(() => {
    // Insere as categorias dinâmicas antes de "Quests" ou no final
    const items = [...navItems];
    const questIndex = items.findIndex(i => i.pathSuffix === "quests");
    if (questIndex !== -1) {
      items.splice(questIndex, 0, ...dynamicEntityCategories);
    } else {
      items.push(...dynamicEntityCategories);
    }
    return items;
  }, [dynamicEntityCategories]);

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
            <Box sx={{ display: { xs: "none", md: "flex" } }}>
              {allNavItems.map((item) => (
                <Button
                  key={item.label}
                  component={Link} 
                  to={`/game/${gameId}/${item.pathSuffix}`}
                  startIcon={item.icon}
                  sx={{ 
                    my: 2, 
                    color: "white", 
                    display: "flex", 
                    mx: 1,
                    textTransform: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      color: 'primary.main',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                    ...(location.pathname.includes(item.pathSuffix) && { 
                      borderBottom: '2px solid #ff4400', 
                      borderRadius: 0,
                      color: 'primary.main' 
                    })
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
