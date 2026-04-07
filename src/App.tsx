import {
  CssBaseline,
  ThemeProvider,
} from "@mui/material";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { BrowserRouter } from "react-router-dom";
import { RoutesPage } from "./RoutesPage";

import { theme } from "./theme/theme";
import { EventFilterProvider } from "./context/EventFilterContext";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Reseta o CSS padrão do navegador */}
      <EventFilterProvider>
        <BrowserRouter>
            <RoutesPage />
        </BrowserRouter>
      </EventFilterProvider>
    </ThemeProvider>
  );
}

export default App;
