import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CircularProgress, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type CategoryDocument, type EntityDocument, type ShopDocument } from "../../api/content";
import { useContentList, useListing, useListingFilters, useRarities } from "../../api/useContent";
import type { FilterValue, FilterValues } from "../../api/query";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { useViewMode } from "../../hooks/useViewMode";
import { categoryUrlFilters } from "../../utils/urlFilters";
import { ListingDataView } from "../common/ListingDataView";
import { ListingFilterBar } from "../common/ListingFilterBar";
import { StyledContainer } from "../common/StyledContainer";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { ApiEntityCard, ApiEntityIcon, entityListCells, entityRarityColor, type EntityListView } from "./ApiEntityRenderers";

/** Lista de entidades, lida da API. A busca e os filtros acima da lista vêm do backend (GET /entities/query/filters). */
export function EntityPage() {
  const { gameId = "", category: urlCategory } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subCategoryParam = searchParams.get("subCategory");
  const { isMobile } = usePlatform();

  const pages = usePagination<FilterValues>(categoryUrlFilters(urlCategory, subCategoryParam));
  const [viewMode, setViewMode] = useViewMode("entities");
  const [showPrices, setShowPrices] = useState(false);

  useEffect(() => {
    pages.setCriteria(categoryUrlFilters(urlCategory, subCategoryParam));
  }, [urlCategory, subCategoryParam]);

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { criteria, pagination } = pages.info;

  const listing = useListingFilters(gameId, "entities");
  const entities = useListing<EntityDocument>(gameId, "entities", {
    search,
    values: criteria,
    page: pagination.page - 1,
    size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
  });
  const categories = useContentList<CategoryDocument>(gameId, "categories", { size: MAX_PAGE_SIZE, sort: "name" });
  const shops = useContentList<ShopDocument>(gameId, "shops", { size: MAX_PAGE_SIZE });
  const rarities = useRarities(gameId);

  useEffect(() => {
    if (entities.data) pages.setTotalItems(entities.data.total);
  }, [entities.data, pages.setTotalItems]);

  const entityCategories = useMemo(
    () => (categories.data?.content ?? []).filter((category) => category.appliesTo !== "item"),
    [categories.data],
  );

  const view = useMemo<EntityListView>(
    () => ({
      gameId,
      showPrices,
      rarities: new Map((rarities.data ?? []).map((rarity) => [rarity.code, rarity])),
      categories: new Map(entityCategories.map((category) => [category.extId, category])),
      shopNpcs: new Set((shops.data?.content ?? []).flatMap((shop) => (shop.npc ? [shop.npc] : []))),
    }),
    [gameId, showPrices, rarities.data, entityCategories, shops.data],
  );

  const currentCategoryName =
    urlCategory && urlCategory !== "all" ? view.categories.get(urlCategory)?.name ?? urlCategory : "Entidades";

  // A categoria fica na URL, para o link ser compartilhável; o resto, no estado da página.
  const changeFilter = (key: string, value: FilterValue) => {
    if (key === "category") navigate(`/game/${gameId}/entity/list/${value || "all"}`);
    else pages.setCriteria({ [key]: value });
  };

  return (
    <StyledContainer
      title={`${currentCategoryName} de ${gameId}`}
      label="Explore e descubra todas as entidades do jogo."
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: listing.data?.search.placeholder }}
      pages={pages}
      actionsStart={<ListingFilterBar filters={listing.data?.filters} values={criteria} onChange={changeFilter} />}
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
      {entities.isPending ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : entities.isError ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar as entidades.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {entities.error instanceof ApiError ? entities.error.message : "Erro inesperado."}
          </Typography>
        </Stack>
      ) : (
        <ListingDataView
          data={entities.data.content}
          viewMode={viewMode}
          variant="compact"
          cardMinWidth={200}
          listHeader={[
            { label: "Entidade", width: "70%" },
            { label: "Preços", align: "right" as const, width: "30%", hidden: !showPrices },
          ]}
          emptyMessage="Nenhuma entidade encontrada neste filtro."
          getRowColor={(entity) => entityRarityColor(view, entity)}
          renderCard={(entity, variant) => <ApiEntityCard entity={entity} variant={variant} view={view} />}
          renderListItem={(entity) => entityListCells(entity, view)}
          renderIconItem={(entity) => <ApiEntityIcon entity={entity} view={view} />}
        />
      )}
    </StyledContainer>
  );
}
