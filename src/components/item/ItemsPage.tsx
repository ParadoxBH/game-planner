import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CircularProgress, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type CategoryDocument, type ItemDocument } from "../../api/content";
import { useAttributeDefinitions, useContentList, useListing, useListingFilters, useRarities } from "../../api/useContent";
import type { FilterValue, FilterValues } from "../../api/query";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { useViewMode } from "../../hooks/useViewMode";
import { categoryUrlFilters } from "../../utils/urlFilters";
import { ListingDataView } from "../common/ListingDataView";
import { QueryBuilder } from "../common/QueryBuilder";
import { StyledContainer } from "../common/StyledContainer";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { ApiItemCard, ApiItemIcon, itemListCells, rarityColorOf, type ItemListView } from "./ApiItemRenderers";

/** Lista de itens, lida da API. A busca e os filtros ficam no QueryBuilder e vêm do backend (GET /items/query/filters). */
export function ItemsPage() {
  const { gameId = "", category: urlCategory } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subCategoryParam = searchParams.get("subCategory");
  const { isMobile } = usePlatform();

  const pages = usePagination<FilterValues>(categoryUrlFilters(urlCategory, subCategoryParam));
  const [showPrices, setShowPrices] = useState(false);
  const [viewMode, setViewMode] = useViewMode("items");

  useEffect(() => {
    pages.setCriteria(categoryUrlFilters(urlCategory, subCategoryParam));
  }, [urlCategory, subCategoryParam]);

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { criteria, pagination } = pages.info;

  const listing = useListingFilters(gameId, "items");
  const items = useListing<ItemDocument>(gameId, "items", {
    search,
    values: criteria,
    page: pagination.page - 1,
    size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
  });
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

  // A categoria fica na URL, para o link ser compartilhável; o resto, no estado da página.
  const changeFilter = (key: string, value: FilterValue) => {
    if (key === "category") navigate(`/game/${gameId}/items/list/${value || "all"}`);
    else pages.setCriteria({ [key]: value });
  };

  return (
    <StyledContainer
      title={`Itens de ${gameId}`}
      label="Explore e descubra todos os itens disponíveis."
      searchEnd={
        <>
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
          <QueryBuilder
            schema={listing.data}
            search={pages.info.search}
            onSearchChange={pages.setSearch}
            values={criteria}
            onChange={changeFilter}
          />
        </>
      }
      pages={pages}
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
