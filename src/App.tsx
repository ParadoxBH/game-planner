import React from "react";
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
  Typography,
  Stack,
} from "@mui/material";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { Header } from "./components/Header";
import { BrowserRouter } from "react-router-dom";
import { RoutesPage } from "./RoutesPage";

// Definindo um tema escuro para o "clima" de Wiki de Jogo
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#ff4400" }, // Um laranja vivo para destaque
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline /> {/* Reseta o CSS padrão do navegador */}
      <BrowserRouter> {/* O roteador precisa envolver tudo */}
      <Stack sx={{position: "absolute", left: 0, top: 0, right: 0, bottom: 0}}>
        <Header />
        <Box display={"flex"} flex={1}>
         <RoutesPage/>
        </Box>
      </Stack>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
