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
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import type { Item, Category } from "../../types/gameModels";
import type { ItemCriteria } from "../../types/filterTypes";
import type { PaginatedResponse } from "../../types/apiModels";
import { usePagination } from "../../hooks/usePagination";

export function ItemsPage() {
  const { gameId, category: urlCategory } = useParams<{
    gameId: string;
    category?: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subCategoryParam = searchParams.get("subCategory");

  const { loading: dbLoading, error, getItemsList, getItemCategories, getItemSubCategories } = useApi(gameId);
  const [itemsResponse, setItemsResponse] = useState<PaginatedResponse<Item> | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  
  const pages = usePagination<ItemCriteria>({
    primaryCategory: urlCategory || "all",
    subCategoryStates: {},
    tradeStatus: null,
  });

  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<(Category & { isPrimary: boolean })[]>([]);
  const [showPrices, setShowPrices] = useState(false);
  const [viewMode, setViewMode] = useViewMode("items");

  // Sync URL Category to filter via controller
  useEffect(() => {
    pages.setCriteria({
      primaryCategory: urlCategory || "all",
      subCategoryStates: subCategoryParam ? { [subCategoryParam]: "include" } : {}
    });
  }, [urlCategory]);

  // Sync SubCategory from URL specifically (external links)
  useEffect(() => {
    if (subCategoryParam) {
      pages.setCriteria({
        subCategoryStates: { [subCategoryParam]: "include" }
      });
    }
  }, [subCategoryParam]);

  // Load all categories for the selector
  useEffect(() => {
    if (dbLoading) return;
    getItemCategories().then(setAllCategories);
  }, [dbLoading, getItemCategories]);

  // Load items when filter or db changes
  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    getItemsList(pages.info)
      .then((results) => {
        if (!isMounted) return;
        setItemsResponse(results);
        pages.setTotalItems(results.total);
        setDataLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching items:", err);
        if (isMounted) setDataLoading(false);
      });

    return () => { isMounted = false; };
  }, [dbLoading, getItemsList, pages.info]);

  const items = useMemo(() => itemsResponse?.data || [], [itemsResponse]);

  // Derive available sub-categories from all items based ONLY on primary category
  useEffect(() => {
    if (dbLoading) return;
    
    getItemSubCategories(urlCategory || "all")
      .then(setAvailableSubCategories)
      .catch(console.error);
  }, [dbLoading, urlCategory, getItemSubCategories]);


  // Update search specifically
  const handleSearchChange = (val: string) => {
    pages.setSearch(val);
  };

  // Update trade status
  const handleTradeStatusChange = (val: string | null) => {
    pages.setCriteria({ tradeStatus: val });
  };

  const handleSubCategoryStateChange = (option: string, newState: TripleState) => {
    const nextSub = { ...pages.info.criteria.subCategoryStates, [option]: newState };
    pages.setCriteria({ subCategoryStates: nextSub });
  };


  return (
    <StyledContainer
      title={`Itens de ${gameId}`}
      label="Explore e descubra todos os itens disponíveis."
      searchValue={pages.info.search}
      onChangeSearch={handleSearchChange}
      search={{ placeholder: "Pesquisar itens..." }}
      pages={pages}
      actionsStart={
        <>
          <PickSelector
            label="Categoria"
            value={urlCategory === "all" ? null : urlCategory || null}
            options={allCategories
              .filter(cat => cat.isPrimary)
              .map(cat => ({ value: cat.id, label: cat.name, icon: cat.icon }))
            }
            onChange={(cat) => {
              navigate(`/game/${gameId}/items/list/${cat || "all"}`);
            }}
          />
          {availableSubCategories.length > 0 && (
            <TriplePickSelector
              label="Sub-categoria"
              states={pages.info.criteria.subCategoryStates || {}}
              options={availableSubCategories.map(subId => {
                const catInfo = allCategories.find(c => c.id === subId);
                return {
                  value: subId,
                  label: catInfo?.name || subId,
                  icon: catInfo?.icon
                };
              })}
              onChange={handleSubCategoryStateChange}
            />
          )}
          <PickSelector
            label="Status"
            value={pages.info.criteria.tradeStatus || null}
            options={[
              "Compraveis",
              "Vendiveis",
              "Comercializados",
              "Não Comercializados",
            ]}
            onChange={handleTradeStatusChange}
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
      {(dbLoading || dataLoading) ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : error ? (
        <Box sx={{ p: 4, textAlign: "center", flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Ops! Algo deu errado.
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            {error}
          </Typography>
        </Box>
      ) : (
        <ListingDataView
          data={items}
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
              key={`list_item_${item.id}`}
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
            <Stack direction={"row"} spacing={1} key={`list_cats_${item.id}`}>
              {(Array.isArray(item.category) ? item.category : [item.category]).map((category: string) => (
                <Chip key={`${item.id}_category_${category}`} label={category} />
              ))}
            </Stack>,
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }} key={`list_prices_${item.id}`}>
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
            <Tooltip title={item.name} key={`icon_item_${item.id}`}>
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
      )}
    </StyledContainer>
  );
}
