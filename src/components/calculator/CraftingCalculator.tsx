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
import { recipeRepository } from "../../repositories/RecipeRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { shopRepository } from "../../repositories/ShopRepository";
import type { Item, Entity, Recipe, Shop } from "../../types/gameModels";

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
  const [shops, setShops] = useState<Shop[]>([]);
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
      entityRepository.getAll(),
      shopRepository.getAll()
    ]).then(([allRecipes, allItems, allEntities, allShops]) => {
      if (!isMounted) return;
      setRecipes(allRecipes);
      setItems(allItems);
      setEntities(allEntities);
      setShops(allShops);
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

  const { itemToShopIdMap, shopNames, shopItemPrices } = useMemo(() => {
    const shopIdMap = new Map<string, string>();
    const namesMap = new Map<string, string>();
    const pricesMap = new Map<string, { price: number; quant?: number; currency?: string; shopName?: string }>();

    shops.forEach((shop) => {
      namesMap.set(shop.id, shop.name);
      shop.groups?.forEach((group) => {
        group.items?.forEach((shopItem) => {
          shopIdMap.set(shopItem.id, shop.id);
          const current = pricesMap.get(shopItem.id);
          const quant = shopItem.quant && shopItem.quant > 1 ? shopItem.quant : 1;
          const newUnitPrice = (shopItem.price || 0) / quant;
          if (!current || newUnitPrice < (current.price / (current.quant && current.quant > 1 ? current.quant : 1))) {
            pricesMap.set(shopItem.id, {
              price: shopItem.price || 0,
              quant: shopItem.quant,
              currency: shopItem.currency || "ouro",
              shopName: shop.name,
            });
          }
        });
      });
    });
    return { itemToShopIdMap: shopIdMap, shopNames: namesMap, shopItemPrices: pricesMap };
  }, [shops]);

  const { totalResourcesMap, totalShopPurchasesMap, unresolvedCategories } = useMemo(() => {
    if (selectedList.length === 0 || !recipeMap)
      return {
        totalResourcesMap: new Map<string, number>(),
        totalShopPurchasesMap: new Map<string, { amount: number; unitPrice: number; currency: string; shopName?: string }>(),
        unresolvedCategories: new Set<string>(),
      };

    const totals = new Map<string, number>();
    const shopPurchasesTotals = new Map<string, { amount: number; unitPrice: number; currency: string; shopName?: string }>();
    const unresolved = new Set<string>();
    
    const options: TreeOptions = {
      itemMap,
      entityMap,
      recipeMapByProduct: recipeMap,
      categoryChoices,
      shopMap: itemToShopIdMap,
      shopNames,
      shopItemPrices,
    };

    const cache = new Map<string, CraftingTotals>();

    selectedList.forEach((item) => {
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
      itemTotals.shopPurchases?.forEach((purchase, id) => {
        const existing = shopPurchasesTotals.get(id);
        if (existing) {
          existing.amount += purchase.amount;
        } else {
          shopPurchasesTotals.set(id, { ...purchase });
        }
      });
    });

    return { totalResourcesMap: totals, totalShopPurchasesMap: shopPurchasesTotals, unresolvedCategories: unresolved };
  }, [selectedList, itemMap, entityMap, recipeMap, categoryChoices, itemToShopIdMap, shopNames, shopItemPrices]);

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
        amount: Number(amount.toFixed(2)),
        item,
        entity,
        buyPrice,
        totalCost: buyPrice * amount,
        isCategory,
        choiceItem,
      };
    },
  );

  const shopPurchasesList = useMemo(() => {
    return Array.from(totalShopPurchasesMap.entries()).map(([id, p]) => {
      const item = itemMap.get(id);
      const entity = entityMap.get(id);
      const priceInfo = shopItemPrices.get(id);
      const bundleSize = priceInfo?.quant && priceInfo.quant > 0 ? priceInfo.quant : 1;
      const neededAmount = Number(p.amount.toFixed(2));
      const bundles = Math.ceil(neededAmount / bundleSize);
      const purchasedAmount = Number((bundles * bundleSize).toFixed(2));
      const leftover = Number(Math.max(0, purchasedAmount - neededAmount).toFixed(2));
      const totalCost = bundles * (priceInfo ? priceInfo.price : (p.unitPrice * bundleSize));

      return {
        id,
        neededAmount,
        amount: purchasedAmount,
        leftover,
        bundleSize,
        bundles,
        unitPrice: p.unitPrice,
        currency: p.currency,
        shopName: p.shopName || priceInfo?.shopName,
        totalCost,
        item,
        entity,
      };
    });
  }, [totalShopPurchasesMap, itemMap, entityMap, shopItemPrices]);

  const grandTotalCost = useMemo(() => {
    const resCost = resourcesList.reduce((acc, res) => acc + res.totalCost, 0);
    const shopGoldCost = shopPurchasesList
      .filter(p => !p.currency || p.currency === "ouro")
      .reduce((acc, p) => acc + p.totalCost, 0);
    return resCost + shopGoldCost;
  }, [resourcesList, shopPurchasesList]);

  const otherCurrenciesTotals = useMemo(() => {
    const map = new Map<string, number>();
    shopPurchasesList.forEach(p => {
      if (p.currency && p.currency !== "ouro") {
        map.set(p.currency, (map.get(p.currency) || 0) + p.totalCost);
      }
    });
    return Array.from(map.entries());
  }, [shopPurchasesList]);

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
                  {shopPurchasesList.map((sp) => (
                    <Grid
                      size={6}
                      key={`sp-${sp.id}`}
                      sx={{ display: "flex" }}
                    >
                      <Card
                        sx={{
                          display: "flex",
                          flex: 1,
                          p: 1.5,
                          borderRadius: 1,
                          backgroundColor: "rgba(0, 150, 255, 0.05)",
                          border: "1px solid",
                          borderColor: "primary.main",
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
                              key={sp.id}
                              id={sp.id}
                              icon={sp.item?.icon || sp.entity?.icon}
                              amount={sp.amount}
                              size="medium"
                              disableLink
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body2"
                                fontWeight={500}
                                sx={{ fontSize: "0.85rem" }}
                              >
                                {sp.item?.name || sp.entity?.name || sp.id}
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography
                                  variant="caption"
                                  sx={{ color: "primary.main", fontWeight: 600 }}
                                >
                                  Loja: {sp.shopName || "NPC"}
                                </Typography>
                                {sp.leftover > 0 && (
                                  <Tooltip title={`Para obter ${sp.neededAmount} un, é preciso comprar ${sp.bundles} pacote(s) de ${sp.bundleSize} un, restando ${sp.leftover} un de sobra.`}>
                                    <Typography
                                      variant="caption"
                                      sx={{ color: "warning.light", fontWeight: 700, px: 0.8, py: 0.2, backgroundColor: "warning.dark" + "44", border: "1px solid", borderColor: "warning.main", borderRadius: 1 }}
                                    >
                                      Sobram: {sp.leftover} un
                                    </Typography>
                                  </Tooltip>
                                )}
                              </Stack>
                            </Box>
                          </Stack>
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
                            <Typography variant="caption" sx={{ opacity: 0.6 }}>
                              Custo
                            </Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography variant="caption" fontWeight={700} color={sp.currency === 'BRL' || sp.currency === 'rmt_br' ? 'success.main' : 'primary.main'}>
                                {sp.currency === 'ouro' ? Math.round(sp.totalCost).toLocaleString() : sp.totalCost.toFixed(2)}
                              </Typography>
                              {sp.currency === 'ouro' ? (
                                <Box component="img" src={getPublicUrl("/img/heartopia/stats/ouro.png")} sx={{ width: 14, height: 14 }} alt="Ouro" />
                              ) : itemMap.get(sp.currency)?.icon ? (
                                <Tooltip title={itemMap.get(sp.currency)?.name || sp.currency}>
                                  <Box component="img" src={getPublicUrl(itemMap.get(sp.currency)!.icon)} sx={{ width: 14, height: 14, objectFit: 'contain' }} alt={sp.currency} />
                                </Tooltip>
                              ) : (
                                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.65rem', color: sp.currency === 'BRL' || sp.currency === 'rmt_br' ? 'success.main' : 'primary.main' }}>
                                  {sp.currency}
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>

            {(totalResourcesMap.size > 0 || totalShopPurchasesMap.size > 0) && unresolvedCategories.size === 0 && (
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
                        CUSTO TOTAL DE COMPRA (OURO)
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" fontWeight={700}>
                          {grandTotalCost.toLocaleString()}
                        </Typography>
                        <Box
                          component="img"
                          src={getPublicUrl("/img/heartopia/stats/ouro.png")}
                          sx={{ width: 14, height: 14 }}
                          alt="Ouro"
                        />
                      </Stack>
                    </Box>
                  )}
                  {otherCurrenciesTotals.map(([curr, total]) => {
                    const currItem = itemMap.get(curr);
                    return (
                      <Box
                        key={`total-${curr}`}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          opacity: 0.8,
                        }}
                      >
                        <Typography variant="caption" fontWeight={600} sx={{ color: curr === 'rmt_br' || curr === 'BRL' ? 'success.light' : 'primary.light' }}>
                          CUSTO TOTAL DE COMPRA ({currItem?.name ? currItem.name.toUpperCase() : curr.toUpperCase()})
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography variant="caption" fontWeight={700} sx={{ color: curr === 'rmt_br' || curr === 'BRL' ? 'success.main' : 'primary.main' }}>
                            {total.toFixed(2)}
                          </Typography>
                          {currItem?.icon ? (
                            <Tooltip title={currItem.name}>
                              <Box component="img" src={getPublicUrl(currItem.icon)} sx={{ width: 14, height: 14, objectFit: 'contain' }} alt={curr} />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.65rem', color: curr === 'rmt_br' || curr === 'BRL' ? 'success.main' : 'primary.main' }}>
                              {curr}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
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
