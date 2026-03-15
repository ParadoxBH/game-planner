import { useParams, Link, useNavigate } from "react-router-dom";
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
  Storefront,
  Bolt,
  Construction,
  Architecture,
} from "@mui/icons-material";
import { useApi } from "../../hooks/useApi";
import { StyledContainer } from "../common/StyledContainer";
import { ItemChip } from "../common/ItemChip";
import {
  RecipeCard,
} from "../recipe/RecipeCard";
import { ItemShopCard } from "../shop/ItemShopCard";
import { useMemo } from "react";
import type { GameDataTypes } from "../../types/gameModels";

export function ItemDetailsPage() {
  const { gameId, itemId = "" } = useParams<{ gameId: string; itemId: string }>();
  const navigate = useNavigate();

  const { loading, getItemDetails, raw } = useApi(gameId);

  const itemDetails = useMemo(() => getItemDetails(itemId), [getItemDetails, itemId]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (raw?.events) {
      raw.events.forEach((e) => map.set(e.id, e.name));
    }
    return map;
  }, [raw?.events]);

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

  const getSourceData = (type: GameDataTypes | undefined, id: string): any => {
    if (type === "entity") return entitiesMap.get(id);
    return itemsMap.get(id);
  };

  if (loading) {
    return (
      <StyledContainer title="Carregando..." label="Obtendo dados do jogo">
        <Typography>Por favor, aguarde...</Typography>
      </StyledContainer>
    );
  }

  if (!itemDetails) {
    return (
      <StyledContainer
        title="Item não encontrado"
        label="O item solicitado não existe no banco de dados."
      >
        <Typography>Verifique o ID ou retorne à lista de itens.</Typography>
      </StyledContainer>
    );
  }

  const { item, productionRecipes, usagesAsIngredient, dropsFrom, soldIn } = itemDetails;
  const sizeItemCard = 300;

  return (
    <StyledContainer
      title={item.name}
      label={`Detalhes e origens do item ${item.id}`}
      actionsStart={
        <Box>
          <Breadcrumbs
            separator={<NavigateNext fontSize="small" />}
          >
            <Link
              to={`/game/${gameId}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Dashboard
            </Link>
            <Link
              to={`/game/${gameId}/items/list`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Itens
            </Link>
            <Typography color="primary">{item.name}</Typography>
          </Breadcrumbs>
        </Box>
      }
    >
      <Stack direction={"row"} spacing={4} flex={1} overflow={"hidden"}>
        <Stack spacing={2} sx={{overflowY: "auto", overflowX: "hidden", maxWidth: sizeItemCard, minWidth: sizeItemCard}}>
          <Paper elevation={0} sx={{ p: 2, textAlign: "center" }}>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <ItemChip id={item.id} icon={item.icon} size="extraLarge" />
            </Box>
            <Typography variant="h5" fontWeight={800} color="primary.main">
              {item.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              ID: {item.id}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1} textAlign="left">
              <Box>
                <Typography variant="subtitle2" color="rgba(255,255,255,0.5)">
                  CATEGORIA
                </Typography>
                <Typography variant="body2">
                  {Array.isArray(item.category)
                    ? item.category.join(", ")
                    : item.category || "N/A"}
                </Typography>
              </Box>
              {item.description && (
                <Box>
                  <Typography variant="subtitle2" color="rgba(255,255,255,0.5)">
                    DESCRIÇÃO
                  </Typography>
                  <Typography variant="body2">{item.description}</Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Stack>
        <Stack spacing={2} overflow={"auto"} flex={1}>
          {/* Produzido Em */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <Construction color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Produção (Receitas)
              </Typography>
            </Stack>
            {productionRecipes && productionRecipes.length > 0 ? (
              <Grid container spacing={2}>
                {productionRecipes.map((recipe) => (
                  <Grid size={{ xs: 12, lg: 6 }} key={recipe.id}>
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
              <Typography variant="body2" color="text.secondary">
                Nenhuma receita de produção encontrada.
              </Typography>
            )}
          </Paper>

          {/* Utilizado Como Ingrediente */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <Architecture color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Utilizado em
              </Typography>
            </Stack>
            {usagesAsIngredient && usagesAsIngredient.length > 0 ? (
              <Grid container spacing={2}>
                {usagesAsIngredient.map((recipe) => (
                  <Grid size={{ xs: 12, lg: 6 }} key={recipe.id}>
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
              <Typography variant="body2" color="text.secondary">
                Não é utilizado como ingrediente em nenhuma receita.
              </Typography>
            )}
          </Paper>

          {/* Fontes: Drops e Lojas */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper
                elevation={0}
                sx={{ p: 2, height: "100%" }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  <Bolt color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Drops
                  </Typography>
                </Stack>
                {dropsFrom && dropsFrom.length > 0 ? (
                  <Stack spacing={1.5}>
                    {dropsFrom.map((e) => (
                      <Box
                        key={e.id}
                        sx={{
                          p: 1.5,
                          backgroundColor: "rgba(255,255,255,0.02)",
                          borderRadius: 2,
                          border: "1px solid rgba(255,255,255,0.05)",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: "rgba(255,255,255,0.05)",
                            p: 0.5,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {e.icon ? (
                            <img
                              src={e.icon}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                              }}
                            />
                          ) : (
                            <Bolt sx={{ opacity: 0.2 }} />
                          )}
                        </Box>
                        <Typography variant="body2" fontWeight={700}>
                          {e.name}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Não dropa de nenhuma entidade conhecida.
                  </Typography>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper
                elevation={0}
                sx={{ p: 2, height: "100%" }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  <Storefront color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Vendido em
                  </Typography>
                </Stack>
                {soldIn && soldIn.length > 0 ? (
                  <Grid container spacing={2}>
                    {soldIn.map((s, idx) => (
                      <Grid size={{ xs: 12 }} key={`${s.shop.id}-${idx}`}>
                        <ItemShopCard
                          shop={s.shop}
                          shopItem={s.shopItem}
                          npc={entitiesMap.get(s.shop.npcId)}
                          currencyItem={itemsMap.get(
                            s.shopItem.currency || "ouro",
                          )}
                          itemsMap={itemsMap}
                          entitiesMap={entitiesMap}
                          eventsMap={
                            new Map(
                              raw?.events?.map((e) => [e.id, { name: e.name }]) ||
                                [],
                            )
                          }
                          onClick={() =>
                            navigate(`/game/${gameId}/shops/list/${s.shop.id}`)
                          }
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Não é vendido em nenhuma loja conhecida.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Stack>
    </StyledContainer>
  );
}
