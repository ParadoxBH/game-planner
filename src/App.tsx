import {
  CssBaseline,
  ThemeProvider,
} from "@mui/material";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { HashRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { RoutesPage } from "./RoutesPage";

import { theme } from "./theme/theme";
import { EventFilterProvider } from "./context/EventFilterContext";
import { queryClient } from "./api/queryClient";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline /> {/* Reseta o CSS padrão do navegador */}
        <EventFilterProvider>
          <HashRouter>
            <RoutesPage />
          </HashRouter>
        </EventFilterProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
