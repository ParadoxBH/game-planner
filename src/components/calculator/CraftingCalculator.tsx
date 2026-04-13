import { useState, useMemo, useEffect } from "react";
import {
  Typography,
  Paper,
  Grid,
  TextField,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  Card,
  CircularProgress,
} from "@mui/material";
import { useParams } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { ItemChip } from "../common/ItemChip";
import { HelpOutline, Add, Delete, ClearAll } from "@mui/icons-material";
import { getPublicUrl } from "../../utils/pathUtils";
import { StyledContainer } from "../common/StyledContainer";
import { GameDataSelector } from "../common/GameDataSelector";
import { getCraftingTotals } from "../../utils/craftingTree";
import type { TreeOptions, CraftingTotals } from "../../utils/craftingTree";
import type {
  Item,
  Entity,
  Recipe,
} from "../../types/gameModels";
import { recipeRepository } from "../../repositories/RecipeRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { entityRepository } from "../../repositories/EntityRepository";

interface SelectedItem {
  id: string;
  type: string;
  amount: number;
}

export function CraftingCalculator() {
  const { gameId } = useParams<{ gameId: string }>();
  const { loading: dbLoading } = useApi(gameId);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [selectedList, setSelectedList] = useState<SelectedItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryChoices, setCategoryChoices] = useState<
    Record<string, string>
  >({});
  const [activeCategorySelection, setActiveCategorySelection] = useState<
    string | null
  >(null);

  // Fetch data
  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    Promise.all([
      recipeRepository.getAll(),
      itemRepository.getAll(),
      entityRepository.getAll()
    ]).then(([allRecipes, allItems, allEntities]) => {
      if (!isMounted) return;
      setRecipes(allRecipes);
      setItems(allItems);
      setEntities(allEntities);
      setDataLoading(false);
    }).catch(err => {
      console.error("Error fetching calculator data:", err);
      if (isMounted) setDataLoading(false);
    });

    return () => { isMounted = false; };
  }, [dbLoading]);

  const itemMap = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const entityMap = useMemo(() => {
    const map = new Map<string, Entity>();
    entities.forEach((entity) => map.set(entity.id, entity));
    return map;
  }, [entities]);

  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes.forEach((recipe) => {
      // Index by legacy itemId or products
      if (recipe.itemId) {
        map.set(recipe.itemId, recipe);
      }
      recipe.products?.forEach((product) => {
        map.set(product.id, recipe);
      });
    });
    return map;
  }, [recipes]);

  const { totalResourcesMap, unresolvedCategories } = useMemo(() => {
    if (selectedList.length === 0 || !recipeMap)
      return {
        totalResourcesMap: new Map<string, number>(),
        unresolvedCategories: new Set<string>(),
      };

    const totals = new Map<string, number>();
    const unresolved = new Set<string>();
    
    const options: TreeOptions = {
      itemMap,
      entityMap,
      recipeMapByProduct: recipeMap,
      categoryChoices
    };

    const cache = new Map<string, CraftingTotals>();

    selectedList.forEach((item) => {
      // Check for unresolved categories first
      if (item.type === "category" && !categoryChoices[item.id]) {
        unresolved.add(item.id);
        const currentTotal = totals.get(`category:${item.id}`) || 0;
        totals.set(`category:${item.id}`, currentTotal + item.amount);
        return;
      }

      const itemTotals = getCraftingTotals(item.id, item.amount, item.type, options, cache);
      
      itemTotals.baseResources.forEach((amt, id) => {
        const current = totals.get(id) || 0;
        totals.set(id, current + amt);
      });
    });

    return { totalResourcesMap: totals, unresolvedCategories: unresolved };
  }, [selectedList, itemMap, entityMap, recipeMap, categoryChoices]);

  const resourcesList = Array.from(totalResourcesMap.entries()).map(
    ([id, amount]) => {
      const isCategory = id.startsWith("category:");
      const actualId = isCategory ? id.replace("category:", "") : id;

      const item = itemMap.get(actualId);
      const entity = entityMap.get(actualId);
      const buyPrice = item?.buyPrice ?? entity?.buyPrice ?? 0;

      const choiceId = isCategory ? categoryChoices[actualId] : undefined;
      const choiceItem = choiceId ? itemMap.get(choiceId) : undefined;

      return {
        id: actualId,
        amount,
        item,
        entity,
        buyPrice,
        totalCost: buyPrice * amount,
        isCategory,
        choiceItem,
      };
    },
  );

  const grandTotalCost = useMemo(() => {
    return resourcesList.reduce((acc, res) => acc + res.totalCost, 0);
  }, [resourcesList]);

  const totalRevenue = useMemo(() => {
    return selectedList.reduce((acc, item) => {
      const data =
        item.type === "item" ? itemMap.get(item.id) : entityMap.get(item.id);
      const sellPrice = data?.sellPrice ?? 0;
      return acc + sellPrice * item.amount;
    }, 0);
  }, [selectedList, itemMap, entityMap]);

  const profit = totalRevenue - grandTotalCost;

  const handleOpenDialog = () => {
    setActiveCategorySelection(null);
    setIsDialogOpen(true);
  };

  const handleOpenCategoryDialog = (categoryId: string) => {
    setActiveCategorySelection(categoryId);
    setIsDialogOpen(true);
  };

  const handleConfirmSelection = (selection: { id: string; type: string }) => {
    if (activeCategorySelection) {
      setCategoryChoices((prev) => ({
        ...prev,
        [activeCategorySelection]: selection.id,
      }));
    } else {
      setSelectedList((prev) => {
        const existing = prev.find(
          (i) => i.id === selection.id && i.type === selection.type,
        );
        if (existing) {
          return prev.map((i) =>
            i.id === selection.id && i.type === selection.type
              ? { ...i, amount: i.amount + 1 }
              : i,
          );
        }
        return [...prev, { ...selection, amount: 1 }];
      });
    }
    setIsDialogOpen(false);
    setActiveCategorySelection(null);
  };

  const handleRemoveItem = (id: string, type: string) => {
    setSelectedList((prev) =>
      prev.filter((i) => !(i.id === id && i.type === type)),
    );
  };

  const handleUpdateAmount = (id: string, type: string, amount: number) => {
    setSelectedList((prev) =>
      prev.map((i) =>
        i.id === id && i.type === type
          ? { ...i, amount: Math.max(1, amount) }
          : i,
      ),
    );
  };

  if (dbLoading || dataLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <StyledContainer
      title="Calculadora de Crafting"
      label="Crie uma lista de itens para calcular o total de recursos base necessários."
    >
      <Stack direction={"row"} spacing={2} flex={1} overflow={"hidden"}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          <Stack spacing={1} overflow={"hidden"} flex={1}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
            >
              <Typography
                variant="subtitle2"
                sx={{ color: "primary.main", fontWeight: 800 }}
              >
                LISTA DE CRAFTING
              </Typography>
              <Stack direction="row" spacing={1}>
                {selectedList.length > 0 && (
                  <Button
                    startIcon={<ClearAll />}
                    variant="text"
                    color="inherit"
                    size="small"
                    onClick={() => setSelectedList([])}
                    sx={{ opacity: 0.6 }}
                  >
                    Limpar
                  </Button>
                )}
                <Button
                  startIcon={<Add />}
                  variant="contained"
                  size="small"
                  onClick={handleOpenDialog}
                >
                  Adicionar
                </Button>
              </Stack>
            </Stack>

            <Divider />

            {selectedList.length === 0 ? (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 8,
                  opacity: 0.5,
                }}
              >
                <Typography variant="body2" gutterBottom>
                  Nenhum item adicionado à lista.
                </Typography>
                <Typography variant="caption">
                  Clique em "Adicionar" para começar.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ flex: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          border: "none",
                          color: "text.secondary",
                          fontSize: "0.7rem",
                        }}
                      >
                        ITEM/ENTIDADE
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "none",
                          color: "text.secondary",
                          fontSize: "0.7rem",
                        }}
                        align="center"
                      >
                        QTD
                      </TableCell>
                      <TableCell
                        sx={{
                          border: "none",
                          color: "text.secondary",
                          fontSize: "0.7rem",
                        }}
                        align="right"
                      ></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedList.map((item) => {
                      const data =
                        item.type === "item"
                          ? itemMap.get(item.id)
                          : entityMap.get(item.id);
                      return (
                        <TableRow key={`${item.type}-${item.id}`}>
                          <TableCell
                            sx={{
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              py: 1,
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={1.5}
                              alignItems="center"
                            >
                              <ItemChip
                                id={item.id}
                                icon={data?.icon}
                                amount={0}
                                size="small"
                                disableLink
                              />
                              <Typography variant="body2" fontWeight={500}>
                                {data?.name || item.id}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell
                            sx={{
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              py: 1,
                            }}
                            align="center"
                          >
                            <TextField
                              type="number"
                              size="small"
                              value={item.amount}
                              onChange={(e) =>
                                handleUpdateAmount(
                                  item.id,
                                  item.type,
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              inputProps={{
                                min: 1,
                                style: {
                                  textAlign: "center",
                                  padding: "4px 8px",
                                },
                              }}
                              sx={{ width: 60 }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              py: 1,
                            }}
                            align="right"
                          >
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleRemoveItem(item.id, item.type)
                              }
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{ display: "flex", p: 2, borderRadius: 2, flex: 1 }}
        >
          <Stack spacing={1} overflow={"hidden"} flex={1}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography
                variant="subtitle2"
                sx={{ color: "primary.main", fontWeight: 800 }}
              >
                RECURSOS TOTAIS NECESSÁRIOS
              </Typography>
              <Tooltip title="Esta calculadora decompõe todos os itens até seus materiais básicos (recursos que não possuem receita).">
                <IconButton size="small" sx={{ color: "text.secondary" }}>
                  <HelpOutline fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            <Divider />

            {unresolvedCategories.size > 0 && (
              <Alert
                severity="warning"
                variant="filled"
                sx={{ borderRadius: 2 }}
              >
                <AlertTitle sx={{ fontWeight: 800 }}>
                  ESCOLHAS PENDENTES
                </AlertTitle>
                Algumas receitas usam categorias de itens. Selecione os itens
                específicos abaixo para calcular os custos.
              </Alert>
            )}

            <Stack flex={1} overflow={"auto"}>
              {selectedList.length === 0 ? (
                <Stack alignItems={"center"} justifyContent={"center"} flex={1}>
                  <Typography
                    variant="body1"
                    sx={{
                      opacity: 0.3,
                    }}
                  >
                    Adicione itens para ver os recursos necessários.
                  </Typography>
                </Stack>
              ) : (
                <Grid spacing={1} container>
                  {resourcesList.map((res) => (
                    <Grid
                      size={6}
                      key={`${res.isCategory ? "cat-" : "id-"}${res.id}`}
                      sx={{ display: "flex" }}
                    >
                      <Card
                        sx={{
                          display: "flex",
                          flex: 1,
                          p: 1.5,
                          borderRadius: 1,
                          backgroundColor: res.isCategory
                            ? "rgba(255, 172, 0, 0.05)"
                            : "rgba(255,255,255,0.03)",
                          border: "1px solid",
                          borderColor: res.isCategory
                            ? "warning.main"
                            : "divider",
                        }}
                      >
                        <Stack
                          direction="column"
                          spacing={1}
                          alignItems="stretch"
                          justifyContent={"space-between"}
                          flex={1}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <ItemChip
                              key={res.id}
                              id={res.id}
                              icon={
                                res.isCategory
                                  ? undefined
                                  : res.item?.icon || res.entity?.icon
                              }
                              amount={res.amount}
                              size="medium"
                              disableLink
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body2"
                                fontWeight={res.isCategory ? 700 : 500}
                                sx={{ fontSize: "0.85rem" }}
                              >
                                {res.isCategory
                                  ? `Categoria: ${res.id.toUpperCase()}`
                                  : res.item?.name ||
                                    res.entity?.name ||
                                    res.id}
                              </Typography>
                              {res.isCategory && res.choiceItem && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "primary.main",
                                    fontWeight: 600,
                                  }}
                                >
                                  → {res.choiceItem.name}
                                </Typography>
                              )}
                            </Box>
                          </Stack>

                          {res.isCategory ? (
                            <Box
                              sx={{
                                mt: 1,
                                display: "flex",
                                gap: 1,
                                alignItems: "center",
                              }}
                            >
                              {res.choiceItem && (
                                <ItemChip
                                  key={res.choiceItem.id}
                                  id={res.choiceItem.id}
                                  icon={res.choiceItem.icon}
                                  amount={0}
                                  size="small"
                                  disableLink
                                />
                              )}
                              <Button
                                size="small"
                                variant="outlined"
                                color={res.choiceItem ? "primary" : "warning"}
                                sx={{
                                  flex: 1,
                                  textTransform: "none",
                                  borderStyle: res.choiceItem
                                    ? "solid"
                                    : "dashed",
                                  fontSize: "0.75rem",
                                  py: 0.5,
                                }}
                                onClick={() => handleOpenCategoryDialog(res.id)}
                              >
                                {res.choiceItem
                                  ? "Alterar Escolha"
                                  : "Selecionar Item..."}
                              </Button>
                            </Box>
                          ) : (
                            res.buyPrice > 0 && (
                              <Box
                                sx={{
                                  mt: 1,
                                  pt: 1,
                                  borderTop: "1px solid rgba(255,255,255,0.05)",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{ opacity: 0.6 }}
                                >
                                  Custo Compra
                                </Typography>
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  alignItems="center"
                                >
                                  <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color="primary.main"
                                  >
                                    {res.totalCost.toLocaleString()}
                                  </Typography>
                                  <Box
                                    component="img"
                                    src={getPublicUrl("/img/heartopia/stats/ouro.png")}
                                    sx={{ width: 12, height: 12 }}
                                    alt="Ouro"
                                  />
                                </Stack>
                              </Box>
                            )
                          )}
                        </Stack>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>

            {totalResourcesMap.size > 0 && unresolvedCategories.size === 0 && (
              <Stack spacing={1}>
                <Stack spacing={1}>
                  {grandTotalCost > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        opacity: 0.8,
                      }}
                    >
                      <Typography variant="caption" fontWeight={600}>
                        CUSTO TOTAL DE COMPRA
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" fontWeight={700}>
                          {grandTotalCost.toLocaleString()}
                        </Typography>
                        <Box
                          component="img"
                          src={getPublicUrl("/img/heartopia/stats/ouro.png")}
                          sx={{ width: 12, height: 12 }}
                          alt="Ouro"
                        />
                      </Stack>
                    </Box>
                  )}
                  {totalRevenue > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        opacity: 0.8,
                      }}
                    >
                      <Typography variant="caption" fontWeight={600}>
                        RECEITA TOTAL DE VENDA
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" fontWeight={700}>
                          {totalRevenue.toLocaleString()}
                        </Typography>
                        <Box
                          component="img"
                          src={getPublicUrl("/img/heartopia/stats/ouro.png")}
                          sx={{ width: 12, height: 12 }}
                          alt="Ouro"
                        />
                      </Stack>
                    </Box>
                  )}
                </Stack>

                <Paper
                  elevation={0}
                  sx={{
                    p: 1,
                    px: 2,
                    borderRadius: 1,
                    backgroundColor:
                      profit >= 0 ? "primary.main" : "error.main",
                    color: "primary.contrastText",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: `0 4px 20px ${profit >= 0 ? "rgba(255, 68, 0, 0.2)" : "rgba(211, 47, 47, 0.2)"}`,
                  }}
                >
                  <Stack alignItems={"start"}>
                    <Typography
                      variant="overline"
                      sx={{
                        lineHeight: 1,
                        display: "block",
                        opacity: 0.8,
                        fontWeight: 700,
                      }}
                    >
                      {profit >= 0 ? "LUCRO ESTIMADO" : "PREJUÍZO ESTIMADO"}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={800}>
                      RESUMO FINANCEIRO
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" fontWeight={900}>
                      {(profit >= 0
                        ? profit
                        : Math.abs(profit)
                      ).toLocaleString()}
                    </Typography>
                    <Box
                      component="img"
                      src={getPublicUrl("/img/heartopia/stats/ouro.png")}
                      sx={{
                        width: 24,
                        height: 24,
                        filter: "brightness(0) invert(1)",
                      }}
                      alt="Ouro"
                    />
                  </Stack>
                </Paper>
              </Stack>
            )}
          </Stack>
        </Paper>

        <GameDataSelector
          open={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setActiveCategorySelection(null);
          }}
          onConfirm={handleConfirmSelection}
          gameId={gameId || ""}
          activeCategory={activeCategorySelection || undefined}
          initialSelectionId={
            activeCategorySelection
              ? categoryChoices[activeCategorySelection]
              : undefined
          }
        />
      </Stack>
    </StyledContainer>
  );
}
