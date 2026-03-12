import { Navigate, Route, Routes } from "react-router-dom";
import { MapView } from "./components/MapView";
import { Home } from "./components/Home";
import { MainLayout } from "./layouts/MainLayout";
import { GameDashboard } from "./components/GameDashboard";
import { ItemsPage } from "./components/ItemsPage";
import { RecipesPage } from "./components/RecipesPage";
import { EntityPage } from "./components/EntityPage";
import { ShopsPage } from "./components/ShopsPage";
import { EventsPage } from "./components/EventsPage";
import { CodesPage } from "./components/CodesPage";
import { Typography } from "@mui/material";

export function RoutesPage() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Rota Inicial (Seleção de Jogo) */}
        <Route path="/" element={<Home />} />

        {/* Rotas de um jogo específico */}
        <Route path="/game/:gameId">
          <Route index element={<GameDashboard />} />
          <Route path="map" element={<MapView />} />

          {/* Placeholders adicionais baseados nos novos botões da Header */}
          <Route path="items" element={<ItemsPage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="entity/:category?" element={<EntityPage />} />
          <Route path="shops" element={<ShopsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="codes" element={<CodesPage />} />
          <Route path="quests" element={<Typography p={4} variant="h4">Lista de Missões (Em Breve)</Typography>} />
        </Route>

        {/* Redirecionar rotas inexistentes para a home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
