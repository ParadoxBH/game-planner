import { useParams, Link } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Divider,
  List,
  ListItem,
  Breadcrumbs,
  useTheme,
  Button
} from "@mui/material";
import { 
  NavigateNext,
  Info,
  Construction,
  Storefront,
  Bolt,
  Architecture
} from "@mui/icons-material";
import { useGameData } from "../hooks/useGameData";
import { StyledContainer } from "./common/StyledContainer";
import { ItemChip } from "./common/ItemChip";
import { useMemo } from "react";

interface Item {
  id: string;
  name: string;
  icon?: string;
  category?: string | string[];
  description?: string;
}

interface RecipeIngredient {
  id: string;
  amount: number;
}

interface Recipe {
  id: string;
  itemId?: string;
  amount?: number;
  ingredients?: RecipeIngredient[];
  Ingredients?: any[];
  products?: any[];
  Products?: any[];
  stations?: string[];
  ProducedIn?: string[];
}

interface Entity {
  id: string;
  name: string;
  drops?: { id: string; min: number; max: number }[];
}

interface ShopItem {
  itemId: string;
  currencyId: string;
  price: number;
}

interface Shop {
  id: string;
  name: string;
  npcId: string;
  items: ShopItem[];
  exchanges?: any[];
}

export function ItemDetailsPage() {
  const { gameId, itemId } = useParams<{ gameId: string; itemId: string }>();
  const theme = useTheme();

  const { data: items } = useGameData<Item[]>(gameId || "", "items");
  const { data: recipes } = useGameData<Recipe[]>(gameId || "", "recipes");
  const { data: entities } = useGameData<Entity[]>(gameId || "", "entity");
  const { data: shops } = useGameData<Shop[]>(gameId || "", "shops");

  const item = useMemo(() => items?.find(i => i.id === itemId), [items, itemId]);

  const normalizedRecipes = useMemo(() => {
    if (!recipes) return [];
    return recipes.map(recipe => {
      const stations = recipe.stations || recipe.ProducedIn || [];
      
      let ingredients: RecipeIngredient[] = [];
      if (recipe.ingredients) {
        ingredients = recipe.ingredients;
      } else if (recipe.Ingredients) {
        ingredients = recipe.Ingredients.map(i => ({
          id: i.ClassName || i.id,
          amount: i.Amount || i.amount || 1
        }));
      }

      let products: { id: string; amount: number }[] = [];
      if (recipe.itemId) {
        products.push({ id: recipe.itemId, amount: recipe.amount || 1 });
      } else if (recipe.products) {
        products = recipe.products.map(p => ({ id: p.id || p.itemId, amount: p.amount || 1 }));
      } else if (recipe.Products) {
        products = recipe.Products.map(p => ({
          id: p.ClassName || p.id,
          amount: p.Amount || p.amount || 1
        }));
      }

      return {
        ...recipe,
        normalizedStations: stations,
        normalizedIngredients: ingredients,
        normalizedProducts: products
      };
    });
  }, [recipes]);

  const productionRecipes = useMemo(() => 
    normalizedRecipes.filter(r => r.normalizedProducts.some(p => p.id === itemId)), 
    [normalizedRecipes, itemId]
  );

  const usagesAsIngredient = useMemo(() => 
    normalizedRecipes.filter(r => r.normalizedIngredients.some(ing => ing.id === itemId)), 
    [normalizedRecipes, itemId]
  );

  const dropsFrom = useMemo(() => 
    entities?.filter(e => e.drops?.some(d => d.id === itemId)), 
    [entities, itemId]
  );

  const soldIn = useMemo(() => 
    shops?.filter(s => s.items?.some(i => i.itemId === itemId)), 
    [shops, itemId]
  );

  if (!item) {
    return (
      <StyledContainer title="Item não encontrado" label="O item solicitado não existe no banco de dados.">
        <Typography>Verifique o ID ou retorne à lista de itens.</Typography>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer 
      title={item.name} 
      label={`Detalhes e origens do item ${item.id}`}
    >
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 2 }}>
          <Link to={`/game/${gameId}`} style={{ color: "inherit", textDecoration: "none" }}>Dashboard</Link>
          <Link to={`/game/${gameId}/items/list`} style={{ color: "inherit", textDecoration: "none" }}>Itens</Link>
          <Typography color="primary">{item.name}</Typography>
        </Breadcrumbs>
      </Box>

      <Grid container spacing={3}>
        {/* Identificação e Descrição */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <ItemChip id={item.id} icon={item.icon} size="large" />
            </Box>
            <Typography variant="h5" fontWeight={800} color="primary.main">
              {item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              ID: {item.id}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1} textAlign="left">
              <Box>
                <Typography variant="subtitle2" color="rgba(255,255,255,0.5)">CATEGORIA</Typography>
                <Typography variant="body2">{Array.isArray(item.category) ? item.category.join(", ") : item.category || "N/A"}</Typography>
              </Box>
              {item.description && (
                <Box>
                  <Typography variant="subtitle2" color="rgba(255,255,255,0.5)">DESCRIÇÃO</Typography>
                  <Typography variant="body2">{item.description}</Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Produção e Uso */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {/* Produzido Em */}
            <Paper elevation={0} sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Construction color="primary" />
                <Typography variant="h6" fontWeight={700}>Produção (Receitas)</Typography>
              </Stack>
              {productionRecipes && productionRecipes.length > 0 ? (
                <List>
                  {productionRecipes.map(recipe => (
                    <Box key={recipe.id} sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">Estações: {recipe.normalizedStations.join(", ")}</Typography>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                        {recipe.normalizedIngredients.map(ing => (
                          <Link key={ing.id} to={`/game/${gameId}/items/view/${ing.id}`} style={{ textDecoration: 'none' }}>
                            <ItemChip id={ing.id} amount={ing.amount} size="medium" />
                          </Link>
                        ))}
                        <NavigateNext color="disabled" />
                        {recipe.normalizedProducts.map(prod => (
                          <ItemChip 
                            key={prod.id} 
                            id={prod.id} 
                            amount={prod.amount} 
                            size="medium" 
                            isProduct 
                            disableLink={prod.id === itemId}
                          />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">Nenhuma receita de produção encontrada.</Typography>
              )}
            </Paper>

            {/* Utilizado Como Ingrediente */}
            <Paper elevation={0} sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Architecture color="primary" />
                <Typography variant="h6" fontWeight={700}>Utilizado em</Typography>
              </Stack>
              {usagesAsIngredient && usagesAsIngredient.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {usagesAsIngredient.map(recipe => {
                    const primaryProduct = recipe.normalizedProducts[0];
                    if (!primaryProduct) return null;
                    return (
                      <Link key={recipe.id} to={`/game/${gameId}/items/view/${primaryProduct.id}`} style={{ textDecoration: 'none' }}>
                        <ItemChip id={primaryProduct.id} size="medium" isProduct />
                      </Link>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">Não é utilizado como ingrediente em nenhuma receita.</Typography>
              )}
            </Paper>

            {/* Fontes: Drops e Lojas */}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper elevation={0} sx={{ p: 3, height: '100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <Bolt color="primary" />
                    <Typography variant="h6" fontWeight={700}>Drops</Typography>
                  </Stack>
                  {dropsFrom && dropsFrom.length > 0 ? (
                    <Stack spacing={1}>
                      {dropsFrom.map(e => (
                        <Box key={e.id} sx={{ p: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{e.name}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Não dropa de nenhuma entidade conhecida.</Typography>
                  )}
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper elevation={0} sx={{ p: 3, height: '100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <Storefront color="primary" />
                    <Typography variant="h6" fontWeight={700}>Vendido em</Typography>
                  </Stack>
                  {soldIn && soldIn.length > 0 ? (
                    <Stack spacing={1}>
                      {soldIn.map(s => (
                        <Box key={s.id} sx={{ p: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Não é vendido em nenhuma loja conhecida.</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </Grid>
      </Grid>
    </StyledContainer>
  );
}
