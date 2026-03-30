import { 
  Box, 
  Typography, 
  Stack,
  CircularProgress
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { useState, useMemo, useEffect } from "react";
import { StyledContainer } from "../common/StyledContainer";
import { RecipeCard } from "./RecipeCard";
import { PickSelector } from "../common/PickSelector";
import { TriplePickSelector } from "../common/TriplePickSelector";
import type { TripleState } from "../common/TriplePickSelector";
import { Build, Science } from "@mui/icons-material";
import type { GameDataTypes } from "../../types/gameModels";
import { ListingDataView } from "../common/ListingDataView";
import { Tooltip, Chip } from "@mui/material";
import { TimeChip } from "../common/TimeChip";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { useViewMode } from "../../hooks/useViewMode";

export function RecipesPage() {
  const { gameId, category: urlStation } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();

  const { loading: loadingApi, error: errorApi, getRecipesList, raw } = useApi(gameId);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useViewMode("recipes");
  const [availableSubStations, setAvailableSubStations] = useState<string[]>([]);
  const [subStationStates, setSubStationStates] = useState<Record<string, TripleState>>({});

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

    // Clean up states for stations that are no longer available
    setSubStationStates(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(st => {
        if (!subs.has(st)) {
          delete next[st];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [allRecipes, urlStation]);

  const filteredRecipes = useMemo(() => {
    const filters: any = {};
    
    if (urlStation && urlStation !== "all") {
      filters.normalizedStations = [urlStation];
    }

    // Add inclusion/negation for sub-station states
    Object.entries(subStationStates).forEach(([st, state]) => {
      if (state === "indifferent") return;
      if (!filters.normalizedStations) filters.normalizedStations = [];
      filters.normalizedStations.push(state === "exclude" ? `!${st}` : st);
    });

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
  }, [getRecipesList, urlStation, subStationStates, searchTerm]);

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

  const handleSubStationStateChange = (option: string, newState: TripleState) => {
    setSubStationStates(prev => ({
      ...prev,
      [option]: newState
    }));
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
            onChange={(st: string | null) => {
              navigate(`/game/${gameId}/recipes/list/${st || "all"}`);
            }}
            allLabel="Todas Estações"
            icon={<Build sx={{ fontSize: 18 }} />}
          />
          {availableSubStations.length > 0 && (
            <TriplePickSelector
              label="Sub-estação"
              states={subStationStates}
              options={availableSubStations}
              onChange={handleSubStationStateChange}
              icon={<Build sx={{ fontSize: 18 }} />}
            />
          )}
        </Stack>
      }
      actionsEnd={
        <ViewModeSelector mode={viewMode} onChange={setViewMode} />
      }
    >
      <ListingDataView
        data={filteredRecipes}
        viewMode={viewMode}
        variant="compact"
        cardMinWidth={200}
        listHeader={[
          { label: "Receita / Produto", width: "30%" },
          { label: "Tempo / Ingredientes", width: "40%" },
          { label: "Bancadas", width: "15%" },
          { label: "Desbloqueio", align: "right" as const, width: "15%" },
        ]}
        emptyMessage="Nenhuma receita encontrada com estes filtros."
        renderCard={(recipe: any, variant) => (
          <RecipeCard
            id={recipe.id}
            name={recipe.normalizedName}
            stations={recipe.normalizedStations}
            ingredients={recipe.normalizedIngredients}
            products={recipe.normalizedProducts}
            unlock={recipe.unlock}
            getSourceData={getSourceData}
            eventsMap={eventsMap}
            craftTime={recipe.craftTime}
            variant={variant}
          />
        )}
        renderListItem={(recipe: any) => {
          const mainProduct = recipe.normalizedProducts[0];
          const productData = mainProduct ? getSourceData(mainProduct.type, mainProduct.id) : null;
          
          return [
            <Box 
              onClick={() => navigate(`/game/${gameId}/recipes/view/${recipe.id}`)}
              sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}
            >
              <Box sx={{ width: 32, height: 32, borderRadius: 0.5, backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                {productData?.icon ? (
                  <img src={productData.icon} alt={recipe.normalizedName} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                ) : (
                  <Science sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.2)' }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{recipe.normalizedName}</Typography>
            </Box>,

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {recipe.craftTime && recipe.craftTime > 0 && (
                <TimeChip seconds={recipe.craftTime} />
              )}
              {recipe.normalizedIngredients.map((ing: any, i: number) => {
                const ingData = getSourceData(ing.type, ing.id);
                return (
                  <Tooltip key={i} title={`${ingData?.name || ing.id} x${ing.amount}`}>
                    <Box sx={{ 
                      width: 24, height: 24, 
                      borderRadius: 0.5, 
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      position: 'relative'
                    }}>
                      <img src={ingData?.icon} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      {ing.amount > 1 && (
                        <Typography sx={{ 
                          position: 'absolute', bottom: -2, right: -2, 
                          fontSize: '0.5rem', fontWeight: 900, color: 'white',
                          textShadow: '0 0 2px black',
                          backgroundColor: 'secondary.main',
                          borderRadius: '50%',
                          width: 12, height: 12,
                          display: 'flex', justifyContent: 'center', alignItems: 'center'
                        }}>{ing.amount}</Typography>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>,

            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {recipe.normalizedStations.filter(Boolean).map((station: string) => (
                <Chip key={station} label={station} size="small" sx={{ height: 18, fontSize: '0.6rem', backgroundColor: 'rgba(255,255,255,0.05)' }} />
              ))}
            </Box>,

            <Typography variant="caption" sx={{ textAlign: 'right', display: 'block', color: 'text.secondary', fontWeight: 700 }}>
              {recipe.unlock && recipe.unlock.length > 0 ? recipe.unlock[0].value : '-'}
            </Typography>
          ];
        }}
        renderIconItem={(recipe: any) => {
          const mainProduct = recipe.normalizedProducts[0];
          const productData = mainProduct ? getSourceData(mainProduct.type, mainProduct.id) : null;

          return (
            <Tooltip title={`${recipe.normalizedName} (${recipe.id})`}>
              <Box 
                onClick={() => navigate(`/game/${gameId}/recipes/view/${recipe.id}`)}
                sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1 }}
              >
                {productData?.icon ? (
                  <img src={productData.icon} alt={recipe.normalizedName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <Science sx={{ fontSize: 32, color: 'rgba(255, 255, 255, 0.2)' }} />
                )}
              </Box>
            </Tooltip>
          );
        }}
      />
    </StyledContainer>
  );
}
