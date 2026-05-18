import { useState, useMemo, useEffect } from "react";
import {
  Typography,
  Stack,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  InputAdornment,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { getPublicUrl } from "../../utils/pathUtils";
import { useParams } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { ItemChip } from "../common/ItemChip";
import { StyledContainer } from "../common/StyledContainer";
import { getCraftingTotals } from "../../utils/craftingTree";
import type { TreeOptions, CraftingTotals } from "../../utils/craftingTree";
import type {
  Item,
  Entity,
  Recipe,
  Shop,
} from "../../types/gameModels";
import { recipeRepository } from "../../repositories/RecipeRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { shopRepository } from "../../repositories/ShopRepository";

type Order = "asc" | "desc";

interface CraftProfitData {
  id: string;
  name: string;
  icon?: string;
  baseCost: number;
  sellPrice: number;
  profit: number;
  steps: number;
  station?: string;
  nonPurchasable: { id: string; amount: number }[];
  shopPurchases: { id: string; amount: number; unitPrice: number; currency: string; shopName?: string }[];
}

export function ProfitabilityCalculator() {
  const { gameId } = useParams<{ gameId: string }>();
  const { loading: dbLoading } = useApi(gameId);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState<keyof CraftProfitData>("profit");
  const [order, setOrder] = useState<Order>("desc");

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
      console.error("Error fetching profitability calculator data:", err);
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

  const recipeMapByProduct = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes.forEach((recipe) => {
      if (recipe.itemId) {
        map.set(recipe.itemId, recipe);
      }
      recipe.products?.forEach((product) => {
        map.set(product.id, recipe);
      });
    });
    return map;
  }, [recipes]);

  const calculateBaseCostAndSteps = useMemo(() => {
    const options: TreeOptions = {
        itemMap,
        entityMap,
        recipeMapByProduct,
        shopMap: itemToShopIdMap,
        shopNames,
        shopItemPrices,
    };

    const cache = new Map<string, CraftingTotals>();

    return (id: string, type: string = "item") => {
        return getCraftingTotals(id, 1, type, options, cache);
    };
  }, [itemMap, entityMap, recipeMapByProduct, itemToShopIdMap, shopNames, shopItemPrices]);

  const profitData = useMemo(() => {
    if (dataLoading || !itemMap.size) return [];

    const data: CraftProfitData[] = [];
    const processedItems = new Set<string>();

    recipes.forEach((recipe) => {
      const productIds = new Set<string>();
      if (recipe.itemId) productIds.add(recipe.itemId);
      recipe.products?.forEach((p) => productIds.add(p.id));

      productIds.forEach((id) => {
        if (processedItems.has(id)) return;
        processedItems.add(id);

        const item = itemMap.get(id);
        if (!item) return;

        const { totalCost, recipeIds, shopIds, baseResources, shopPurchases } = calculateBaseCostAndSteps(id);
        const sellPrice = item.sellPrice || 0;

        data.push({
          id,
          name: item.name,
          icon: item.icon,
          baseCost: totalCost,
          sellPrice,
          profit: sellPrice - totalCost,
          steps: recipeIds.size + shopIds.size,
          nonPurchasable: Array.from(baseResources.entries()).map(
            ([npId, amount]) => ({ id: npId, amount }),
          ),
          shopPurchases: Array.from(shopPurchases.values()),
          station: recipe.stations?.[0] || recipe.ProducedIn?.[0],
        });
      });
    });

    shopItemPrices.forEach((priceInfo, id) => {
      if (processedItems.has(id)) return;
      processedItems.add(id);

      const item = itemMap.get(id) || entityMap.get(id);
      if (!item) return;

      const { totalCost, recipeIds, shopIds, baseResources, shopPurchases } = calculateBaseCostAndSteps(id);
      const sellPrice = item.sellPrice || 0;

      data.push({
        id,
        name: item.name,
        icon: item.icon,
        baseCost: totalCost,
        sellPrice,
        profit: sellPrice - totalCost,
        steps: recipeIds.size + shopIds.size + 1,
        nonPurchasable: Array.from(baseResources.entries()).map(
          ([npId, amount]) => ({ id: npId, amount }),
        ),
        shopPurchases: Array.from(shopPurchases.values()),
        station: `Loja (${priceInfo.shopName || "NPC"})`,
      });
    });

    return data;
  }, [recipes, itemMap, entityMap, shopItemPrices, calculateBaseCostAndSteps, dataLoading]);

  const filteredAndSortedData = useMemo(() => {
    let result = profitData.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    result.sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return order === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return order === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return result;
  }, [profitData, searchTerm, orderBy, order]);

  const handleRequestSort = (property: keyof CraftProfitData) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
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
      title="Calculadora de Rentabilidade"
      label="Listagem detalhada de todos os crafts com custos base, lucro e etapas de produção."
    >
      <Stack spacing={2} overflow={"hidden"}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "name"}
                    direction={orderBy === "name" ? order : "asc"}
                    onClick={() => handleRequestSort("name")}
                  >
                    Item
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "baseCost"}
                    direction={orderBy === "baseCost" ? order : "asc"}
                    onClick={() => handleRequestSort("baseCost")}
                  >
                    Custo Base
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "sellPrice"}
                    direction={orderBy === "sellPrice" ? order : "asc"}
                    onClick={() => handleRequestSort("sellPrice")}
                  >
                    Venda
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "profit"}
                    direction={orderBy === "profit" ? order : "asc"}
                    onClick={() => handleRequestSort("profit")}
                  >
                    Lucro
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">
                  <TableSortLabel
                    active={orderBy === "steps"}
                    direction={orderBy === "steps" ? order : "asc"}
                    onClick={() => handleRequestSort("steps")}
                  >
                    Etapas
                  </TableSortLabel>
                </TableCell>
                <TableCell>Estação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedData.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ItemChip
                        key={row.id}
                        id={row.id}
                        icon={row.icon}
                        amount={0}
                        size="small"
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {row.name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="flex-end"
                      alignItems="center"
                    >
                      {row.nonPurchasable.map((np) => {
                        const npItem =
                          itemMap.get(np.id) || entityMap.get(np.id);
                        const amount = Math.ceil(np.amount);
                        return (
                          <Tooltip
                            key={np.id}
                            title={`${npItem?.name || np.id} (x${amount}) [Coletável/Mapa]`}
                          >
                            <Box>
                              <ItemChip
                                key={np.id}
                                id={np.id}
                                icon={npItem?.icon}
                                amount={amount}
                                size="small"
                                disableLink
                              />
                            </Box>
                          </Tooltip>
                        );
                      })}
                      {row.shopPurchases?.map((sp) => {
                        const spItem = itemMap.get(sp.id) || entityMap.get(sp.id);
                        const amount = Math.ceil(sp.amount);
                        const totalCurr = (sp.unitPrice * sp.amount).toFixed(2);
                        return (
                          <Tooltip
                            key={`sp-${sp.id}`}
                            title={`${spItem?.name || sp.id} (x${amount}) - Loja: ${sp.shopName || "NPC"} [${totalCurr} ${sp.currency}]`}
                          >
                            <Box sx={{ position: 'relative' }}>
                              <ItemChip
                                key={sp.id}
                                id={sp.id}
                                icon={spItem?.icon}
                                amount={amount}
                                size="small"
                                disableLink
                              />
                              <Box sx={{ position: 'absolute', bottom: 2, right: 2, width: 8, height: 8, bgcolor: sp.currency === 'BRL' ? 'success.main' : 'primary.main', borderRadius: '50%', border: '1px solid black' }} />
                            </Box>
                          </Tooltip>
                        );
                      })}
                      {Math.round(row.baseCost) > 0 && (
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {Math.round(row.baseCost).toLocaleString()}
                          </Typography>
                          <Box
                            component="img"
                            src={getPublicUrl("/img/heartopia/stats/ouro.png")}
                            sx={{ width: 14, height: 14 }}
                          />
                        </Stack>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    {row.sellPrice > 0 && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                        alignItems="center"
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {row.sellPrice.toLocaleString()}
                        </Typography>
                        <Box
                          component="img"
                          src={getPublicUrl("/img/heartopia/stats/ouro.png")}
                          sx={{ width: 14, height: 14 }}
                        />
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {Math.abs(Math.round(row.profit)) > 0 && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                        alignItems="center"
                      >
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={
                            row.profit > 0
                              ? "success.main"
                              : row.profit < 0
                                ? "error.main"
                                : "text.secondary"
                          }
                        >
                          {Math.round(row.profit).toLocaleString()}
                        </Typography>
                        <Box
                          component="img"
                          src={getPublicUrl("/img/heartopia/stats/ouro.png")}
                          sx={{ width: 14, height: 14 }}
                        />
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{row.steps}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {row.station || "-"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </StyledContainer>
  );
}
