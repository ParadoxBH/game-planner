import { useParams, Link } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Divider,
  Breadcrumbs,
  CircularProgress,
  Chip,
  ButtonGroup,
  Button,
} from "@mui/material";
import {
  NavigateNext,
  Construction,
  Inventory,
  AutoFixHigh,
  Schema,
  AccountTree,
  Info,
} from "@mui/icons-material";
import { useApi } from "../../hooks/useApi";
import { StyledContainer } from "../common/StyledContainer";
import { ItemChip } from "../common/ItemChip";
import { TimeChip } from "../common/TimeChip";
import { useMemo, useState, useEffect } from "react";
import { ProductionFlow } from "../flow/ProductionFlow";
import { CraftingTreeCard } from "./CraftingTreeCard";
import { GameDataSelector } from "../common/GameDataSelector";
import { StyledDialog } from "../common/StyledDialog";
import { getCraftingTree } from "../../utils/craftingTree";
import type { Item, Entity, Recipe } from "../../types/gameModels";
import type { RecipeDetails } from "../../types/apiModels";
import { itemRepository } from "../../repositories/ItemRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { recipeRepository } from "../../repositories/RecipeRepository";
import { shopRepository } from "../../repositories/ShopRepository";
import { eventRepository } from "../../repositories/EventRepository";
import { getPublicUrl } from "../../utils/pathUtils";
import type { GameEvent } from "../../types/gameModels";
import { DetainContainer } from "../common/DetainContainer";
import { usePlatform } from "../../hooks/usePlatform";

