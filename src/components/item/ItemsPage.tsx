import {
  Box,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Tooltip,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { Inventory, Sell, ShoppingCart, SwapHoriz } from "@mui/icons-material";
import { ItemCard } from "./ItemCard";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { useState, useMemo, useEffect } from "react";
import { StyledContainer } from "../common/StyledContainer";
import { ItemChip } from "../common/ItemChip";
import { PickSelector } from "../common/PickSelector";
import { ListingDataView } from "../common/ListingDataView";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { useViewMode } from "../../hooks/useViewMode";
import { TriplePickSelector } from "../common/TriplePickSelector";
import type { TripleState } from "../common/TriplePickSelector";

export function ItemsPage() {
  const { gameId, category: urlCategory } = useParams<{
    gameId: string;
    category?: string;
  }>();
  const navigate = useNavigate();

  const { loading, error, getItemsList } = useApi(gameId);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSubCategories, setAvailableSubCategories] = useState<
    string[]
  >([]);
  const [subCategoryStates, setSubCategoryStates] = useState<
    Record<string, TripleState>
  >({});
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [showPrices, setShowPrices] = useState(false);
  const [viewMode, setViewMode] = useViewMode("items");

  const allItems = useMemo(() => {
    const results = getItemsList();
    return Array.isArray(results) ? results : results.data;
  }, [getItemsList]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allItems.forEach((item) => {
      const itemCats = item.category;
      const catsArr = Array.isArray(itemCats)
        ? itemCats
        : itemCats
          ? [itemCats]
          : [];
      if (catsArr[0]) cats.add(catsArr[0]);
    });
    return Array.from(cats).sort();
  }, [allItems]);

  // Update available sub-categories when primary category changes
  useEffect(() => {
    const cats = new Set<string>();
    const currentPrimary = urlCategory === "all" ? null : urlCategory;

    allItems.forEach((item) => {
      const itemCats = item.category;
      const catsArr = Array.isArray(itemCats)
        ? itemCats
        : itemCats
          ? [itemCats]
          : [];
      const primary = catsArr[0];

      if (
        !currentPrimary ||
        (primary && primary.toLowerCase() === currentPrimary.toLowerCase())
      ) {
        if (catsArr.length > 1) {
          catsArr.slice(1).forEach((c) => cats.add(c));
        }
      }
    });

    setAvailableSubCategories(Array.from(cats).sort());

    // Clean up states for categories that are no longer available
    setSubCategoryStates(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(cat => {
        if (!cats.has(cat)) {
          delete next[cat];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [allItems, urlCategory]);

  const filteredItems = useMemo(() => {
    const filters: any = {};

    if (urlCategory && urlCategory !== "all") {
      filters.category = [urlCategory];
    }

    // Add inclusion/negation for sub-category states
    Object.entries(subCategoryStates).forEach(([cat, state]) => {
      if (state === "indifferent") return;
      if (!filters.category) filters.category = [];
      filters.category.push(state === "exclude" ? `!${cat}` : cat);
    });

    const results = getItemsList({ filters });
    let list = Array.isArray(results) ? results : results.data;

    // Apply trade status filtering client-side
    if (tradeStatus) {
      list = list.filter((item) => {
        if (tradeStatus === "Compraveis") return item.buyPrice !== undefined;
        if (tradeStatus === "Vendiveis") return item.sellPrice !== undefined;
        if (tradeStatus === "Não Comercializados")
          return item.buyPrice === undefined && item.sellPrice === undefined;
        if (tradeStatus === "Comercializados")
          return item.buyPrice !== undefined || item.sellPrice !== undefined;
        return true;
      });
    }

    // Apply search filter client-side
    if (!searchTerm) return list;

    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.id.toLowerCase().includes(lowerSearch),
    );
  }, [
    getItemsList,
    urlCategory,
    subCategoryStates,
    tradeStatus,
    searchTerm,
  ]);

  if (loading) {
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

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          Erro ao carregar itens: {error}
        </Typography>
      </Box>
    );
  }

  const handleSubCategoryStateChange = (option: string, newState: TripleState) => {
    setSubCategoryStates(prev => ({
      ...prev,
      [option]: newState
    }));
  };

  return (
    <StyledContainer
      title={`Itens de ${gameId}`}
      label="Explore e descubra todos os itens disponíveis."
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar itens..." }}
      actionsStart={
        <>
          <PickSelector
            label="Categoria"
            value={urlCategory === "all" ? null : urlCategory || null}
            options={categories}
            onChange={(cat) => {
              navigate(`/game/${gameId}/items/list/${cat || "all"}`);
            }}
          />
          {availableSubCategories.length > 0 && (
            <TriplePickSelector
              label="Sub-categoria"
              states={subCategoryStates}
              options={availableSubCategories}
              onChange={handleSubCategoryStateChange}
            />
          )}
          <PickSelector
            label="Status"
            value={tradeStatus}
            options={[
              "Compraveis",
              "Vendiveis",
              "Comercializados",
              "Não Comercializados",
            ]}
            onChange={setTradeStatus}
            icon={<SwapHoriz sx={{ fontSize: 18 }} />}
          />
        </>
      }
      actionsEnd={
        <>
          <FormControlLabel
            control={
              <Switch
                checked={showPrices}
                onChange={(e) => setShowPrices(e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontWeight: 600 }}
              >
                Mostrar Preços
              </Typography>
            }
            sx={{ ml: 1 }}
          />
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
        </>
      }
    >
      <ListingDataView
        data={filteredItems}
        viewMode={viewMode}
        variant="compact"
        cardMinWidth={200}
        listHeader={[
          { label: "Item", width: "60%" },
          { label: "Categorias", width: "30%" },
          {
            label: "Preços",
            align: "right" as const,
            width: "10%",
            hidden: !showPrices,
          },
        ]}
        emptyMessage="Nenhum item encontrado com estes filtros."
        renderCard={(item: any, variant) => (
          <ItemCard item={item} gameId={gameId || ""} showPrices={showPrices} variant={variant} />
        )}
        renderListItem={(item: any) => [
          <Box
            onClick={() => navigate(`/game/${gameId}/items/view/${item.id}`)}
            sx={{
              display: "flex",
              position: "relative",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 0.5,
                backgroundColor: "rgba(0,0,0,0.2)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              {item.icon ? (
                <img
                  src={item.icon}
                  alt={item.name}
                  style={{
                    width: "80%",
                    height: "80%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Inventory
                  sx={{ fontSize: 16, color: "rgba(255, 255, 255, 0.2)" }}
                />
              )}
              {item.level !== undefined && item.level > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: -4,
                    left: -4,
                    backgroundColor: "warning.main",
                    color: "warning.contrastText",
                    borderRadius: "4px",
                    px: 0.5,
                    minWidth: 12,
                    height: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.55rem",
                    fontWeight: 800,
                    boxShadow: 1,
                    zIndex: 1,
                  }}
                >
                  {item.level}
                </Box>
              )}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {item.name}
            </Typography>
          </Box>,
          <Stack direction={"row"} spacing={1}>
            {item.category.map((category: string) => (
              <Chip key={`${item.name}_category_${category}`} label={category} />
            ))}
          </Stack>,
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            {item.buyPrice !== undefined && (
              <Tooltip title="Compra">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    backgroundColor: "rgba(76, 175, 80, 0.1)",
                    px: 1,
                    borderRadius: 1,
                    border: "1px solid rgba(76, 175, 80, 0.2)",
                  }}
                >
                  <ShoppingCart sx={{ fontSize: 12, color: "success.main" }} />
                  <ItemChip
                    id="ouro"
                    amount={item.buyPrice}
                    size="small"
                    icon="/img/heartopia/stats/ouro.png"
                  />
                </Box>
              </Tooltip>
            )}
            {item.sellPrice !== undefined && (
              <Tooltip title="Venda">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    backgroundColor: "rgba(255, 152, 0, 0.1)",
                    px: 1,
                    borderRadius: 1,
                    border: "1px solid rgba(255, 152, 0, 0.2)",
                  }}
                >
                  <Sell sx={{ fontSize: 12, color: "warning.main" }} />
                  <ItemChip
                    id="ouro"
                    amount={item.sellPrice}
                    size="small"
                    icon="/img/heartopia/stats/ouro.png"
                  />
                </Box>
              </Tooltip>
            )}
          </Box>,
        ]}
        renderIconItem={(item: any) => (
          <Tooltip title={item.name}>
            <Box
              onClick={() => navigate(`/game/${gameId}/items/view/${item.id}`)}
              sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 1,
              }}
            >
              {item.icon ? (
                <img
                  src={item.icon}
                  alt={item.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Inventory
                  sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.2)" }}
                />
              )}
              {item.level !== undefined && item.level > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    backgroundColor: "warning.main",
                    color: "warning.contrastText",
                    borderRadius: "4px",
                    px: 0.5,
                    minWidth: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    boxShadow: 2,
                    zIndex: 1,
                  }}
                >
                  {item.level}
                </Box>
              )}
            </Box>
          </Tooltip>
        )}
      />
    </StyledContainer>
  );
}
