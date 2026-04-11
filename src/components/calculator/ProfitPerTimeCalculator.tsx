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
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { ItemChip } from "../common/ItemChip";
import { StyledContainer } from "../common/StyledContainer";
import { TimeChip } from "../common/TimeChip";
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
type TimeUnit = "second" | "minute" | "hour" | "day" | "week";

interface CraftProfitData {
  id: string;
  name: string;
  icon?: string;
  baseCost: number;
  sellPrice: number;
  profit: number;
  scaledProfit: number;
  scaledQuantity: number;
  craftTime: number;
  steps: number;
  station?: string;
  nonPurchasable: { id: string; amount: number }[];
}

const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  second: "Segundo",
  minute: "Minuto",
  hour: "Hora",
  day: "Dia",
  week: "Semana",
};

const TIME_UNIT_MULTIPLIERS: Record<TimeUnit, number> = {
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
};

export function ProfitPerTimeCalculator() {
  const { gameId } = useParams<{ gameId: string }>();
  const { loading: dbLoading } = useApi(gameId);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("hour");
  const [orderBy, setOrderBy] = useState<keyof CraftProfitData>("scaledProfit");
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
      console.error("Error fetching profit per time calculator data:", err);
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

  const itemToShopIdMap = useMemo(() => {
    const map = new Map<string, string>();
    shops.forEach((shop) => {
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
        shopMap: itemToShopIdMap
    };

    const cache = new Map<string, CraftingTotals>();

    return (id: string, type: string = "item") => {
        return getCraftingTotals(id, 1, type, options, cache);
    };
  }, [itemMap, entityMap, recipeMapByProduct, itemToShopIdMap]);

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

        const { totalCost, recipeIds, shopIds, baseResources } = calculateBaseCostAndSteps(id);
        const sellPrice = item.sellPrice || 0;
        const profit = sellPrice - totalCost;
        const craftTime = recipe.craftTime || 0;

        if (craftTime <= 0) return;

        const scaledQuantity = TIME_UNIT_MULTIPLIERS[timeUnit] / craftTime;
        const scaledProfit = profit * scaledQuantity;

        data.push({
          id,
          name: item.name,
          icon: item.icon,
          baseCost: totalCost,
          sellPrice,
          profit,
          scaledProfit,
          scaledQuantity,
          craftTime,
          steps: recipeIds.size + shopIds.size,
          nonPurchasable: Array.from(baseResources.entries()).map(
            ([npId, amount]) => ({ id: npId, amount }),
          ),
          station: recipe.stations?.[0] || recipe.ProducedIn?.[0],
        });
      });
    });

    return data;
  }, [recipes, itemMap, calculateBaseCostAndSteps, timeUnit, dataLoading]);

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

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  const handleTimeUnitChange = (
    _event: React.MouseEvent<HTMLElement>,
    newUnit: TimeUnit | null,
  ) => {
    if (newUnit !== null) {
      setTimeUnit(newUnit);
    }
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
      title="Lucro por Tempo"
      label="Cálculo de rentabilidade levando em conta o tempo necessário para produzir cada item."
    >
      <Stack spacing={2} overflow={"hidden"}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <TextField
            sx={{ flexGrow: 1 }}
            variant="outlined"
            placeholder="Buscar item..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <ToggleButtonGroup
            value={timeUnit}
            exclusive
            onChange={handleTimeUnitChange}
            size="small"
            color="primary"
          >
            {Object.entries(TIME_UNIT_LABELS).map(([unit, label]) => (
              <ToggleButton key={unit} value={unit} sx={{ px: 2 }}>
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

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
                        active={orderBy === "profit"}
                        direction={orderBy === "profit" ? order : "asc"}
                        onClick={() => handleRequestSort("profit")}
                    >
                        Lucro Unit.
                    </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "craftTime"}
                    direction={orderBy === "craftTime" ? order : "asc"}
                    onClick={() => handleRequestSort("craftTime")}
                  >
                    Tempo
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "scaledQuantity"}
                    direction={orderBy === "scaledQuantity" ? order : "asc"}
                    onClick={() => handleRequestSort("scaledQuantity")}
                  >
                    Qtd. / {TIME_UNIT_LABELS[timeUnit]}
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === "scaledProfit"}
                    direction={orderBy === "scaledProfit" ? order : "asc"}
                    onClick={() => handleRequestSort("scaledProfit")}
                  >
                    Lucro / {TIME_UNIT_LABELS[timeUnit]}
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
                    {Math.abs(row.profit) > 0.001 && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                        alignItems="center"
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={
                            row.profit > 0
                              ? "success.main"
                              : row.profit < 0
                                ? "error.main"
                                : "text.secondary"
                          }
                        >
                          {formatNumber(row.profit)}
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
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                        <TimeChip seconds={row.craftTime} />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>
                        {formatNumber(row.scaledQuantity)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {Math.abs(row.scaledProfit) > 0.001 && (
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
                            row.scaledProfit > 0
                              ? "success.main"
                              : "error.main"
                          }
                        >
                          {formatNumber(row.scaledProfit)}
                        </Typography>
                        <Box
                          component="img"
                          src="/img/heartopia/stats/ouro.png"
                          sx={{ width: 14, height: 14 }}
                        />
                      </Stack>
                    )}
                    {Math.abs(row.scaledProfit) <= 0.001 && row.craftTime > 0 && (
                         <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
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
