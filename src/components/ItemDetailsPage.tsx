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
import { useGameData } from "../hooks/useGameData";
import { StyledContainer } from "./common/StyledContainer";
import { ItemChip } from "./common/ItemChip";
import {
  RecipeCard,
  type RecipeIngredient as CardIngredient,
  type RecipeProduct,
  type RecipeUnlock,
} from "./recipes/RecipeCard";
import { ItemShopCard } from "./shops/ItemShopCard";
import { type ShopItem } from "./shops/ShopItemCard";
import { useMemo } from "react";

interface GameEvent {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  icon?: string;
  category?: string | string[];
  description?: string;
  buyPrice?: number;
  sellPrice?: number;
}

interface Recipe {
  id: string;
  name?: string;
  itemId?: string;
  amount?: number;
  ingredients?: CardIngredient[]; // Use CardIngredient to match RecipeCard expectations
  Ingredients?: any[];
  products?: RecipeProduct[];
  Products?: any[];
  stations?: string[];
  ProducedIn?: string[];
  unlock?: RecipeUnlock[];
}

interface Entity {
  id: string;
  name: string;
  category?: string | string[];
  icon?: string;
  buyPrice?: number;
  sellPrice?: number;
  drops?: {
    itemId: string;
    chance: number;
    quant: number;
    maxQuant?: number;
  }[];
}

interface ShopGroup {
  name: string;
  items: {
    id: string;
    itemId?: string;
    amount?: number;
    price?: number;
    currency?: string;
  }[];
}

interface Shop {
  id: string;
  name: string;
  npcId: string;
  groups?: ShopGroup[];
  items?: { itemId: string; currencyId: string; price: number }[]; // Legacy support
}

export function ItemDetailsPage() {
  const { gameId, itemId } = useParams<{ gameId: string; itemId: string }>();
  const navigate = useNavigate();

  const { data: items } = useGameData<Item[]>(gameId || "", "items");
  const { data: recipes } = useGameData<Recipe[]>(gameId || "", "recipes");
  const { data: entities } = useGameData<Entity[]>(gameId || "", "entity");
  const { data: shops } = useGameData<Shop[]>(gameId || "", "shops");
  const { data: events } = useGameData<GameEvent[]>(gameId || "", "events");

  const item = useMemo(
    () => items?.find((i) => i.id === itemId),
    [items, itemId],
  );

  const entitiesMap = useMemo(() => {
    const map = new Map<string, Entity>();
    if (entities) entities.forEach((e) => map.set(e.id, e));
    return map;
  }, [entities]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, Item>();
    if (items) items.forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  const dataMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; icon?: string; type: "item" | "entity" }
    >();
    if (items) {
      items.forEach((item) =>
        map.set(`item:${item.id}`, {
          name: item.name,
          icon: item.icon,
          type: "item",
        }),
      );
    }
    if (entities) {
      entities.forEach((entity) =>
        map.set(`entity:${entity.id}`, {
          name: entity.name,
          icon: entity.icon,
          type: "entity",
        }),
      );
    }
    return map;
  }, [items, entities]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (events) {
      events.forEach((e) => map.set(e.id, e.name));
    }
    return map;
  }, [events]);

  const getSourceData = (type: "item" | "entity" | undefined, id: string) => {
    const key = `${type || "item"}:${id}`;
    return dataMap.get(key);
  };

  const normalizedRecipes = useMemo(() => {
    if (!recipes) return [];
    return recipes.map((recipe) => {
      const stations = recipe.stations || recipe.ProducedIn || [];

      // Normalize ingredients
      let ingredients: CardIngredient[] = [];
      if (recipe.ingredients) {
        ingredients = recipe.ingredients;
      } else if (recipe.Ingredients) {
        ingredients = recipe.Ingredients.map((i) => ({
          id: i.ClassName || i.id,
          name: i.Name || i.name,
          amount: i.Amount || i.amount || 1,
        }));
      }

      // Normalize products
      let products: RecipeProduct[] = [];
      if (recipe.itemId) {
        products.push({ id: recipe.itemId, amount: recipe.amount || 1 });
      } else if (recipe.products) {
        products = recipe.products;
      } else if (recipe.Products) {
        products = recipe.Products.map((p) => ({
          id: p.ClassName || p.id,
          name: p.Name || p.name,
          amount: p.Amount || p.amount || 1,
        }));
      }

      return {
        ...recipe,
        name:
          recipe.name ||
          (products.length > 0
            ? products[0].name ||
              getSourceData("item", products[0].id)?.name ||
              products[0].id
            : recipe.id),
        stations,
        normalizedStations: stations,
        normalizedIngredients: ingredients,
        normalizedProducts: products,
      };
    });
  }, [recipes, getSourceData]);

  const productionRecipes = useMemo(
    () =>
      normalizedRecipes.filter((r) =>
        r.normalizedProducts.some((p) => p.id === itemId),
      ),
    [normalizedRecipes, itemId],
  );

  const usagesAsIngredient = useMemo(
    () =>
      normalizedRecipes.filter((r) =>
        r.normalizedIngredients.some((ing) => ing.id === itemId),
      ),
    [normalizedRecipes, itemId],
  );

  const dropsFrom = useMemo(
    () => entities?.filter((e) => e.drops?.some((d) => d.itemId === itemId)),
    [entities, itemId],
  );

  const soldIn = useMemo(() => {
    const results: { shop: Shop; shopItem: ShopItem }[] = [];
    if (!shops) return results;

    shops.forEach((s) => {
      // Check legacy items array
      if (s.items) {
        const found = s.items.find((i) => i.itemId === itemId);
        if (found)
          results.push({
            shop: s,
            shopItem: {
              id: found.itemId,
              price: found.price,
              currency: found.currencyId,
            },
          });
      }

      // Check groups
      if (s.groups) {
        s.groups.forEach((g) => {
          g.items.forEach((i) => {
            if (i.id === itemId || i.itemId === itemId) {
              results.push({
                shop: s,
                shopItem: {
                  id: (i.id || i.itemId) as string,
                  price: i.price,
                  currency: i.currency,
                  amount: i.amount,
                },
              });
            }
          });
        });
      }
    });

    return results;
  }, [shops, itemId]);

  if (!item) {
    return (
      <StyledContainer
        title="Item não encontrado"
        label="O item solicitado não existe no banco de dados."
      >
        <Typography>Verifique o ID ou retorne à lista de itens.</Typography>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer
      title={item.name}
      label={`Detalhes e origens do item ${item.id}`}
      actionsStart={
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs
            separator={<NavigateNext fontSize="small" />}
            sx={{ mb: 2 }}
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
        <Stack spacing={2} overflow={"auto"}>
          <Paper elevation={0} sx={{ p: 3, textAlign: "center", width: 500 }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <ItemChip id={item.id} icon={item.icon} size="large" />
            </Box>
            <Typography variant="h5" fontWeight={800} color="primary.main">
              {item.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
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
        <Stack spacing={2} overflow={"auto"}>
          {/* Produzido Em */}
          <Paper elevation={0} sx={{ p: 3 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 2 }}
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
                      name={recipe.name}
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
          <Paper elevation={0} sx={{ p: 3 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 2 }}
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
                      name={recipe.name}
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
                sx={{ p: 3, height: "100%", minHeight: 300 }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 2 }}
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
                sx={{ p: 3, height: "100%", minHeight: 300 }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 2 }}
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
                              events?.map((e) => [e.id, { name: e.name }]) ||
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
