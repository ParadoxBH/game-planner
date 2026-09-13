import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CircularProgress, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { SwapHoriz } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type CategoryDocument, type ItemDocument, type ListQuery } from "../../api/content";
import { currentMedia, mediaUrl } from "../../api/references";
import { useAttributeDefinitions, useContentList, useRarities } from "../../api/useContent";
import { useEventFilter } from "../../context/EventFilterContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { useViewMode } from "../../hooks/useViewMode";
import type { ItemCriteria } from "../../types/filterTypes";
import { ListingDataView } from "../common/ListingDataView";
import { PickSelector } from "../common/PickSelector";
import { StyledContainer } from "../common/StyledContainer";
import { TriplePickSelector, type TripleState } from "../common/TriplePickSelector";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { ApiItemCard, ApiItemIcon, itemListCells, rarityColorOf, type ItemListView } from "./ApiItemRenderers";

/** Opções do filtro "Status" e o filtro trade da API correspondente. */
const TRADE_FILTERS: Record<string, string> = {
  Compraveis: "buyable",
  Vendiveis: "sellable",
  Comercializados: "traded",
  "Não Comercializados": "untraded",
};

function categoryOption(category: CategoryDocument) {
  const iconId = currentMedia(category.media, "icon");
  return { value: category.extId, label: category.name, icon: iconId ? mediaUrl(iconId) : undefined };
}

/** Lista de itens, lida da API. */
export function ItemsPage() {
  const { gameId = "", category: urlCategory } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subCategoryParam = searchParams.get("subCategory");
  const { isMobile } = usePlatform();
  const { activeEventIds } = useEventFilter();

  const pages = usePagination<ItemCriteria>({
    primaryCategory: urlCategory || "all",
    subCategoryStates: {},
    tradeStatus: null,
  });
  const [showPrices, setShowPrices] = useState(false);
  const [viewMode, setViewMode] = useViewMode("items");

  useEffect(() => {
    pages.setCriteria({
      primaryCategory: urlCategory || "all",
      subCategoryStates: subCategoryParam ? { [subCategoryParam]: "include" } : {},
    });
  }, [urlCategory, subCategoryParam]);

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { criteria, pagination } = pages.info;

  const query = useMemo<ListQuery>(() => {
    const states = Object.entries(criteria.subCategoryStates ?? {});
    const included = states.filter(([, state]) => state === "include").map(([id]) => id);
    const excluded = states.filter(([, state]) => state === "exclude").map(([id]) => id);
    const primary = criteria.primaryCategory && criteria.primaryCategory !== "all" ? [criteria.primaryCategory] : [];
    return {
      search: search || undefined,
      categories: [...primary, ...included],
      rarity: criteria.rarity ?? undefined,
      page: pagination.page - 1,
      size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
      filters: {
        withoutCategory: excluded.length ? excluded.join(",") : undefined,
        trade: criteria.tradeStatus ? TRADE_FILTERS[criteria.tradeStatus] : undefined,
        activeEvents: activeEventIds.join(","),
      },
    };
  }, [search, criteria, pagination, activeEventIds]);

  const items = useContentList<ItemDocument>(gameId, "items", query);
  const categories = useContentList<CategoryDocument>(gameId, "categories", { size: MAX_PAGE_SIZE, sort: "name" });
  const rarities = useRarities(gameId);
  const attributes = useAttributeDefinitions(gameId);

  useEffect(() => {
    if (items.data) pages.setTotalItems(items.data.total);
  }, [items.data, pages.setTotalItems]);

  const itemCategories = useMemo(
    () => (categories.data?.content ?? []).filter((category) => category.appliesTo !== "entity"),
    [categories.data],
  );

  const view = useMemo<ItemListView>(
    () => ({
      gameId,
      showPrices,
      rarities: new Map((rarities.data ?? []).map((rarity) => [rarity.code, rarity])),
      categories: new Map(itemCategories.map((category) => [category.extId, category])),
      attributes: new Map((attributes.data ?? []).map((definition) => [definition.key, definition])),
    }),
    [gameId, showPrices, rarities.data, itemCategories, attributes.data],
  );

  const handleSubCategoryStateChange = (option: string, state: TripleState) => {
    pages.setCriteria({ subCategoryStates: { ...criteria.subCategoryStates, [option]: state } });
  };

  const sortedRarities = [...(rarities.data ?? [])].sort((a, b) => a.ordinal - b.ordinal);

  return (
    <StyledContainer
      title={`Itens de ${gameId}`}
      label="Explore e descubra todos os itens disponíveis."
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: "Pesquisar itens..." }}
      pages={pages}
      actionsStart={
        <>
          <PickSelector
            label="Categoria"
            value={urlCategory && urlCategory !== "all" ? urlCategory : null}
            options={itemCategories.map(categoryOption)}
            onChange={(category) => navigate(`/game/${gameId}/items/list/${category || "all"}`)}
            fullWidth={isMobile}
          />
          {itemCategories.length > 1 && (
            <TriplePickSelector
              label="Sub-categoria"
              states={criteria.subCategoryStates || {}}
              options={itemCategories.filter((category) => category.extId !== urlCategory).map(categoryOption)}
              onChange={handleSubCategoryStateChange}
              fullWidth={isMobile}
            />
          )}
          <PickSelector
            label="Status"
            value={criteria.tradeStatus || null}
            options={Object.keys(TRADE_FILTERS)}
            onChange={(status) => pages.setCriteria({ tradeStatus: status })}
            icon={<SwapHoriz sx={{ fontSize: 18 }} />}
            fullWidth={isMobile}
          />
          {sortedRarities.length > 0 && (
            <PickSelector
              label="Raridade"
              value={criteria.rarity || null}
              options={sortedRarities.map((rarity) => ({ value: rarity.code, label: rarity.name }))}
              onChange={(rarity) => pages.setCriteria({ rarity })}
              fullWidth={isMobile}
            />
          )}
        </>
      }
      actionsEnd={
        <Stack flex={1} direction="row" justifyContent={isMobile ? "space-between" : "end"} alignItems="center">
          <FormControlLabel
            control={
              <Switch checked={showPrices} onChange={(event) => setShowPrices(event.target.checked)} color="primary" size="small" />
            }
            label={
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Mostrar preços
              </Typography>
            }
          />
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
        </Stack>
      }
    >
      {items.isPending ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : items.isError ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar os itens.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {items.error instanceof ApiError ? items.error.message : "Erro inesperado."}
          </Typography>
        </Stack>
      ) : (
        <ListingDataView
          data={items.data.content}
          viewMode={viewMode}
          variant="compact"
          cardMinWidth={200}
          listHeader={[
            { label: "Item", width: showPrices ? "35%" : "45%" },
            { label: "Atributos", width: "25%", hidden: isMobile },
            { label: "Categorias", width: "30%", hidden: isMobile },
            { label: "Preços", align: "right" as const, width: "10%", hidden: !showPrices },
          ]}
          emptyMessage="Nenhum item encontrado com estes filtros."
          getRowColor={(item) => rarityColorOf(view, item)}
          renderCard={(item, variant) => <ApiItemCard item={item} variant={variant} view={view} />}
          renderListItem={(item) => itemListCells(item, view)}
          renderIconItem={(item) => <ApiItemIcon item={item} view={view} />}
        />
      )}
    </StyledContainer>
  );
}
