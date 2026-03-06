import {
  CssBaseline,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import "./App.css";
import "leaflet/dist/leaflet.css";
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
      <BrowserRouter>
          <RoutesPage />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
