import { 
  Box, 
  Typography, 
  Grid, 
  Stack,
  CircularProgress
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useState, useMemo, useEffect } from "react";
import { StyledContainer } from "./common/StyledContainer";
import { RecipeCard } from "./recipes/RecipeCard";
import { PickSelector } from "./common/PickSelector";
import { MultiPickSelector } from "./common/MultiPickSelector";
import { Build } from "@mui/icons-material";
import type { GameDataTypes } from "../types/gameModels";

export function RecipesPage() {
  const { gameId, category: urlStation } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();

  const { loading: loadingApi, error: errorApi, getRecipesList, raw } = useApi(gameId);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSubStations, setAvailableSubStations] = useState<string[]>([]);
  const [excludedSubStations, setExcludedSubStations] = useState<string[]>([]);

  // Maps for details
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

  // Initial list to derive filters
  const allRecipes = useMemo(() => {
    const results = getRecipesList();
    return Array.isArray(results) ? results : results.data;
  }, [getRecipesList]);

  const stationsList = useMemo(() => {
    const stations = new Set<string>();
    allRecipes.forEach(recipe => {
      if (recipe.normalizedStations[0]) stations.add(recipe.normalizedStations[0]);
    });
    return Array.from(stations).sort();
  }, [allRecipes]);

  // Update available sub-stations when primary station changes
  useEffect(() => {
    const subs = new Set<string>();
    const currentPrimary = urlStation === "all" ? null : urlStation;
    
    allRecipes.forEach(recipe => {
      const primary = recipe.normalizedStations[0];
      if (!currentPrimary || (primary && primary.toLowerCase() === currentPrimary.toLowerCase())) {
        if (recipe.normalizedStations.length > 1) {
          recipe.normalizedStations.slice(1).forEach(s => subs.add(s));
        }
      }
    });

    const sortedSubs = Array.from(subs).sort();
    setAvailableSubStations(sortedSubs);
    // We NO LONGER auto-reset exclusions here
  }, [allRecipes, urlStation]);

  const filteredRecipes = useMemo(() => {
    const filters: any = {};
    
    if (urlStation && urlStation !== "all") {
      filters.normalizedStations = [urlStation];
    }

    // Add negation for excluded sub-stations
    if (excludedSubStations.length > 0) {
      if (!filters.normalizedStations) filters.normalizedStations = [];
      excludedSubStations.forEach(s => filters.normalizedStations.push(`!${s}`));
    }

    const results = getRecipesList({ filters });
    const list = Array.isArray(results) ? results : results.data;

    // Apply search client-side for now as it's more complex (multi-field)
    if (!searchTerm) return list;
    
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(recipe => 
      recipe.normalizedName.toLowerCase().includes(lowerSearch) || 
      recipe.id.toLowerCase().includes(lowerSearch) ||
      recipe.normalizedIngredients.some(i => i.id.toLowerCase().includes(lowerSearch) || (i.name && i.name.toLowerCase().includes(lowerSearch))) ||
      recipe.normalizedProducts.some(p => p.id.toLowerCase().includes(lowerSearch) || (p.name && p.name.toLowerCase().includes(lowerSearch)))
    );
  }, [getRecipesList, urlStation, excludedSubStations, searchTerm]);

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

  const selectedSubStations = availableSubStations.filter(s => !excludedSubStations.includes(s));

  const handleSubStationsChange = (selected: string[]) => {
    // Items in availableSubStations that are NOT in selected are now excluded
    const nowExcluded = availableSubStations.filter(s => !selected.includes(s));
    
    // Merge with existing exclusions that were NOT in current availableSubStations
    const otherExclusions = excludedSubStations.filter(s => !availableSubStations.includes(s));
    
    setExcludedSubStations([...otherExclusions, ...nowExcluded]);
  };

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
            value={urlStation === "all" ? null : urlStation || null}
            options={stationsList}
            onChange={(st) => {
              navigate(`/game/${gameId}/recipes/list/${st || "all"}`);
            }}
            allLabel="Todas Estações"
            icon={<Build sx={{ fontSize: 18 }} />}
          />
          {availableSubStations.length > 0 && (
            <MultiPickSelector
              label="Sub-estação"
              selectedOptions={selectedSubStations}
              options={availableSubStations}
              onChange={handleSubStationsChange}
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
