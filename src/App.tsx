import {
  CssBaseline,
  ThemeProvider,
} from "@mui/material";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { BrowserRouter } from "react-router-dom";
import { RoutesPage } from "./RoutesPage";

import { theme } from "./theme/theme";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Reseta o CSS padrão do navegador */}
      <BrowserRouter>
          <RoutesPage />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