export function RecipeDetailsPage() {
  const { gameId, recipeId = "" } = useParams<{
    gameId: string;
    recipeId: string;
  }>();

  const { loading: dbLoading, getRecipeDetails } = useApi(gameId);

  const [activeTab, setActiveTab] = useState(0);
  const [recipeDetails, setRecipeDetails] = useState<RecipeDetails | null>(
    null,
  );
  const [dataLoading, setDataLoading] = useState(true);

  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const { isMobile } = usePlatform();

  const [categoryChoices, setCategoryChoices] = useState<
    Record<string, string>
  >({});
  const [recipeChoices, setRecipeChoices] = useState<Record<string, string>>(
    {},
  );
  const [activeCategorySelection, setActiveCategorySelection] = useState<
    string | null
  >(null);
  const [activeRecipeSelection, setActiveRecipeSelection] = useState<
    string | null
  >(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);

  // Fetch all data needed for the page and tree calculations
  useEffect(() => {
    if (dbLoading || !recipeId) return;

    let isMounted = true;
    setDataLoading(true);

    Promise.all([
      getRecipeDetails(recipeId),
      itemRepository.getAll(),
      entityRepository.getAll(),
      recipeRepository.getAll(),
      shopRepository.getAll(),
      eventRepository.getAll(),
    ])
      .then(
        ([details, allItems, allEntities, allRecipes, allShops, allEvents]) => {
          if (!isMounted) return;
          setRecipeDetails(details);
          setItems(allItems);
          setEntities(allEntities);
          setRecipes(allRecipes);
          setShops(allShops);
          setEvents(allEvents);
          setDataLoading(false);
        },
      )
      .catch((err) => {
        console.error("Error loading recipe details data:", err);
        if (isMounted) setDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dbLoading, recipeId, getRecipeDetails]);

  const treeOptions = useMemo(() => {
    if (dataLoading) return null;

    const itemMap = new Map<string, Item>();
    items.forEach((i: Item) => itemMap.set(i.id, i));

    const entityMap = new Map<string, Entity>();
    entities.forEach((e: Entity) => entityMap.set(e.id, e));

    const recipeMapByProduct = new Map<string, Recipe>();
    const allRecipesByProduct = new Map<string, Recipe[]>();

    recipes.forEach((r: Recipe) => {
      // Direct product match
      if (r.itemId) {
        recipeMapByProduct.set(r.itemId, r);
        const current = allRecipesByProduct.get(r.itemId) || [];
        allRecipesByProduct.set(r.itemId, [...current, r]);
      }
      r.products?.forEach(
        (p: { id: string; amount: number; type?: string }) => {
          if (p.type === "category") {
            // Map the category ID itself
            recipeMapByProduct.set(p.id, r);
            const catAlts = allRecipesByProduct.get(p.id) || [];
            allRecipesByProduct.set(p.id, [...catAlts, r]);

            // If product is a category, this recipe can produce any item/entity in that category
            items.forEach((item: Item) => {
              const categories = Array.isArray(item.category)
                ? item.category
                : [item.category];
              if (categories.includes(p.id)) {
                const current = allRecipesByProduct.get(item.id) || [];
                allRecipesByProduct.set(item.id, [...current, r]);
                if (!recipeMapByProduct.has(item.id))
                  recipeMapByProduct.set(item.id, r);
              }
            });
            entities.forEach((ent: Entity) => {
              const categories = Array.isArray(ent.category)
                ? ent.category
                : [ent.category];
              if (categories.includes(p.id)) {
                const current = allRecipesByProduct.get(ent.id) || [];
                allRecipesByProduct.set(ent.id, [...current, r]);
                if (!recipeMapByProduct.has(ent.id))
                  recipeMapByProduct.set(ent.id, r);
              }
            });
          } else {
            recipeMapByProduct.set(p.id, r);
            const current = allRecipesByProduct.get(p.id) || [];
            allRecipesByProduct.set(p.id, [...current, r]);
          }
        },
      );
    });

    const shopMap = new Map<string, string>();
    const shopNames = new Map<string, string>();
    shops.forEach((shop: any) => {
      shopNames.set(shop.id, shop.name);
      shop.groups.forEach((group: any) => {
        group.items.forEach((item: any) => {
          shopMap.set(item.id, shop.id);
        });
      });
    });

    return {
      itemMap,
      entityMap,
      recipeMapByProduct,
      allRecipesByProduct,
      shopMap,
      shopNames,
      categoryChoices,
      recipeChoices,
    };
  }, [
    items,
    entities,
    recipes,
    shops,
    categoryChoices,
    recipeChoices,
    dataLoading,
  ]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [events]);

  const tree = useMemo(() => {
    if (!recipeDetails || !treeOptions) return null;

    const product = recipeDetails.products?.[0];
    const itemId = recipeDetails.recipe.itemId || product?.id || "";
    const type = product?.type || "item";

    if (!itemId) return null;
    return getCraftingTree(itemId, 1, type, treeOptions);
  }, [recipeDetails, treeOptions]);

  if (dbLoading || dataLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          width: "100%",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
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
      sx={{ header: { position: "relative" } }}
      actionsStart={
        !isMobile ? (
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            <Link
              to={`/game/${gameId}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Dashboard
            </Link>
            <Link
              to={`/game/${gameId}/recipes/list`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Receitas
            </Link>
            <Typography color="primary">{recipe.normalizedName}</Typography>
          </Breadcrumbs>
        ) : undefined
      }
      actionsEnd={
        <ButtonGroup fullWidth={isMobile}>
          <Button
            variant={activeTab === 0 ? "contained" : "outlined"}
            startIcon={<Info />}
            onClick={() => setActiveTab(0)}
          >
            Geral
          </Button>
          <Button
            variant={activeTab === 1 ? "contained" : "outlined"}
            startIcon={<Schema />}
            onClick={() => setActiveTab(1)}
          >
            {isMobile ? "Fluxo" : "Fluxo de Produção"}
          </Button>
          <Button
            variant={activeTab === 2 ? "contained" : "outlined"}
            startIcon={<AccountTree />}
            onClick={() => setActiveTab(2)}
          >
            {isMobile ? "Árvore" : "Árvore de Produção"}
          </Button>
        </ButtonGroup>
      }
    >
      {activeTab === 0 && (
        <DetainContainer>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Stack spacing={1} alignItems="center" textAlign="center">
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: 2,
                  backgroundColor: "rgba(0,0,0,0.2)",
                  border: 1,
                  borderColor: "divider",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                {products[0]?.data?.icon ? (
                  <img
                    src={getPublicUrl(products[0].data.icon)}
                    alt={recipe.normalizedName}
                    style={{
                      width: "80%",
                      height: "80%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <Construction
                    sx={{ fontSize: 50, color: "rgba(255, 255, 255, 0.2)" }}
                  />
                )}
              </Box>
              <Typography variant="h5" fontWeight={800} color="primary.main">
                {recipe.normalizedName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {recipe.id}
              </Typography>

              <Divider sx={{ width: "100%", my: 1 }} />

              <Box textAlign="left" sx={{ width: "100%" }}>
                <Typography
                  variant="subtitle2"
                  color="rgba(255,255,255,0.5)"
                  gutterBottom
                >
                  ESTAÇÕES DE PRODUÇÃO
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {recipe.normalizedStations.length > 0 ? (
                    recipe.normalizedStations.map((s: string, idx: number) => {
                      const relatedEntities = entities.filter((e) => {
                        const cats = Array.isArray(e.category)
                          ? e.category
                          : [e.category];
                        return cats.some(
                          (c) => c && c.toLowerCase() === s.toLowerCase(),
                        );
                      });

                      const isSingle = relatedEntities.length === 1;
                      const firstEntity =
                        relatedEntities.length > 0 ? relatedEntities[0] : null;
                      const displayName = firstEntity ? firstEntity.name : s;
                      const targetUrl = isSingle
                        ? `/game/${gameId}/entity/view/${firstEntity?.id}`
                        : `/game/${gameId}/entity/list/all?subCategory=${s}`;

                      return (
                        <Box
                          key={idx}
                          component={Link}
                          to={targetUrl}
                          sx={{
                            px: 1,
                            py: 0.5,
                            bgcolor: "rgba(255,255,255,0.05)",
                            borderRadius: 1,
                            border: "1px solid rgba(255,255,255,0.1)",
                            textDecoration: "none",
                            color: "inherit",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            transition: "all 0.2s",
                            "&:hover": {
                              bgcolor: "rgba(255,255,255,0.1)",
                              borderColor: "primary.main",
                              transform: "translateY(-1px)",
                            },
                          }}
                        >
                          {firstEntity?.icon && (
                            <Box
                              component="img"
                              src={getPublicUrl(firstEntity.icon)}
                              sx={{
                                width: 18,
                                height: 18,
                                objectFit: "contain",
                              }}
                            />
                          )}
                          <Typography variant="caption" fontWeight={700}>
                            {displayName}
                          </Typography>
                          {!isSingle && relatedEntities.length > 1 && (
                            <Typography
                              variant="caption"
                              sx={{ opacity: 0.5, fontSize: "0.6rem" }}
                            >
                              ({relatedEntities.length})
                            </Typography>
                          )}
                        </Box>
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Produzido manualmente
                    </Typography>
                  )}
                </Stack>
              </Box>

              {recipe.craftTime && recipe.craftTime > 0 && (
                <Box textAlign="left" sx={{ width: "100%" }}>
                  <Typography
                    variant="subtitle2"
                    color="rgba(255,255,255,0.5)"
                    gutterBottom
                  >
                    TEMPO DE PRODUÇÃO
                  </Typography>
                  <TimeChip seconds={recipe.craftTime} size="medium" />
                </Box>
              )}

              {recipe.unlock && recipe.unlock.length > 0 && (
                <Box textAlign="left" sx={{ width: "100%" }}>
                  <Typography
                    variant="subtitle2"
                    color="rgba(255,255,255,0.5)"
                    gutterBottom
                  >
                    COMO DESBLOQUEAR
                  </Typography>
                  <Stack spacing={1}>
                    {recipe.unlock.map((u: any, idx: number) => (
                      <Box
                        key={idx}
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <AutoFixHigh fontSize="small" color="primary" />
                        {u.type === "event" ? (
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography variant="body2">Evento:</Typography>
                            <Chip
                              label={eventsMap.get(u.value) || u.value}
                              size="small"
                              component={Link}
                              to={`/game/${gameId}/events/view/${u.value}`}
                              clickable
                              sx={{
                                bgcolor: "rgba(25, 118, 210, 0.1)",
                                color: "primary.main",
                                fontWeight: 700,
                                border: "1px solid rgba(25, 118, 210, 0.2)",
                                "&:hover": {
                                  bgcolor: "rgba(25, 118, 210, 0.2)",
                                },
                              }}
                            />
                          </Stack>
                        ) : (
                          <Typography variant="body2">{u.value}</Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>
          <>
            {/* Ingredients & Products */}
            {true && (
              <Stack spacing={1} flex={1}>
                {/* Ingredients */}
                <Paper elevation={0} sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Inventory color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        Ingredientes
                      </Typography>
                    </Stack>
                    <Grid container spacing={1}>
                      {ingredients.map((ing: any, idx: number) => {
                        const choiceId = categoryChoices[ing.id];
                        const selectedItem = choiceId
                          ? treeOptions?.itemMap.get(choiceId)
                          : null;

                        return (
                          <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                            <Box
                              sx={{
                                p: 1,
                                backgroundColor: "rgba(255,255,255,0.02)",
                                borderRadius: 1,
                                border: "1px solid rgba(255,255,255,0.05)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                                cursor:
                                  ing.type === "category"
                                    ? "pointer"
                                    : "default",
                                "&:hover":
                                  ing.type === "category"
                                    ? {
                                        backgroundColor:
                                          "rgba(255,255,255,0.05)",
                                      }
                                    : {},
                              }}
                              onClick={() => {
                                if (ing.type === "category") {
                                  setActiveCategorySelection(ing.id);
                                  setIsDialogOpen(true);
                                }
                              }}
                            >
                              <Stack
                                direction="row"
                                alignItems="center"
                                gap={2}
                              >
                                <ItemChip
                                  id={choiceId || ing.id}
                                  icon={selectedItem?.icon || ing.data?.icon}
                                  amount={ing.amount}
                                  type={
                                    choiceId
                                      ? treeOptions?.entityMap.has(choiceId)
                                        ? "entity"
                                        : "item"
                                      : ing.type
                                  }
                                />
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                  {ing.type !== "category" ? (
                                    <Link
                                      to={`/game/${gameId}/${ing.type === "entity" ? "entity" : "items"}/view/${ing.id}`}
                                      style={{
                                        textDecoration: "none",
                                        color: "inherit",
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        fontWeight={700}
                                        sx={{
                                          lineHeight: 1.2,
                                          "&:hover": { color: "primary.main" },
                                        }}
                                      >
                                        {ing.name || ing.data?.name || ing.id}
                                      </Typography>
                                    </Link>
                                  ) : (
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        fontWeight={700}
                                        sx={{ lineHeight: 1.2 }}
                                      >
                                        {selectedItem
                                          ? selectedItem.name
                                          : `Qualquer ${ing.id}`}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="primary"
                                        sx={{
                                          fontSize: "0.65rem",
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        Mudar Seleção
                                      </Typography>
                                    </Box>
                                  )}
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Quantidade: {ing.amount}
                                  </Typography>
                                </Box>
                              </Stack>

                              {ing.dataOptions &&
                                ing.dataOptions.length > 0 && (
                                  <Box
                                    sx={{
                                      mt: 1,
                                      pt: 1,
                                      borderTop:
                                        "1px dashed rgba(255,255,255,0.1)",
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "rgba(255,255,255,0.5)",
                                        mb: 1,
                                        display: "block",
                                      }}
                                    >
                                      OPÇÕES DISPONÍVEIS:
                                    </Typography>
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      flexWrap="wrap"
                                      useFlexGap
                                    >
                                      {ing.dataOptions.map((opt: any) => (
                                        <ItemChip
                                          key={opt.id}
                                          id={opt.id}
                                          icon={opt.icon}
                                          size="small"
                                          name={opt.name}
                                          isBest={opt.id === ing.bestOptionId}
                                          type={
                                            ing.type === "category"
                                              ? opt.type || "item"
                                              : ing.type
                                          }
                                        />
                                      ))}
                                    </Stack>
                                  </Box>
                                )}
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Stack>
                </Paper>

                {/* Products */}
                <Paper elevation={0} sx={{ p: 2 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Construction color="primary" />
                      <Typography variant="h6" fontWeight={700}>
                        Produtos
                      </Typography>
                    </Stack>
                    <Grid container spacing={1}>
                      {products.map((p: any, idx: number) => (
                        <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                          <Box
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
                            <ItemChip
                              id={p.id}
                              icon={p.data?.icon}
                              amount={p.amount}
                              type={p.type}
                            />
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Link
                                to={`/game/${gameId}/${p.type === "entity" ? "entity" : "items"}/view/${p.id}`}
                                style={{
                                  textDecoration: "none",
                                  color: "inherit",
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  sx={{
                                    lineHeight: 1.2,
                                    "&:hover": { color: "primary.main" },
                                  }}
                                >
                                  {p.name || p.data?.name || p.id}
                                </Typography>
                              </Link>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Quantidade: {p.amount}
                              </Typography>
                            </Box>
                          </Box>

                          {p.dataOptions && p.dataOptions.length > 0 && (
                            <Box
                              sx={{
                                mt: 1,
                                p: 1,
                                pt: 1,
                                borderTop: "1px dashed rgba(255,255,255,0.1)",
                                backgroundColor: "rgba(255,255,255,0.01)",
                                borderRadius: "0 0 8px 8px",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "rgba(255,255,255,0.5)",
                                  mb: 1,
                                  display: "block",
                                }}
                              >
                                PODE PRODUZIR QUALQUER UM DESTES:
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                useFlexGap
                              >
                                {p.dataOptions.map((opt: any) => (
                                  <ItemChip
                                    key={opt.id}
                                    id={opt.id}
                                    icon={opt.icon}
                                    size="small"
                                    name={opt.name}
                                    type={
                                      p.type === "category"
                                        ? opt.type || "item"
                                        : p.type
                                    }
                                  />
                                ))}
                              </Stack>
                            </Box>
                          )}
                        </Grid>
                      ))}
                    </Grid>
                  </Stack>
                </Paper>
              </Stack>
            )}
          </>
        </DetainContainer>
      )}
      {activeTab === 1 && tree && treeOptions && (
        <ProductionFlow
          tree={tree}
          allRecipesByProduct={treeOptions.allRecipesByProduct}
          onSelectCategory={(catId) => {
            setActiveCategorySelection(catId);
            setIsDialogOpen(true);
          }}
          onSelectRecipe={(itemId) => {
            setActiveRecipeSelection(itemId);
            setIsRecipeDialogOpen(true);
          }}
        />
      )}

      {activeTab === 2 && tree && treeOptions && (
        <CraftingTreeCard
          itemId={tree.id}
          amount={1}
          type="item"
          options={treeOptions}
          onSelectCategory={(catId) => {
            setActiveCategorySelection(catId);
            setIsDialogOpen(true);
          }}
        />
      )}

      {/* Selectors */}
      <GameDataSelector
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setActiveCategorySelection(null);
        }}
        onConfirm={(selection) => {
          if (activeCategorySelection) {
            setCategoryChoices((prev) => ({
              ...prev,
              [activeCategorySelection]: selection.id,
            }));
          }
          setIsDialogOpen(false);
          setActiveCategorySelection(null);
        }}
        gameId={gameId || ""}
        activeCategory={activeCategorySelection || undefined}
        initialSelectionId={
          activeCategorySelection
            ? categoryChoices[activeCategorySelection]
            : undefined
        }
      />

      <StyledDialog
        open={isRecipeDialogOpen}
        onClose={() => setIsRecipeDialogOpen(false)}
        title="Selecionar Receita Alternativa"
        maxWidth="sm"
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Escolha qual receita utilizar para produzir{" "}
            <strong>
              {activeRecipeSelection &&
                treeOptions?.itemMap.get(activeRecipeSelection)?.name}
            </strong>
            :
          </Typography>
          <Stack spacing={2}>
            {activeRecipeSelection &&
              treeOptions?.allRecipesByProduct
                ?.get(activeRecipeSelection)
                ?.map((recipe) => (
                  <Paper
                    key={recipe.id}
                    onClick={() => {
                      setRecipeChoices((prev) => ({
                        ...prev,
                        [activeRecipeSelection]: recipe.id,
                      }));
                      setIsRecipeDialogOpen(false);
                    }}
                    sx={{
                      p: 2,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor:
                        recipeChoices[activeRecipeSelection] === recipe.id
                          ? "primary.main"
                          : "divider",
                      backgroundColor:
                        recipeChoices[activeRecipeSelection] === recipe.id
                          ? "rgba(25, 118, 210, 0.1)"
                          : "transparent",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {recipe.name || `Receita ${recipe.id}`}
                    </Typography>
                    {recipe.stations && recipe.stations.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Estação: {recipe.stations.join(", ")}
                      </Typography>
                    )}
                    <Box
                      sx={{
                        mt: 1,
                        display: "flex",
                        gap: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      {recipe.ingredients?.map((ing, idx) => (
                        <ItemChip
                          key={idx}
                          id={ing.id}
                          amount={ing.amount}
                          size="small"
                          type={ing.type}
                          disableLink
                        />
                      ))}
                    </Box>
                  </Paper>
                ))}
          </Stack>
        </Box>
      </StyledDialog>
    </StyledContainer>
  );
}
