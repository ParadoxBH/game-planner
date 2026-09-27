import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Stack,
  Breadcrumbs,
  IconButton,
  Tooltip,
} from "@mui/material";
import { NavigateNext, Menu as MenuIcon } from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useGame } from "../api/useContent";
import { useNavigation } from "../hooks/useNavigation";
import { HeaderNavDropdown } from "./common/HeaderNavDropdown";
import { GlobalEventFilter } from "./common/GlobalEventFilter";
import { theme } from "../theme/theme";
import { usePlatform } from "../hooks/usePlatform";
import { useAutoCompact } from "../hooks/useAutoCompact";
import { MobileMenu } from "./common/MobileMenu";
import { AccountMenu } from "./auth/AccountMenu";

export function Header() {
  const location = useLocation();
  const pathParts = location.pathname.split("/").filter(Boolean);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isMobile } = usePlatform();

  // Basic heuristic: Se a rota for /game/:gameId/..., extrai o gameId
  const isGameRoute = pathParts[0] === "game" && pathParts.length >= 2;
  const gameId = isGameRoute ? pathParts[1] : null;

  const { menuItems } = useNavigation(gameId);
  const game = useGame(gameId ?? undefined);

  const toggleMobileMenu = (open: boolean) => () => {
    setMobileMenuOpen(open);
  };
  // Quando os botões não cabem com o texto, mostram só o ícone.
  const { compact, outerRef, innerRef } = useAutoCompact();

  return (
    <AppBar
      position="static"
      sx={{ backgroundColor: theme.palette.header, borderRadius: 0 }}
    >
      <Container maxWidth={false}>
        <Toolbar
          disableGutters
          sx={{
            minHeight: isMobile ? "auto" : undefined,
            justifyContent: "space-between",
          }}
        >
          <Stack alignItems={"center"} direction={"row"} overflow={"hidden"}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={toggleMobileMenu(true)}
                sx={{ mr: 2, display: { md: "none" } }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Breadcrumbs
              separator={<NavigateNext fontSize="small" color="primary" />}
              aria-label="breadcrumb"
              sx={{
                "& .MuiBreadcrumbs-separator": {
                  mx: { xs: 0.5, sm: 1 },
                },
              }}
            >
              <Link to="/" style={{ textDecoration: "none" }}>
                <Typography
                  variant="h6"
                  noWrap
                  component="div"
                  color="primary"
                  sx={{
                    fontWeight: "bold",
                    letterSpacing: 1,
                    fontSize: { xs: "0.9rem", sm: "1.25rem" },
                  }}
                >
                  Game Planner
                </Typography>
              </Link>
              {gameId && (
                <Link to={`/game/${gameId}`} style={{ textDecoration: "none" }}>
                  <Typography
                    variant="h6"
                    noWrap
                    component="div"
                    color="text.secondary"
                    sx={{
                      textTransform: "capitalize",
                      fontWeight: "bold",
                      fontSize: { xs: "0.9rem", sm: "1.25rem" },
                      maxWidth: { xs: "100px", sm: "none" },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {game.data?.name ?? gameId}
                  </Typography>
                </Link>
              )}
            </Breadcrumbs>
          </Stack>

          {/* Somente exibe abas extras se estiver dentro de um jogo */}
          {gameId && (
            <>
              <Stack
                ref={outerRef}
                direction={"row"}
                sx={{
                  mx: 2,
                  alignItems: "center",
                  overflow: "hidden",
                  justifyContent: "center",
                  flex: 1,
                  display: { xs: "none", md: "flex" },
                }}
              >
                <Stack ref={innerRef} direction={"row"} spacing={1} sx={{ width: "max-content", flexShrink: 0 }}>
                {menuItems.map((item) => {
                  if (item.isDropdown && item.options) {
                    return (
                      <HeaderNavDropdown
                        compact={compact}
                        key={item.id}
                        label={item.label}
                        icon={item.icon}
                        rootPath={item.path}
                        showAll={item.showAll}
                        options={item.options}
                      />
                    );
                  }

                  const isActive = location.pathname.includes(item.path);
                  if (compact)
                    return (
                      <Tooltip key={item.id} title={item.label} placement="bottom">
                        <Button
                          component={Link}
                          to={item.path}
                          sx={{
                            color: isActive ? "primary.main" : "white",
                            display: "flex",
                            textTransform: "none",
                            transition: "all 0.2s",
                            minWidth: "auto",
                            borderBottom: isActive
                              ? "2px solid #ff4400"
                              : "2px solid transparent",
                            borderRadius: 0,
                            "&:hover": {
                              color: "primary.main",
                              backgroundColor: "rgba(255, 255, 255, 0.05)",
                            },
                          }}
                        >
                          {item.icon}
                        </Button>
                      </Tooltip>
                    );
                  return (
                    <Button
                      key={item.id}
                      component={Link}
                      to={item.path}
                      startIcon={item.icon}
                      sx={{
                        color: isActive ? "primary.main" : "white",
                        display: "flex",
                        textTransform: "none",
                        transition: "all 0.2s",
                        borderBottom: isActive
                          ? "2px solid #ff4400"
                          : "2px solid transparent",
                        borderRadius: 0,
                        "&:hover": {
                          color: "primary.main",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                        },
                      }}
                    >
                      {item.label}
                    </Button>
                  );
                })}
                </Stack>
              </Stack>
            </>
          )}
          <Stack direction={"row"} alignItems={"center"} overflow={"hidden"}>
            {gameId && <GlobalEventFilter />}
            <AccountMenu />
          </Stack>
        </Toolbar>
      </Container>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={toggleMobileMenu(false)}
        gameId={gameId}
        menuItems={menuItems}
      />
    </AppBar>
  );
}
