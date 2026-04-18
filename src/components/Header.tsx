import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Stack,
  Breadcrumbs,
  IconButton,
  Box,
} from "@mui/material";
import {
  NavigateNext,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { Link, useLocation } from 'react-router-dom';
import { useState } from "react";
import { useNavigation } from "../hooks/useNavigation";
import { HeaderNavDropdown } from "./common/HeaderNavDropdown";
import { GlobalEventFilter } from "./common/GlobalEventFilter";
import { theme } from "../theme/theme";
import { usePlatform } from "../hooks/usePlatform";
import { RemmaperObj } from "../utils/mapper";
import { MobileMenu } from "./common/MobileMenu";

export function Header() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isMobile } = usePlatform();

  // Basic heuristic: Se a rota for /game/:gameId/..., extrai o gameId
  const isGameRoute = pathParts[0] === 'game' && pathParts.length >= 2;
  const gameId = isGameRoute ? pathParts[1] : null;

  const { menuItems } = useNavigation(gameId);

  const toggleMobileMenu = (open: boolean) => () => {
    setMobileMenuOpen(open);
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: theme.palette.header, borderRadius: 0 }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{minHeight: isMobile ? "auto" : undefined}}>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={toggleMobileMenu(true)}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Stack sx={{ flexGrow: 1 }} alignItems={"start"}>
            <Breadcrumbs 
              separator={<NavigateNext fontSize="small" color="primary" />} 
              aria-label="breadcrumb"
              sx={{
                '& .MuiBreadcrumbs-separator': {
                  mx: { xs: 0.5, sm: 1 }
                }
              }}
            >
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Typography
                  variant="h6"
                  noWrap
                  component="div"
                  color="primary"
                  sx={{ 
                    fontWeight: "bold", 
                    letterSpacing: 1,
                    fontSize: { xs: '0.9rem', sm: '1.25rem' }
                  }}
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
                    sx={{ 
                      textTransform: 'capitalize', 
                      fontWeight: "bold",
                      fontSize: { xs: '0.9rem', sm: '1.25rem' },
                      maxWidth: { xs: '100px', sm: 'none' },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {gameId}
                  </Typography>
                </Link>
              )}
            </Breadcrumbs>
          </Stack>

          {!gameId && <RemmaperObj/>}
          {/* Somente exibe abas extras se estiver dentro de um jogo */}
          {gameId && (
            <>
              <Stack direction={"row"} sx={{ alignItems: 'center', display: { xs: 'none', md: 'flex' } }}>
                {menuItems.map((item) => {
                  if (item.isDropdown && item.options) {
                    return (
                      <HeaderNavDropdown 
                        key={item.id}
                        label={item.label} 
                        icon={item.icon} 
                        rootPath={item.path} 
                        options={item.options} 
                      />
                    );
                  }

                  const isActive = location.pathname.includes(item.path);

                  return (
                    <Button
                      key={item.id}
                      component={Link} 
                      to={item.path}
                      startIcon={item.icon}
                      sx={{ 
                        color: isActive ? "primary.main" : "white",
                        display: "flex", 
                        textTransform: 'none',
                        transition: 'all 0.2s',
                        borderBottom: isActive ? '2px solid #ff4400' : '2px solid transparent',
                        borderRadius: 0,
                        '&:hover': {
                          color: 'primary.main',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        }
                      }}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </Stack>
              <GlobalEventFilter />
            </>
          )}
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

