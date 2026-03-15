import { useState, useMemo } from "react";
import {
  Typography,
  Paper,
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
  Divider,
  Tooltip,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useGameData } from "../../hooks/useGameData";
import { ItemChip } from "../common/ItemChip";
import { StyledContainer } from "../common/StyledContainer";
import {
  type Item,
  type Entity,
  type Recipe,
  type RecipeItem,
  type Shop,
} from "../../types/gameModels";

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
}

export function ProfitabilityCalculator() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: recipes } = useGameData<Recipe[]>(gameId || "", "recipes");
  const { data: items } = useGameData<Item[]>(gameId || "", "items");
  const { data: entities } = useGameData<Entity[]>(gameId || "", "entities");
  const { data: shops } = useGameData<Shop[]>(gameId || "", "shops");

  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState<keyof CraftProfitData>("profit");
  const [order, setOrder] = useState<Order>("desc");

  const itemMap = useMemo(() => {
    const map = new Map<string, Item>();
    items?.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const entityMap = useMemo(() => {
    const map = new Map<string, Entity>();
    entities?.forEach((entity) => map.set(entity.id, entity));
    return map;
  }, [entities]);

  const itemToShopIdMap = useMemo(() => {
    const map = new Map<string, string>();
    shops?.forEach((shop) => {
      shop.groups.forEach((group) => {
        group.items.forEach((shopItem) => {
          map.set(shopItem.id, shop.id);
        });
      });
    });
    return map;
  }, [shops]);

  const recipeMapByProduct = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes?.forEach((recipe) => {
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
    const cache = new Map<
      string,
      {
        cost: number;
        recipeIds: Set<string>;
        shopIds: Set<string>;
        nonPurchasable: Map<string, number>;
      }
    >();

    const getRecipeData = (
      id: string,
      type: string = "item",
    ): {
      cost: number;
      recipeIds: Set<string>;
      shopIds: Set<string>;
      nonPurchasable: Map<string, number>;
    } => {
      const cacheKey = `${type}-${id}`;
      if (cache.has(cacheKey)) return cache.get(cacheKey)!;

      const item = itemMap.get(id);
      const entity = entityMap.get(id);
      const recipe = recipeMapByProduct.get(id);
      const shopId = itemToShopIdMap.get(id);

      // If no recipe, it's a base resource
      if (!recipe) {
        const buyPrice = item?.buyPrice ?? entity?.buyPrice ?? 0;
        const nonPurchasable = new Map<string, number>();
        if (buyPrice === 0) nonPurchasable.set(id, 1);

        const shopIds = new Set<string>();
        if (shopId) shopIds.add(shopId);

        return { cost: buyPrice, recipeIds: new Set<string>(), shopIds, nonPurchasable };
      }

      // Calculate from recipe
      let totalCost = 0;
      const combinedRecipeIds = new Set<string>();
      const combinedShopIds = new Set<string>();
      const combinedNonPurchasable = new Map<string, number>();

      combinedRecipeIds.add(recipe.id);

      const ingredients: RecipeItem[] = recipe.ingredients || [];
      ingredients.forEach((ing) => {
        const ingData = getRecipeData(ing.id, ing.type || "item");

        // We need to account for recipe output amount
        let productAmount = recipe.amount || 1;
        const product = recipe.products?.find((p) => p.id === id);
        if (product) productAmount = product.amount;

        const batchesNeeded = ing.amount / productAmount;
        totalCost += ingData.cost * batchesNeeded;

        ingData.recipeIds.forEach((rid) => combinedRecipeIds.add(rid));
        ingData.shopIds.forEach((sid) => combinedShopIds.add(sid));
        ingData.nonPurchasable.forEach((amount, npId) => {
          const current = combinedNonPurchasable.get(npId) || 0;
          combinedNonPurchasable.set(npId, current + amount * batchesNeeded);
        });
      });

      const result = {
        cost: totalCost,
        recipeIds: combinedRecipeIds,
        shopIds: combinedShopIds,
        nonPurchasable: combinedNonPurchasable,
      };
      cache.set(cacheKey, result);
      return result;
    };

    return getRecipeData;
  }, [itemMap, entityMap, recipeMapByProduct, itemToShopIdMap]);

  const profitData = useMemo(() => {
    if (!recipes || !itemMap) return [];

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

        const { cost, recipeIds, shopIds, nonPurchasable } = calculateBaseCostAndSteps(id);
        const sellPrice = item.sellPrice || 0;

        data.push({
          id,
          name: item.name,
          icon: item.icon,
          baseCost: cost,
          sellPrice,
          profit: sellPrice - cost,
          steps: recipeIds.size + shopIds.size,
          nonPurchasable: Array.from(nonPurchasable.entries()).map(
            ([npId, amount]) => ({ id: npId, amount }),
          ),
          station: recipe.stations?.[0] || recipe.ProducedIn?.[0],
        });
      });
    });

    return data;
  }, [recipes, itemMap, calculateBaseCostAndSteps]);

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
                            title={`${npItem?.name || np.id} (x${amount})`}
                          >
                            <ItemChip
                              id={np.id}
                              icon={npItem?.icon}
                              amount={amount}
                              size="small"
                              disableLink
                            />
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
                            src="/img/heartopia/stats/ouro.png"
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
                          src="/img/heartopia/stats/ouro.png"
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
                          src="/img/heartopia/stats/ouro.png"
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
