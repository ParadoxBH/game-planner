import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Stack,
} from "@mui/material";
import {
  Explore,
  MenuBook,
  Construction,
  Map,
  Pets,
  Assignment,
} from "@mui/icons-material";
import { Link } from 'react-router-dom';

const navItems = [
  //{ label: 'Guias', path: "guide", icon: <MenuBook /> },
  { label: "Mapa", path: "map", icon: <Map /> },
  //{ label: 'Itens', path: "itens", icon: <Construction /> },
  //{ label: 'Monstros', path: "enemys", icon: <Pets /> },
  //{ label: 'Quests', path: "quests", icon: <Assignment /> },
  //{ label: 'Receitas', path: "recipes", icon: <Explore /> },
];

export function Header() {
  return (
    <AppBar position="static" sx={{ backgroundColor: "#1a1a1a" }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Stack sx={{ flexGrow: 1 }} alignItems={"start"}>
            {/* LOGO */}
            <Typography
              variant="h6"
              noWrap
              component="div"
              color="primary"
              sx={{ fontWeight: "bold", letterSpacing: 1 }}
            >
              Game Planner
            </Typography>
          </Stack>

          {/* LINKS DE NAVEGAÇÃO */}
          <Box sx={{ display: { xs: "none", md: "flex" } }}>
            {navItems.map((item) => (
              <Button
                key={item.label}
                component={Link} // O botão do MUI agora se comporta como um Link
                to={item.path}   // Ex: "/mapa"
                startIcon={item.icon}
                sx={{ my: 2, color: "white", display: "flex", mx: 1 }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
