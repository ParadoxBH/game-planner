import { useParams, Link } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Divider,
  Breadcrumbs,
} from "@mui/material";
import {
  NavigateNext,
  Construction,
  Inventory,
  AutoFixHigh,
} from "@mui/icons-material";
import { useApi } from "../hooks/useApi";
import { StyledContainer } from "./common/StyledContainer";
import { ItemChip } from "./common/ItemChip";
import { useMemo } from "react";
import type { GameDataTypes } from "../types/gameModels";

export function RecipeDetailsPage() {
  const { gameId, recipeId = "" } = useParams<{ gameId: string; recipeId: string }>();

  const { loading, getRecipeDetails, raw } = useApi(gameId);

  const recipeDetails = useMemo(() => getRecipeDetails(recipeId), [getRecipeDetails, recipeId]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (raw?.items) raw.items.forEach((i) => map.set(i.id, i));
    return map;
  }, [raw?.items]);

  const entitiesMap = useMemo(() => {
    const map = new Map<string, any>();
    if (raw?.entities) raw.entities.forEach((e) => map.set(e.id, e));
    return map;
  }, [raw?.entities]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (raw?.events) raw.events.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [raw?.events]);

  // const getSourceData = (type: GameDataTypes | undefined, id: string): any => {
  //   if (type === "entity") return entitiesMap.get(id);
  //   return itemsMap.get(id);
  // };

  if (loading) {
    return (
      <StyledContainer title="Carregando..." label="Obtendo dados do jogo">
        <Typography>Por favor, aguarde...</Typography>
      </StyledContainer>
    );
  }

  if (!recipeDetails) {
    return (
      <StyledContainer
        title="Receita não encontrada"
        label="A receita solicitada não existe no banco de dados."
      >
        <Typography>Verifique o ID ou retorne à lista de receitas.</Typography>
      </StyledContainer>
    );
  }

  const { recipe, ingredients, products } = recipeDetails;

  return (
    <StyledContainer
      title={recipe.normalizedName}
      label={`Detalhes da Receita`}
      actionsStart={
        <Box>
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            <Link to={`/game/${gameId}`} style={{ color: "inherit", textDecoration: "none" }}>
              Dashboard
            </Link>
            <Link to={`/game/${gameId}/recipes/list`} style={{ color: "inherit", textDecoration: "none" }}>
              Receitas
            </Link>
            <Typography color="primary">{recipe.normalizedName}</Typography>
          </Breadcrumbs>
        </Box>
      }
    >
      <Stack spacing={3}>
        <Grid container spacing={3}>
          {/* Info Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 3, height: '100%' }}>
              <Stack spacing={2} alignItems="center" textAlign="center">
                 <Box sx={{ 
                    width: 100, 
                    height: 100, 
                    borderRadius: 2, 
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden'
                }}>
                    {products[0]?.data?.icon ? (
                         <img src={products[0].data.icon} alt={recipe.normalizedName} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                    ) : (
                        <Construction sx={{ fontSize: 50, color: 'rgba(255, 255, 255, 0.2)' }} />
                    )}
                </Box>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                  {recipe.normalizedName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ID: {recipe.id}
                </Typography>
                
                <Divider sx={{ width: '100%', my: 1 }} />
                
                <Box textAlign="left" sx={{ width: '100%' }}>
                  <Typography variant="subtitle2" color="rgba(255,255,255,0.5)" gutterBottom>
                    ESTAÇÕES DE PRODUÇÃO
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {recipe.normalizedStations.length > 0 ? (
                      recipe.normalizedStations.map((s: string, idx: number) => (
                        <Box 
                          key={idx} 
                          sx={{ 
                            px: 1.5, 
                            py: 0.5, 
                            bgcolor: 'rgba(255,255,255,0.05)', 
                            borderRadius: 1,
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          <Typography variant="caption" fontWeight={700}>
                            {s}
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">Default / Crafting</Typography>
                    )}
                  </Stack>
                </Box>

                {recipe.unlock && recipe.unlock.length > 0 && (
                  <Box textAlign="left" sx={{ width: '100%', mt: 2 }}>
                    <Typography variant="subtitle2" color="rgba(255,255,255,0.5)" gutterBottom>
                      COMO DESBLOQUEAR
                    </Typography>
                    <Stack spacing={1}>
                      {recipe.unlock.map((u: any, idx: number) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AutoFixHigh fontSize="small" color="primary" />
                          <Typography variant="body2">
                            {u.type === 'event' ? (eventsMap.get(u.value) || u.value) : u.value}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Ingredients & Products */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              {/* Ingredients */}
              <Paper elevation={0} sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Inventory color="primary" />
                  <Typography variant="h6" fontWeight={700}>Ingredientes</Typography>
                </Stack>
                <Grid container spacing={2}>
                  {ingredients.map((ing: any, idx: number) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                      <Box sx={{ 
                        p: 1.5, 
                        backgroundColor: 'rgba(255,255,255,0.02)', 
                        borderRadius: 2, 
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}>
                        <ItemChip id={ing.id} icon={ing.data?.icon} amount={ing.amount} />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Link 
                                to={`/game/${gameId}/${ing.type === 'entity' ? 'entity' : 'items'}/view/${ing.id}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <Typography variant="body2" fontWeight={700} sx={{ 
                                    lineHeight: 1.2,
                                    '&:hover': { color: 'primary.main' }
                                }}>
                                    {ing.name || ing.data?.name || ing.id}
                                </Typography>
                            </Link>
                            <Typography variant="caption" color="text.secondary">
                                Quantidade: {ing.amount}
                            </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              {/* Products */}
              <Paper elevation={0} sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Construction color="primary" />
                  <Typography variant="h6" fontWeight={700}>Produtos</Typography>
                </Stack>
                <Grid container spacing={2}>
                  {products.map((p: any, idx: number) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                      <Box sx={{ 
                        p: 1.5, 
                        backgroundColor: 'rgba(255,255,255,0.02)', 
                        borderRadius: 2, 
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}>
                        <ItemChip id={p.id} icon={p.data?.icon} amount={p.amount} />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                             <Link 
                                to={`/game/${gameId}/${p.type === 'entity' ? 'entity' : 'items'}/view/${p.id}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <Typography variant="body2" fontWeight={700} sx={{ 
                                    lineHeight: 1.2,
                                    '&:hover': { color: 'primary.main' }
                                }}>
                                    {p.name || p.data?.name || p.id}
                                </Typography>
                            </Link>
                            <Typography variant="caption" color="text.secondary">
                                Quantidade: {p.amount}
                            </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </StyledContainer>
  );
}
