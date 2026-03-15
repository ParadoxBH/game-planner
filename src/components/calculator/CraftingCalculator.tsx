import { useState, useMemo } from "react";
import {
  Typography,
  Paper,
  Grid,
  TextField,
  Autocomplete,
  List,
  ListItem,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  Box,
  useTheme
} from "@mui/material";
import { useParams } from "react-router-dom";
import { useGameData } from "../../hooks/useGameData";
import { ItemChip } from "../common/ItemChip";
import { HelpOutline } from "@mui/icons-material";
import { StyledContainer } from "../common/StyledContainer";

interface RecipeIngredient {
  id: string;
  amount: number;
}

interface Recipe {
  id: string;
  itemId: string;
  amount: number;
  ingredients: RecipeIngredient[];
}

interface Item {
  id: string;
  name: string;
  icon?: string;
  category?: string | string[];
}

export function CraftingCalculator() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: recipes } = useGameData<Recipe[]>(gameId || "", "recipes");
  const { data: items } = useGameData<Item[]>(gameId || "", "items");
  const theme = useTheme();

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [targetAmount, setTargetAmount] = useState<number>(1);

  const itemMap = useMemo(() => {
    const map = new Map<string, Item>();
    items?.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes?.forEach((recipe) => {
      map.set(recipe.itemId, recipe);
    });
    return map;
  }, [recipes]);

  const totalResources = useMemo(() => {
    if (!selectedItem || !recipeMap) return new Map<string, number>();

    const totals = new Map<string, number>();

    function calculate(itemId: string, amount: number) {
      const recipe = recipeMap.get(itemId);

      if (!recipe) {
        const current = totals.get(itemId) || 0;
        totals.set(itemId, current + amount);
        return;
      }

      const batches = Math.ceil(amount / recipe.amount);

      recipe.ingredients.forEach((ing) => {
        calculate(ing.id, ing.amount * batches);
      });
    }

    calculate(selectedItem.id, targetAmount);
    return totals;
  }, [selectedItem, targetAmount, recipeMap]);

  const resourcesList = Array.from(totalResources.entries()).map(([id, amount]) => ({
    id,
    amount,
    item: itemMap.get(id)
  }));

  return (
    <StyledContainer 
      title="Calculadora de Crafting" 
      label="Calcule o total de recursos base necessários para fabricar qualquer item."
    >
      <Grid container spacing={theme.designTokens.spacing.sectionGap}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom sx={{ mb: 2 }}>
              CONFIGURAÇÃO DO ITEM
            </Typography>
            <Stack spacing={3}>
              <Autocomplete
                options={items || []}
                getOptionLabel={(option) => option.name}
                value={selectedItem}
                onChange={(_, newValue) => setSelectedItem(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Selecione um item" variant="outlined" />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0.5 }}>
                      <ItemChip id={option.id} icon={option.icon} amount={0} size="small" />
                      <Typography variant="body2">{option.name}</Typography>
                    </Box>
                  </li>
                )}
              />

              <TextField
                label="Quantidade Desejada"
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(Math.max(1, parseInt(e.target.value) || 1))}
                InputProps={{ inputProps: { min: 1 } }}
                fullWidth
              />

              {selectedItem && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ color: theme.designTokens.colors.fieldLabel, display: 'block', mb: 1 }}>
                    ITEM SELECIONADO:
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <ItemChip id={selectedItem.id} icon={selectedItem.icon} amount={targetAmount} size="large" isProduct />
                    <Typography variant="h6">{selectedItem.name}</Typography>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 2, minHeight: 400 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="primary.main">
                RECURSOS TOTAIS NECESSÁRIOS
              </Typography>
              <Tooltip title="Esta calculadora decompõe o item até seus materiais básicos (recursos que não possuem receita).">
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <HelpOutline fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            
            <Divider sx={{ mb: 3 }} />

            {!selectedItem ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, opacity: 0.3 }}>
                <Typography variant="body1">
                  Selecione um item para ver os recursos necessários.
                </Typography>
              </Box>
            ) : recipeMap.has(selectedItem.id) ? (
              <List sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                {resourcesList.map((res) => (
                  <ListItem key={res.id} sx={{ 
                    p: 1.5, 
                    borderRadius: 1, 
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <ItemChip id={res.id} icon={res.item?.icon} amount={res.amount} size="medium" />
                      <Typography variant="body2" fontWeight={500}>
                        {res.item?.name || res.id}
                      </Typography>
                    </Stack>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 300, textAlign: 'center', px: 4 }}>
                <Typography variant="body1" color="warning.main" gutterBottom>
                  Este item não possui uma receita conhecida. 
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ele é considerado um recurso base ou não fabricável.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </StyledContainer>
  );
}
