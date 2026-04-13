import { 
  Box, 
  Typography, 
  Stack,
  CircularProgress,
  Tooltip,
  Chip
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
import type { GameDataTypes, Item, Entity, GameEvent } from "../../types/gameModels";
import type { NormalizedRecipe, PaginatedResponse } from "../../types/apiModels";
import { ListingDataView } from "../common/ListingDataView";
import { TimeChip } from "../common/TimeChip";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { useViewMode } from "../../hooks/useViewMode";
import { itemRepository } from "../../repositories/ItemRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { eventRepository } from "../../repositories/EventRepository";
import { categoryRepository } from "../../repositories/CategoryRepository";
import { usePagination } from "../../hooks/usePagination";
import type { RecipeCriteria } from "../../types/filterTypes";
import type { Category } from "../../types/gameModels";

export function RecipesPage() {
  const { gameId, category: urlStation } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();

  const { 
    loading: dbLoading, 
    error: errorApi, 
    getRecipesList, 
    getRecipeStations 
  } = useApi(gameId);

  const [recipesResponse, setRecipesResponse] = useState<PaginatedResponse<NormalizedRecipe> | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [viewMode, setViewMode] = useViewMode("recipes");
  const [allStations, setAllStations] = useState<string[]>([]);
  const [availableSubStations, setAvailableSubStations] = useState<string[]>([]);

  const pages = usePagination<RecipeCriteria>({
    primaryStation: urlStation || "all",
    subStationStates: {},
  });

  // Sync URL Category to filter
  useEffect(() => {
    pages.setCriteria({
      primaryStation: urlStation || "all",
      subStationStates: {}
    });
  }, [urlStation]);

  // Fetch static mappings and stations list
  useEffect(() => {
    if (dbLoading) return;
    itemRepository.getAll().then(setItems);
    entityRepository.getAll().then(setEntities);
    eventRepository.getAll().then(setEvents);
    categoryRepository.getAll().then(setCategories);
    getRecipeStations().then(setAllStations);
  }, [dbLoading, getRecipeStations]);

  // Load paginated recipes
  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    getRecipesList(pages.info)
      .then((results) => {
        if (!isMounted) return;
        setRecipesResponse(results);
        pages.setTotalItems(results.total);
        setDataLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching recipes:", err);
        if (isMounted) setDataLoading(false);
      });

    return () => { isMounted = false; };
  }, [dbLoading, getRecipesList, pages.info]);

  const recipes = useMemo(() => recipesResponse?.data || [], [recipesResponse]);

  // Derived data for details
  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach(i => map.set(i.id.toLowerCase(), i));
    return map;
  }, [items]);

  const entitiesMap = useMemo(() => {
    const map = new Map<string, any>();
    entities.forEach(e => map.set(e.id.toLowerCase(), e));
    return map;
  }, [entities]);

  const getSourceData = (type: GameDataTypes | undefined, id: string): any => {
    if (type === 'entity') return entitiesMap.get(id.toLowerCase());
    return itemsMap.get(id.toLowerCase());
  };

  const eventsMap = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach(e => map.set(e.id, e.name));
    return map;
  }, [events]);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach(c => map.set(c.id.toLowerCase(), c));
    return map;
  }, [categories]);

  const resolveStation = (stationId: string) => {
    const normalizedStation = stationId.toLowerCase();
    const relatedEntities = entities.filter(e => {
      const cats = Array.isArray(e.category) ? e.category : [e.category];
      return cats.some(c => c && c.toLowerCase() === normalizedStation);
    });

    if (relatedEntities.length === 1) {
      return { 
        value: stationId, 
        label: relatedEntities[0].name,
        icon: relatedEntities[0].icon,
        entityId: relatedEntities[0].id
      };
    }

    const cat = categoriesMap.get(normalizedStation);
    if (cat) {
      return {
        value: stationId,
        label: cat.name,
        icon: cat.icon
      };
    }

    return { 
      value: stationId, 
      label: stationId,
      icon: undefined
    };
  };

  // Update available sub-stations based on current results
  useEffect(() => {
    const subs = new Set<string>();
    const currentPrimary = urlStation === "all" ? null : urlStation;
    
    recipes.forEach(recipe => {
      const primary = recipe.normalizedStations[0];
      if (!currentPrimary || (primary && primary.toLowerCase() === currentPrimary.toLowerCase())) {
        if (recipe.normalizedStations.length > 1) {
          recipe.normalizedStations.slice(1).forEach(s => { if (s) subs.add(s); });
        }
      }
    });

    setAvailableSubStations(Array.from(subs).sort());
  }, [recipes, urlStation]);

  const handleSubStationStateChange = (option: string, newState: TripleState) => {
    const nextSub = { ...pages.info.criteria.subStationStates, [option]: newState };
    pages.setCriteria({ subStationStates: nextSub });
  };

  const stationOptions = useMemo(() => {
    return allStations.map(station => resolveStation(station));
  }, [allStations, entities, categoriesMap]);

  const subStationOptions = useMemo(() => {
    return availableSubStations.map(station => resolveStation(station));
  }, [availableSubStations, entities, categoriesMap]);

  return (
    <StyledContainer
      title={`Receitas de ${gameId}`}
      label="Descubra como fabricar todos os itens do jogo."
      searchValue={pages.info.search}
      onChangeSearch={(val) => pages.setSearch(val)}
      search={{ placeholder: "Pesquisar receitas, ingredientes..." }}
      pages={pages}
      actionsStart={
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <PickSelector
            label="Estação"
            value={urlStation === "all" ? null : urlStation || null}
            options={stationOptions}
            onChange={(st: string | null) => {
              navigate(`/game/${gameId}/recipes/list/${st || "all"}`);
            }}
            allLabel="Todas Estações"
            icon={<Build sx={{ fontSize: 18 }} />}
          />
          {availableSubStations.length > 0 && (
            <TriplePickSelector
              label="Sub-estação"
              states={pages.info.criteria.subStationStates || {}}
              options={subStationOptions}
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
      {(dbLoading || dataLoading) ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : errorApi ? (
        <Box sx={{ p: 4, textAlign: "center", flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Erro ao carregar receitas
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            {errorApi}
          </Typography>
        </Box>
      ) : (
        <ListingDataView
          data={recipes}
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
              entities={entities}
              categories={categories}
            />
          )}
          renderListItem={(recipe: any) => {
            const mainProduct = recipe.normalizedProducts[0];
            const productData = mainProduct ? getSourceData(mainProduct.type, mainProduct.id) : null;
            
            return [
              <Box 
                key={`recipe_view_${recipe.id}`}
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

              <Box key={`recipe_ing_${recipe.id}`} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
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

              <Box key={`recipe_stations_${recipe.id}`} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {recipe.normalizedStations.filter(Boolean).map((station: string) => {
                  const resolved = resolveStation(station);
                  const targetUrl = resolved.entityId 
                    ? `/game/${gameId}/entity/view/${resolved.entityId}`
                    : `/game/${gameId}/entity/list/all?subCategory=${station}`;

                  return (
                    <Chip 
                      key={station} 
                      label={resolved.label} 
                      size="small" 
                      icon={resolved.icon ? (
                        <Box component="img" src={resolved.icon} sx={{ width: 12, height: 12, objectFit: 'contain' }} />
                      ) : undefined} 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(targetUrl);
                      }}
                      sx={{ 
                        height: 18, 
                        fontSize: '0.6rem', 
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          borderColor: 'primary.main',
                        }
                      }} 
                    />
                  );
                })}
              </Box>,

              <Typography key={`recipe_unlock_${recipe.id}`} variant="caption" sx={{ textAlign: 'right', display: 'block', color: 'text.secondary', fontWeight: 700 }}>
                {recipe.unlock && recipe.unlock.length > 0 ? recipe.unlock[0].value : '-'}
              </Typography>
            ];
          }}
          renderIconItem={(recipe: any) => {
            const mainProduct = recipe.normalizedProducts[0];
            const productData = mainProduct ? getSourceData(mainProduct.type, mainProduct.id) : null;

            return (
              <Tooltip key={`recipe_icon_${recipe.id}`} title={`${recipe.normalizedName} (${recipe.id})`}>
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
      )}
    </StyledContainer>
  );
}
