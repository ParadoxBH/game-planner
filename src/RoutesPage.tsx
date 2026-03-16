import { Navigate, Route, Routes } from "react-router-dom";
import { MapView } from "./components/MapView";
import { Home } from "./components/Home";
import { MainLayout } from "./layouts/MainLayout";
import { GameDashboard } from "./components/GameDashboard";
import { ItemsPage } from "./components/item/ItemsPage";
import { RecipesPage } from "./components/recipe/RecipesPage";
import { EntityPage } from "./components/entity/EntityPage";
import { EntityDetailsPage } from "./components/entity/EntityDetailsPage";
import { ShopsPage } from "./components/shop/ShopsPage";
import { EventsPage } from "./components/event/EventsPage";
import { EventDetailsPage } from "./components/event/EventDetailsPage";
import { CodesPage } from "./components/CodesPage";
import { CalculatorPage } from "./components/calculator/CalculatorPage";
import { CraftingCalculator } from "./components/calculator/CraftingCalculator";
import { ProfitabilityCalculator } from "./components/calculator/ProfitabilityCalculator";
import { ProfitPerTimeCalculator } from "./components/calculator/ProfitPerTimeCalculator";
import { ItemDetailsPage } from "./components/item/ItemDetailsPage";
import { RecipeDetailsPage } from "./components/recipe/RecipeDetailsPage";
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
          <Route path="items/list/:category?" element={<ItemsPage />} />
          <Route path="items/view/:itemId" element={<ItemDetailsPage />} />
          <Route path="recipes/list/:category?" element={<RecipesPage />} />
          <Route path="recipes/view/:recipeId" element={<RecipeDetailsPage />} />
          <Route path="entity/list/:category?" element={<EntityPage />} />
          <Route path="entity/view/:entityId" element={<EntityDetailsPage />} />
          <Route path="shops/list/:category?" element={<ShopsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/view/:eventId" element={<EventDetailsPage />} />
          <Route path="codes" element={<CodesPage />} />
          <Route path="calculator">
            <Route index element={<CalculatorPage />} />
            <Route path="crafting" element={<CraftingCalculator />} />
            <Route path="profitability" element={<ProfitabilityCalculator />} />
            <Route path="profit-per-time" element={<ProfitPerTimeCalculator />} />
          </Route>
          <Route path="quests" element={<Typography p={4} variant="h4">Lista de Missões (Em Breve)</Typography>} />
        </Route>

        {/* Redirecionar rotas inexistentes para a home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
