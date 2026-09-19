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
import { ExpandLess, ExpandMore, Home, Gamepad, ArrowBack } from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
import { useState, useMemo } from "react";
import type { GameInfo } from "../../api/content";
import { gameImage, isComingSoon, readAccessLog, recordAccess } from "../../api/games";
import { useGame, useGames } from "../../api/useContent";
import type { NavigationItem } from "../../hooks/useNavigation";
import { isDev } from "../../utils/mapper";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  gameId: string | null;
  menuItems: NavigationItem[];
}

function GameIcon({ game, faded = false }: { game: GameInfo; faded?: boolean }) {
  const icon = gameImage(game, ["icon"], "icon");
  return icon ? (
    <Box component="img" src={icon} sx={{ width: 24, height: 24, objectFit: "contain", opacity: faded ? 0.3 : 1 }} />
  ) : (
    <Gamepad sx={{ opacity: faded ? 0.3 : 1 }} />
  );
}

export function MobileMenu({ open, onClose, gameId, menuItems }: MobileMenuProps) {
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const games = useGames(!gameId);
  const game = useGame(gameId ?? undefined);

  const toggleDropdown = (id: string) => (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDropdowns((previous) => ({ ...previous, [id]: !previous[id] }));
  };

  const accessLog = useMemo(() => readAccessLog(), [open]);

  const sortedGames = useMemo(() => {
    const list = games.data ?? [];
    return {
      available: list.filter((item) => !isComingSoon(item)).sort((a, b) => (accessLog[b.id] || 0) - (accessLog[a.id] || 0)),
      comingSoon: list.filter(isComingSoon),
    };
  }, [games.data, accessLog]);

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 280, backgroundColor: "#0d0d0d", backgroundImage: "none" } }}
    >
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Stack direction={"row"} alignItems={"center"} justifyContent={"space-between"}>
          <Stack direction={"column"}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: "bold" }}>
              Game Planner
            </Typography>
            {gameId && (
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                {game.data?.name ?? gameId}
              </Typography>
            )}
          </Stack>
          {!!gameId && (
            <IconButton component={Link} to="/">
              <ArrowBack />
            </IconButton>
          )}
        </Stack>
      </Box>
      <Divider sx={{ opacity: 0.1 }} />

      <List sx={{ pt: 0 }}>
        {!gameId ? (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/" selected={location.pathname === "/"}>
                <ListItemIcon sx={{ minWidth: 40, color: "primary.main" }}>
                  <Home />
                </ListItemIcon>
                <ListItemText primary="Início" />
              </ListItemButton>
            </ListItem>
            <Divider sx={{ my: 1, opacity: 0.05 }} />
            <Typography variant="overline" sx={{ px: 2, color: "text.disabled", fontWeight: 700 }}>
              Escolha um jogo
            </Typography>
            {games.isPending ? (
              <Typography sx={{ px: 2, py: 1, color: "text.secondary", fontSize: "0.8rem" }}>Carregando jogos...</Typography>
            ) : (
              <>
                {sortedGames.available.map((item) => (
                  <ListItem key={item.id} disablePadding>
                    <ListItemButton
                      component={Link}
                      to={`/game/${item.id}`}
                      onClick={() => {
                        recordAccess(item.id);
                        onClose();
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <GameIcon game={item} />
                      </ListItemIcon>
                      <ListItemText primary={item.name} />
                    </ListItemButton>
                  </ListItem>
                ))}

                {sortedGames.comingSoon.length > 0 && (
                  <>
                    <Divider sx={{ my: 1, opacity: 0.05 }} />
                    <Typography variant="overline" sx={{ px: 2, color: "text.disabled", fontWeight: 700 }}>
                      Em breve
                    </Typography>
                    {sortedGames.comingSoon.map((item) => (
                      <ListItem key={item.id} disablePadding>
                        <ListItemButton component={Link} to={`/game/${item.id}`} disabled={!isDev()} onClick={onClose}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <GameIcon game={item} faded />
                          </ListItemIcon>
                          <ListItemText primary={item.name} primaryTypographyProps={{ sx: { opacity: 0.5 } }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        ) : (
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
                      onClick={item.isDropdown ? toggleDropdown(item.id) : onClose}
                      selected={isActive}
                      sx={{
                        py: 1.5,
                        borderLeft: isActive ? "4px solid #ff4400" : "4px solid transparent",
                        "&.Mui-selected": {
                          backgroundColor: "rgba(255, 68, 0, 0.08)",
                          "&:hover": { backgroundColor: "rgba(255, 68, 0, 0.12)" },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ color: isActive ? "primary.main" : "text.secondary", minWidth: 40 }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontWeight: isActive ? 700 : 500, color: isActive ? "primary.main" : "text.primary" }}
                      />
                      {item.isDropdown && (isDropdownOpen ? <ExpandLess /> : <ExpandMore />)}
                    </ListItemButton>
                  </ListItem>

                  {item.isDropdown && item.options && (
                    <Collapse in={isDropdownOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding sx={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}>
                        {item.showAll !== false && (
                          <ListItemButton
                            component={Link}
                            to={item.path}
                            onClick={onClose}
                            sx={{ pl: 7, py: 1 }}
                            selected={location.pathname === item.path}
                          >
                            <ListItemText primary="Ver todos" primaryTypographyProps={{ fontSize: "0.875rem" }} />
                          </ListItemButton>
                        )}
                        {item.options.map((option) => (
                          <ListItemButton
                            key={option.path}
                            component={Link}
                            to={option.path}
                            onClick={onClose}
                            sx={{ pl: 7, py: 1 }}
                            selected={location.pathname === option.path}
                          >
                            <ListItemText primary={option.label} primaryTypographyProps={{ fontSize: "0.875rem" }} />
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
