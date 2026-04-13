import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Stack,
  Breadcrumbs,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Divider,
} from "@mui/material";
import {
  NavigateNext,
  Menu as MenuIcon,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import { Link, useLocation } from 'react-router-dom';
import { useState } from "react";
import { useNavigation } from "../hooks/useNavigation";
import { HeaderNavDropdown } from "./common/HeaderNavDropdown";
import { GlobalEventFilter } from "./common/GlobalEventFilter";
import { theme } from "../theme/theme";
import { usePlatform } from "../hooks/usePlatform";

export function Header() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const { isMobile } = usePlatform();

  // Basic heuristic: Se a rota for /game/:gameId/..., extrai o gameId
  const isGameRoute = pathParts[0] === 'game' && pathParts.length >= 2;
  const gameId = isGameRoute ? pathParts[1] : null;

  const { menuItems } = useNavigation(gameId);

  const toggleMobileMenu = (open: boolean) => () => {
    setMobileMenuOpen(open);
  };

  const toggleDropdown = (id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdowns(prev => ({ ...prev, [id]: !prev[id] }));
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
                  {/* Abreviação no mobile se estiver em um jogo */}
                  {isMobile ? "GP" : "Game Planner"}
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

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={toggleMobileMenu(false)}
        PaperProps={{
          sx: {
            width: 280,
            backgroundColor: '#0d0d0d',
            backgroundImage: 'none',
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
            Game Planner
          </Typography>
        </Box>
        <Divider />
        <List sx={{ pt: 0 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname.includes(item.path);
            const isDropdownOpen = !!openDropdowns[item.id];

            return (
              <Box key={item.id}>
                <ListItem disablePadding>
                  <ListItemButton 
                    component={item.isDropdown ? 'div' : Link}
                    //@ts-ignore
                    to={item.isDropdown ? undefined : item.path}
                    onClick={item.isDropdown ? toggleDropdown(item.id) : toggleMobileMenu(false)}
                    selected={isActive}
                    sx={{
                      py: 1.5,
                      borderLeft: isActive ? '4px solid #ff4400' : '4px solid transparent',
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255, 68, 0, 0.08)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 68, 0, 0.12)',
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'text.secondary', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label} 
                      primaryTypographyProps={{ 
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'primary.main' : 'text.primary'
                      }} 
                    />
                    {item.isDropdown && (isDropdownOpen ? <ExpandLess /> : <ExpandMore />)}
                  </ListItemButton>
                </ListItem>
                
                {item.isDropdown && item.options && (
                  <Collapse in={isDropdownOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <ListItemButton 
                        component={Link}
                        to={item.path}
                        onClick={toggleMobileMenu(false)}
                        sx={{ pl: 7, py: 1 }}
                        selected={location.pathname === item.path}
                      >
                        <ListItemText primary="Ver Todos" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                      </ListItemButton>
                      {item.options.map((opt) => (
                        <ListItemButton 
                          key={opt.path}
                          component={Link}
                          to={opt.path}
                          onClick={toggleMobileMenu(false)}
                          sx={{ pl: 7, py: 1 }}
                          selected={location.pathname === opt.path}
                        >
                          <ListItemText primary={opt.label} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </List>
      </Drawer>
    </AppBar>
  );
}

