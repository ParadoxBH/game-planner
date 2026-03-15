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
  NavigateNext,
} from "@mui/icons-material";
import { Link, useLocation } from 'react-router-dom';
import { useNavigation } from "../hooks/useNavigation";
import { HeaderNavDropdown } from "./common/HeaderNavDropdown";
import { theme } from "../theme/theme";

export function Header() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  // Basic heuristic: Se a rota for /game/:gameId/..., extrai o gameId
  const isGameRoute = pathParts[0] === 'game' && pathParts.length >= 2;
  const gameId = isGameRoute ? pathParts[1] : null;

  const { menuItems } = useNavigation(gameId);

  return (
    <AppBar position="static" sx={{ backgroundColor: theme.palette.header }}>
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
                      my: 2, 
                      color: isActive ? "primary.main" : "white", 
                      display: "flex", 
                      mx: 1,
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
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
