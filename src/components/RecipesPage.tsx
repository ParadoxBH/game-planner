import { 
  Box, 
  Typography, 
  Grid, 
  Stack,
  CircularProgress
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useState, useMemo } from "react";
import { StyledContainer } from "./common/StyledContainer";
import { RecipeCard } from "./recipes/RecipeCard";
import { PickSelector } from "./common/PickSelector";
import { Build } from "@mui/icons-material";
import type { GameDataTypes } from "../types/gameModels";

export function RecipesPage() {
  const { gameId, category: urlStation } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();

  const { loading: loadingApi, error: errorApi, getRecipesList, raw } = useApi(gameId);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubStation, setSelectedSubStation] = useState<string | null>(null);

  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (raw?.items) raw.items.forEach(i => map.set(i.id, i));
    return map;
  }, [raw?.items]);

  const entitiesMap = useMemo(() => {
    const map = new Map<string, any>();
    if (raw?.entities) raw.entities.forEach(e => map.set(e.id, e));
    return map;
  }, [raw?.entities]);

  const getSourceData = (type: GameDataTypes | undefined, id: string): any => {
    if (type === 'entity') return entitiesMap.get(id);
    return itemsMap.get(id);
  };

  const eventsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (raw?.events) {
      raw.events.forEach(e => map.set(e.id, e.name));
    }
    return map;
  }, [raw?.events]);

  const normalizedRecipes = useMemo(() => getRecipesList(), [getRecipesList]);

  const stationsList = useMemo(() => {
    const stations = new Set<string>();
    normalizedRecipes.forEach(recipe => {
      if (recipe.normalizedStations[0]) stations.add(recipe.normalizedStations[0]);
    });
    return Array.from(stations).sort();
  }, [normalizedRecipes]);

  const subStations = useMemo(() => {
    const stations = new Set<string>();
    
    // Filter recipes that match the current primary station
    const relevantRecipes = normalizedRecipes.filter(recipe => {
      const primary = recipe.normalizedStations[0];
      return !urlStation || urlStation === "all" || (primary && primary.toLowerCase() === urlStation.toLowerCase());
    });

    relevantRecipes.forEach(recipe => {
      if (recipe.normalizedStations.length > 1) {
        recipe.normalizedStations.slice(1).forEach(s => stations.add(s));
      }
    });
    return Array.from(stations).sort();
  }, [normalizedRecipes, urlStation]);

  const filteredRecipes = useMemo(() => {
    return normalizedRecipes.filter(recipe => {
      const matchesSearch = recipe.normalizedName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            recipe.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            recipe.normalizedIngredients.some(i => i.id.toLowerCase().includes(searchTerm.toLowerCase()) || (i.name && i.name.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                            recipe.normalizedProducts.some(p => p.id.toLowerCase().includes(searchTerm.toLowerCase()) || (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const primaryStation = recipe.normalizedStations[0];
      const matchesStation = !urlStation || (primaryStation && primaryStation.toLowerCase() === urlStation.toLowerCase());
      
      const matchesSub = !selectedSubStation || (recipe.normalizedStations.length > 1 && recipe.normalizedStations.slice(1).some(s => s.toLowerCase() === selectedSubStation.toLowerCase()));

      return matchesSearch && matchesStation && matchesSub;
    });
  }, [normalizedRecipes, searchTerm, urlStation, selectedSubStation]);

  if (loadingApi) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (errorApi) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h6">Erro ao carregar receitas</Typography>
      </Box>
    );
  }

  return (
    <StyledContainer
      title={`Receitas de ${gameId}`}
      label="Descubra como fabricar todos os itens do jogo."
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar receitas, ingredientes..." }}
      actionsStart={
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <PickSelector
            label="Estação"
            value={urlStation || null}
            options={stationsList}
            onChange={(st) => {
              setSelectedSubStation(null);
              navigate(`/game/${gameId}/recipes/list/${st || ""}`);
            }}
            allLabel="Todas Estações"
            icon={<Build sx={{ fontSize: 18 }} />}
          />
          {subStations.length > 0 && (
            <PickSelector
              label="Sub-estação"
              value={selectedSubStation}
              options={subStations}
              onChange={setSelectedSubStation}
              allLabel="Todas"
              icon={<Build sx={{ fontSize: 18 }} />}
            />
          )}
        </Stack>
      }
    >
      {filteredRecipes.length > 0 ? (
        <Grid container spacing={3}>
          {filteredRecipes.map(recipe => (
            <Grid size={{ xs: 12, lg: 4 }} key={recipe.id}>
              <RecipeCard
                id={recipe.id}
                name={recipe.normalizedName}
                stations={recipe.normalizedStations}
                ingredients={recipe.normalizedIngredients}
                products={recipe.normalizedProducts}
                unlock={recipe.unlock}
                getSourceData={getSourceData}
                eventsMap={eventsMap}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Stack sx={{ flex: 1, textAlign: 'center', py: 8, alignItems: "center", justifyContent: "center" }}>
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
            Nenhuma receita encontrada com estes filtros.
          </Typography>
        </Stack>
      )}
    </StyledContainer>
  );
}
