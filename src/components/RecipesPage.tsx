import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Grid, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
  InputAdornment,
  CircularProgress,
  Divider,
  Paper
} from "@mui/material";
import { 
  Search, 
  Construction,
  Inventory,
  KeyboardDoubleArrowRight,
  Lock,
  Bolt,
  Assignment,
  Category
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useGameData } from "../hooks/useGameData";
import { useState, useMemo } from "react";

interface RecipeIngredient {
  type?: 'item' | 'entity' | 'category'; // Default to item if not specified
  id: string;
  name?: string;
  amount: number;
}

interface RecipeProduct {
  type?: 'item' | 'entity'; // Default to item if not specified
  id: string;
  name?: string;
  amount: number;
}

interface RecipeUnlock {
  type: string;
  subject?: string;
  value: string;
}

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
    <Container maxWidth="xl" sx={{ py: 4, flex: 1, overflowY: 'hidden' }}>
      <Stack spacing={4} sx={{flex: 1, height: "100%", overflowY: 'hidden'}}>
        {/* Header Section */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ color: 'text.primary' }}>
              Receitas de {gameId}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Descubra como fabricar todos os itens do jogo.
            </Typography>
          </Box>
          
          <Box sx={{ width: { xs: '100%', md: '400px' } }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Pesquisar receitas, ingredientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                sx: {
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 1,
                  '& fieldset': { borderColor: 'divider' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                }
              }}
            />
          </Box>
        </Stack>

        {/* Stations Section */}
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: '4px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' } }}>
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
        </Stack>

        <Stack sx={{ overflowY: 'auto', flex: 1 }}>
          {filteredRecipes.length > 0 ? (
            <Grid container spacing={3}>
              {filteredRecipes.map(recipe => (
                <Grid size={{ xs: 12, lg: 6 }} key={recipe.id}>
                  <Card sx={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                    backdropFilter: 'blur(16px)',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                    }
                  }}>
                    <CardContent>
                      <Stack spacing={2}>
                        {/* Recipe Title & Stations */}
                        <Box>
                          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700 }}>
                            {recipe.name}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {recipe.stations.map(s => (
                              <Chip 
                                key={s} 
                                label={s} 
                                size="small" 
                                icon={<Construction sx={{ fontSize: '1rem' }} />} 
                                sx={{ backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '0.7rem' }} 
                              />
                            ))}
                          </Stack>
                        </Box>

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                        {/* Crafting Process */}
                        <Grid container spacing={2} alignItems="center">
                          {/* Ingredients */}
                          <Grid size={{ xs: 12, md: 5 }}>
                            <Stack spacing={1}>
                              <Typography variant="overline" sx={{ color: 'text.disabled', lineHeight: 1 }}>Ingredientes</Typography>
                              {recipe.ingredients.map((ing, idx) => {
                                const source = getSourceData(ing.type as any, ing.id);
                                return (
                                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Paper variant="outlined" sx={{ 
                                      p: 0.5, 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      width: 32, 
                                      height: 32, 
                                      backgroundColor: 'rgba(0,0,0,0.2)',
                                      borderColor: ing.type === 'category' ? 'warning.dark' : 'divider'
                                    }}>
                                      {ing.type === 'category' ? (
                                        <Category sx={{ fontSize: 16, color: 'warning.main' }} />
                                      ) : source?.icon ? (
                                        <img src={source.icon} alt={ing.id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                      ) : (
                                        <Inventory sx={{ fontSize: 16, color: 'text.disabled' }} />
                                      )}
                                    </Paper>
                                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                                      {ing.type === 'category' ? `Qualquer ${ing.id}` : (ing.name || source?.name || ing.id)}
                                    </Typography>
                                    <Chip label={`x${ing.amount}`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                  </Box>
                                );
                              })}
                            </Stack>
                          </Grid>

                          <Grid size={{ xs: 12, md: 1 }} sx={{ display: 'flex', justifyContent: 'center' }}>
                            <KeyboardDoubleArrowRight sx={{ color: 'text.disabled', display: { xs: 'none', md: 'block' } }} />
                          </Grid>

                          {/* Products */}
                          <Grid size={{ xs: 12, md: 5 }}>
                            <Stack spacing={1}>
                              <Typography variant="overline" sx={{ color: 'primary.main', lineHeight: 1 }}>Produtos</Typography>
                              {recipe.products.map((prod, idx) => {
                                const source = getSourceData(prod.type, prod.id);
                                return (
                                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Paper variant="outlined" sx={{ 
                                      p: 0.5, 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      width: 32, 
                                      height: 32, 
                                      backgroundColor: 'rgba(0,0,0,0.2)', 
                                      borderColor: prod.type === 'entity' ? 'secondary.dark' : 'primary.dark' 
                                    }}>
                                      {source?.icon ? (
                                        <img src={source.icon} alt={prod.id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                      ) : (
                                        prod.type === 'entity' ? <Bolt sx={{ fontSize: 16, color: 'secondary.main' }} /> : <Inventory sx={{ fontSize: 16, color: 'primary.main' }} />
                                      )}
                                    </Paper>
                                    <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }}>
                                      {prod.name || source?.name || prod.id}
                                    </Typography>
                                    <Chip 
                                      color={prod.type === 'entity' ? "secondary" : "primary"} 
                                      label={`x${prod.amount}`} 
                                      size="small" 
                                      sx={{ height: 20, fontSize: '0.7rem' }} 
                                    />
                                  </Box>
                                );
                              })}
                            </Stack>
                          </Grid>
                        </Grid>

                        {/* Unlock Requirements */}
                        {recipe.unlock && recipe.unlock.length > 0 && (
                          <Box sx={{ 
                            mt: 1, 
                            p: 1.5, 
                            borderRadius: 1, 
                            backgroundColor: 'rgba(255, 68, 0, 0.05)', 
                            border: '1px dashed rgba(255, 68, 0, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1
                          }}>
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#ffbb00', fontWeight: 600 }}>
                              <Lock sx={{ fontSize: '0.9rem' }} /> Requisito
                            </Typography>
                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                              {recipe.unlock.map((req, idx) => {
                                let Icon = Lock;
                                let color = "#ffbb00";
                                let label = req.type;

                                  if (req.type === 'level') {
                                    Icon = Bolt;
                                    label = "Nível";
                                  } else if (req.type === 'quest') {
                                    Icon = Assignment;
                                    label = "Missão";
                                  } else if (req.type === 'upgrade') {
                                    Icon = Construction;
                                    label = "Upgrade";
                                  } else if (req.type === 'event') {
                                    label = "Evento";
                                  }
  
                                  const displayValue = req.type === 'event' ? (eventsMap.get(req.value) || req.value) : req.value;

                                  return (
                                    <Typography key={idx} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem' }}>
                                      <Icon sx={{ fontSize: '1rem', color }} /> 
                                      <b>{label}{req.subject ? ` de ${req.subject}` : ''}:</b> {displayValue}
                                    </Typography>
                                );
                              })}
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
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
        </Stack>
      </Stack>
    </Container>
  );
}
