import {
  Drawer,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Stack,
  IconButton,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  Home,
  Gamepad,
  ArrowBack,
} from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import type { NavigationItem } from "../../hooks/useNavigation";
import { loadGamesList } from "../../services/dataLoader";
import type { GameInfo } from "../../types/gameModels";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  gameId: string | null;
  menuItems: NavigationItem[];
}

export function MobileMenu({
  open,
  onClose,
  gameId,
  menuItems,
}: MobileMenuProps) {
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(
    {},
  );
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

  useEffect(() => {
    if (!gameId) {
      setLoadingGames(true);
      loadGamesList()
        .then(setGames)
        .finally(() => setLoadingGames(false));
    }
  }, [gameId]);

  const toggleDropdown = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdowns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const currentGame = games.find((g) => g.id === gameId);

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 280,
          backgroundColor: "#0d0d0d",
          backgroundImage: "none",
        },
      }}
    >
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Stack
          direction={"row"}
          alignItems={"center"}
          justifyContent={"space-between"}
        >
          <Stack direction={"column"}>
            <Typography
              variant="h6"
              color="primary"
              sx={{ fontWeight: "bold" }}
            >
              Game Planner
            </Typography>
            {gameId && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: 700,
                }}
              >
                {gameId}
              </Typography>
            )}
          </Stack>
          {!!gameId && <IconButton component={Link} to="/">
            <ArrowBack />
          </IconButton>}
        </Stack>
      </Box>
      <Divider sx={{ opacity: 0.1 }} />

      <List sx={{ pt: 0 }}>
        {/* Se NÃO estiver em um jogo, mostra lista de jogos */}
        {!gameId ? (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/"
                selected={location.pathname === "/"}
              >
                <ListItemIcon sx={{ minWidth: 40, color: "primary.main" }}>
                  <Home />
                </ListItemIcon>
                <ListItemText primary="Início" />
              </ListItemButton>
            </ListItem>
            <Divider sx={{ my: 1, opacity: 0.05 }} />
            <Typography
              variant="overline"
              sx={{ px: 2, color: "text.disabled", fontWeight: 700 }}
            >
              Escolha um Jogo
            </Typography>
            {loadingGames ? (
              <Typography
                sx={{
                  px: 2,
                  py: 1,
                  color: "text.secondary",
                  fontSize: "0.8rem",
                }}
              >
                Carregando jogos...
              </Typography>
            ) : (
              games.map((game) => (
                <ListItem key={game.id} disablePadding>
                  <ListItemButton component={Link} to={`/game/${game.id}`}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Gamepad />
                    </ListItemIcon>
                    <ListItemText primary={game.name} />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </>
        ) : (
          /* Se ESTIVER em um jogo, mostra menuItems do jogo */
          <>
            {menuItems.map((item) => {
              const isActive = location.pathname.includes(item.path);
              const isDropdownOpen = !!openDropdowns[item.id];

              return (
                <Box key={item.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      component={item.isDropdown ? "div" : Link}
                      //@ts-ignore
                      to={item.isDropdown ? undefined : item.path}
                      onClick={
                        item.isDropdown ? toggleDropdown(item.id) : onClose
                      }
                      selected={isActive}
                      sx={{
                        py: 1.5,
                        borderLeft: isActive
                          ? "4px solid #ff4400"
                          : "4px solid transparent",
                        "&.Mui-selected": {
                          backgroundColor: "rgba(255, 68, 0, 0.08)",
                          "&:hover": {
                            backgroundColor: "rgba(255, 68, 0, 0.12)",
                          },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: isActive ? "primary.main" : "text.secondary",
                          minWidth: 40,
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? "primary.main" : "text.primary",
                        }}
                      />
                      {item.isDropdown &&
                        (isDropdownOpen ? <ExpandLess /> : <ExpandMore />)}
                    </ListItemButton>
                  </ListItem>

                  {item.isDropdown && item.options && (
                    <Collapse in={isDropdownOpen} timeout="auto" unmountOnExit>
                      <List
                        component="div"
                        disablePadding
                        sx={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
                      >
                        <ListItemButton
                          component={Link}
                          to={item.path}
                          onClick={onClose}
                          sx={{ pl: 7, py: 1 }}
                          selected={location.pathname === item.path}
                        >
                          <ListItemText
                            primary="Ver Todos"
                            primaryTypographyProps={{ fontSize: "0.875rem" }}
                          />
                        </ListItemButton>
                        {item.options.map((opt) => (
                          <ListItemButton
                            key={opt.path}
                            component={Link}
                            to={opt.path}
                            onClick={onClose}
                            sx={{ pl: 7, py: 1 }}
                            selected={location.pathname === opt.path}
                          >
                            <ListItemText
                              primary={opt.label}
                              primaryTypographyProps={{ fontSize: "0.875rem" }}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Collapse>
                  )}
                </Box>
              );
            })}
          </>
        )}
      </List>
    </Drawer>
  );
}
