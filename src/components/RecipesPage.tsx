import { 
  Box, 
  Typography, 
  Grid, 
  Chip, 
  Stack,
  CircularProgress
} from "@mui/material";
import { useParams } from "react-router-dom";
import { useGameData } from "../hooks/useGameData";
import { useState, useMemo } from "react";
import { StyledContainer } from "./common/StyledContainer";
import { RecipeCard, type RecipeIngredient, type RecipeProduct, type RecipeUnlock } from "./recipes/RecipeCard";

interface GameRecipe {
  id: string;
  name: string;
  stations?: string[];
  ProducedIn?: string[]; // Satisfactory format
  ingredients?: RecipeIngredient[];
  Ingredients?: any[]; // Satisfactory format
  products?: RecipeProduct[];
  Products?: any[]; // Satisfactory format
  unlock?: RecipeUnlock[];
}

interface GameItem {
  id: string;
  name: string;
  category?: string | string[];
  icon?: string;
  sellPrice?: number;
  buyPrice?: number;
}

interface GameEntity {
  id: string;
  name: string;
  category?: string | string[];
  icon?: string;
}

interface GameEvent {
  id: string;
  name: string;
}

export function RecipesPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: recipes, loading: loadingRecipes, error: errorRecipes } = useGameData<GameRecipe[]>(gameId, "recipes");
  const { data: items } = useGameData<GameItem[]>(gameId, "items");
  const { data: entities } = useGameData<GameEntity[]>(gameId, "entity");
  const { data: events } = useGameData<GameEvent[]>(gameId, "events");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  const dataMap = useMemo(() => {
    const map = new Map<string, { name: string; icon?: string; type: 'item' | 'entity' }>();
    if (items) {
      items.forEach(item => map.set(`item:${item.id}`, { name: item.name, icon: item.icon, type: 'item' }));
    }
    if (entities) {
      entities.forEach(entity => map.set(`entity:${entity.id}`, { name: entity.name, icon: entity.icon, type: 'entity' }));
    }
    return map;
  }, [items, entities]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (events) {
      events.forEach(e => map.set(e.id, e.name));
    }
    return map;
  }, [events]);

  const getSourceData = (type: 'item' | 'entity' | undefined, id: string) => {
    const key = `${type || 'item'}:${id}`;
    return dataMap.get(key);
  };

  const normalizedRecipes = useMemo(() => {
    if (!recipes) return [];
    return recipes.map(recipe => {
      // Normalize stations
      const stations = recipe.stations || recipe.ProducedIn || [];
      
      // Normalize ingredients
      let ingredients: RecipeIngredient[] = [];
      if (recipe.ingredients) {
        ingredients = recipe.ingredients;
      } else if (recipe.Ingredients) {
        ingredients = recipe.Ingredients.map(i => ({
          id: i.ClassName || i.id,
          name: i.Name || i.name,
          amount: i.Amount || i.amount
        }));
      }

      // Normalize products
      let products: RecipeProduct[] = [];
      if (recipe.products) {
        products = recipe.products;
      } else if (recipe.Products) {
        products = recipe.Products.map(p => ({
          id: p.ClassName || p.id,
          name: p.Name || p.name,
          amount: p.Amount || p.amount
        }));
      }

      return {
        ...recipe,
        stations,
        ingredients,
        products
      };
    });
  }, [recipes]);

  const stationsList = useMemo(() => {
    const stations = new Set<string>();
    normalizedRecipes.forEach(recipe => {
      recipe.stations.forEach(s => stations.add(s));
    });
    return Array.from(stations).sort();
  }, [normalizedRecipes]);

  const filteredRecipes = useMemo(() => {
    return normalizedRecipes.filter(recipe => {
      const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            recipe.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            recipe.ingredients.some(i => i.id.toLowerCase().includes(searchTerm.toLowerCase()) || (i.name && i.name.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                            recipe.products.some(p => p.id.toLowerCase().includes(searchTerm.toLowerCase()) || (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const matchesStation = !selectedStation || recipe.stations.includes(selectedStation);
      return matchesSearch && matchesStation;
    });
  }, [normalizedRecipes, searchTerm, selectedStation]);

  if (loadingRecipes) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (errorRecipes) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h6">Erro ao carregar receitas: {errorRecipes}</Typography>
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
        <>
          <Chip
            label="Todas Estações"
            onClick={() => setSelectedStation(null)}
            sx={{
              backgroundColor: !selectedStation ? 'primary.main' : 'rgba(255, 255, 255, 0.03)',
              color: 'text.primary',
              borderRadius: 1,
              '&:hover': { backgroundColor: !selectedStation ? 'primary.main' : 'rgba(255, 255, 255, 0.08)' }
            }}
          />
          {stationsList.map(station => (
            <Chip
              key={station}
              label={station}
              onClick={() => setSelectedStation(station)}
              sx={{
                backgroundColor: selectedStation === station ? 'primary.main' : 'rgba(255, 255, 255, 0.03)',
                color: 'text.primary',
                borderRadius: 1,
                '&:hover': { backgroundColor: selectedStation === station ? 'primary.main' : 'rgba(255, 255, 255, 0.08)' }
              }}
            />
          ))}
        </>
      }
    >
      {filteredRecipes.length > 0 ? (
        <Grid container spacing={3}>
          {filteredRecipes.map(recipe => (
            <Grid size={{ xs: 12, lg: 4 }} key={recipe.id}>
              <RecipeCard
                name={recipe.name}
                stations={recipe.stations}
                ingredients={recipe.ingredients}
                products={recipe.products}
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
