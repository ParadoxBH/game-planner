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
import {
  ItemCard,
  ItemList,
  ItemIcon,
  ItemRenderProvider,
} from "./ItemRenderers";
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
import type { Item, Category, GameInfo } from "../../types/gameModels";
import type { ItemCriteria } from "../../types/filterTypes";
import type { PaginatedResponse } from "../../types/apiModels";
import { usePagination } from "../../hooks/usePagination";
import { getPublicUrl } from "../../utils/pathUtils";
import { usePlatform } from "../../hooks/usePlatform";
import { isDev } from "../../utils/mapper";

export function ItemsPage() {
  const { gameId, category: urlCategory } = useParams<{
    gameId: string;
    category?: string;
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subCategoryParam = searchParams.get("subCategory");
  const { isMobile } = usePlatform();

  const { loading: dbLoading, error, getItemsList, getItemCategories, getItemSubCategories, getGameInfo, getCategories } = useApi(gameId);
  const [itemsResponse, setItemsResponse] = useState<PaginatedResponse<Item> | null>(null);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  
  const pages = usePagination<ItemCriteria>({
    primaryCategory: urlCategory || "all",
    subCategoryStates: {},
    tradeStatus: null,
  });

  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<(Category & { isPrimary: boolean })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    getCategories().then(setCategories);
    if (gameId) getGameInfo(gameId).then(info => { if (info) setGameInfo(info); });
  }, [dbLoading, getItemCategories, getCategories, gameId, getGameInfo]);

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

  const categoriesMap = useMemo(() => {
    const map = new Map<string, any>();
    categories.forEach(cat => {
      map.set(cat.id.toLowerCase(), cat);
    });
    allCategories.forEach(cat => {
      map.set(cat.id.toLowerCase(), cat);
    });
    return map;
  }, [categories, allCategories]);

  const renderMetadataChip = (meta: any) => {
    const metaKey = (meta.type || meta.id).toLowerCase();
    const cat = categoriesMap.get(metaKey);
    const displayName = cat?.name || meta.type || meta.id;

    if (cat?.icon) {
      return (
        <Tooltip key={`${meta.id}`} title={`${displayName}: ${meta.value}`}>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/game/${gameId}/metadado/view/${meta.type || meta.id}`);
            }}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              height: "20px",
              borderRadius: 1,
              cursor: "pointer",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              color: "text.primary",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.15)",
                borderColor: "primary.main"
              }
            }}
          >
            <img
              src={getPublicUrl(cat.icon)}
              alt={displayName}
              style={{ width: 14, height: 14, objectFit: "contain", imageRendering: "pixelated" }}
            />
            <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: 700 }}>
              {meta.value}
            </Typography>
          </Box>
        </Tooltip>
      );
    }

    return (
      <Tooltip key={`${meta.id}`} title={`Ver todos com ${displayName}`}>
        <Chip
          label={`${displayName}: ${meta.value}`}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/game/${gameId}/metadado/view/${meta.type || meta.id}`);
          }}
          clickable
          sx={{
            fontSize: "0.7rem",
            height: "20px",
            bgcolor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            "& .MuiChip-label": { px: 1 },
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.15)",
              borderColor: "primary.main"
            }
          }}
        />
      </Tooltip>
    );
  };

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
              .sort((a, b) => a.label.localeCompare(b.label))
            }
            onChange={(cat) => {
              navigate(`/game/${gameId}/items/list/${cat || "all"}`);
            }}
            fullWidth={isMobile}
          />
          {availableSubCategories.length > 0 && (
            <TriplePickSelector
              label="Sub-categoria"
              states={pages.info.criteria.subCategoryStates || {}}
              options={availableSubCategories.map(subId => {
                const catInfo = allCategories.find(c => c.id.toLowerCase() === subId.toLowerCase());
                return {
                  value: subId,
                  label: catInfo?.name || subId,
                  icon: catInfo?.icon
                };
              }).sort((a, b) => a.label.localeCompare(b.label))}
              onChange={handleSubCategoryStateChange}
              fullWidth={isMobile}
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
            fullWidth={isMobile}
          />
          {gameInfo?.rarity && Object.keys(gameInfo.rarity).length > 0 && (
            <PickSelector
              label="Raridade"
              value={pages.info.criteria.rarity || null}
              options={[
                ...(isDev() ? [{ value: "none", label: "Não Informado" }] : []),
                ...Object.entries(gameInfo.rarity).map(([id, r]) => ({
                  value: id,
                  label: r.name,
                }))
              ]}
              onChange={(val) => pages.setCriteria({ rarity: val })}
              fullWidth={isMobile}
            />
          )}
        </>
      }
      actionsEnd={
        <Stack flex={1} direction={"row"} justifyContent={isMobile ? "space-between" : "end"} alignItems={"center"}>
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
        </Stack>
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
        <ItemRenderProvider value={{ gameId: gameId || "", navigate, gameInfo, categoriesMap, showPrices }}>
          <ListingDataView
            data={items}
            viewMode={viewMode}
            variant="compact"
            cardMinWidth={200}
            listHeader={[
              { label: "Item", width: showPrices ? "35%" : "45%" },
              { label: "Metadados", width: "25%", hidden: isMobile },
              { label: "Categorias", width: showPrices ? "30%" : "30%", hidden: isMobile },
              {
                label: "Preços",
                align: "right" as const,
                width: "10%",
                hidden: !showPrices,
              },
            ]}
            emptyMessage="Nenhum item encontrado com estes filtros."
            getRowColor={(item: any) => item.rarity && gameInfo?.rarity?.[item.rarity]?.color}
            renderCard={ItemCard}
            renderListItem={ItemList}
            renderIconItem={ItemIcon}
          />
        </ItemRenderProvider>
      )}
    </StyledContainer>
  );
}
