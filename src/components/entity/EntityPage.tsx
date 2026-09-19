import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CircularProgress, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { FilterList } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import {
  MAX_PAGE_SIZE,
  type CategoryDocument,
  type EntityDocument,
  type ListQuery,
  type ShopDocument,
} from "../../api/content";
import { currentMedia, mediaUrl } from "../../api/references";
import { useContentList, useRarities } from "../../api/useContent";
import { and, inActiveEvents, rule, textSearch } from "../../api/query";
import { useEventFilter } from "../../context/EventFilterContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { useViewMode } from "../../hooks/useViewMode";
import type { EntityCriteria } from "../../types/filterTypes";
import { ListingDataView } from "../common/ListingDataView";
import { PickSelector } from "../common/PickSelector";
import { StyledContainer } from "../common/StyledContainer";
import { TriplePickSelector, type TripleState } from "../common/TriplePickSelector";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { ApiEntityCard, ApiEntityIcon, entityListCells, entityRarityColor, type EntityListView } from "./ApiEntityRenderers";

function categoryOption(category: CategoryDocument) {
  const iconId = currentMedia(category.media, "icon");
  return { value: category.extId, label: category.name, icon: iconId ? mediaUrl(iconId) : undefined };
}

/** Lista de entidades, lida da API. */
export function EntityPage() {
  const { gameId = "", category: urlCategory } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subCategoryParam = searchParams.get("subCategory");
  const { isMobile } = usePlatform();
  const { activeEventIds } = useEventFilter();

  const pages = usePagination<EntityCriteria>({
    primaryCategory: urlCategory || "all",
    subCategoryStates: subCategoryParam ? { [subCategoryParam]: "include" } : {},
  });
  const [viewMode, setViewMode] = useViewMode("entities");
  const [showPrices, setShowPrices] = useState(false);

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
      where: and(
        textSearch(search),
        ...[...primary, ...included].map((category) => rule("category", "equal", category)),
        excluded.length > 0 && rule("category", "not_in", excluded),
        criteria.rarity && rule("rarity", "equal", criteria.rarity),
        inActiveEvents(activeEventIds),
      ),
      page: pagination.page - 1,
      size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
    };
  }, [search, criteria, pagination, activeEventIds]);

  const entities = useContentList<EntityDocument>(gameId, "entities", query);
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
  const sortedRarities = [...(rarities.data ?? [])].sort((a, b) => a.ordinal - b.ordinal);

  const handleSubCategoryStateChange = (option: string, state: TripleState) => {
    pages.setCriteria({ subCategoryStates: { ...criteria.subCategoryStates, [option]: state } });
  };

  return (
    <StyledContainer
      title={`${currentCategoryName} de ${gameId}`}
      label="Explore e descubra todas as entidades do jogo."
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: "Pesquisar entidades..." }}
      pages={pages}
      actionsStart={
        <>
          <PickSelector
            label="Categoria"
            value={urlCategory && urlCategory !== "all" ? urlCategory : null}
            options={entityCategories.map(categoryOption)}
            onChange={(category) => navigate(`/game/${gameId}/entity/list/${category || "all"}`)}
            icon={<FilterList sx={{ fontSize: 18 }} />}
            fullWidth={isMobile}
          />
          {entityCategories.length > 1 && (
            <TriplePickSelector
              label="Sub-categoria"
              states={criteria.subCategoryStates || {}}
              options={entityCategories.filter((category) => category.extId !== urlCategory).map(categoryOption)}
              onChange={handleSubCategoryStateChange}
              fullWidth={isMobile}
            />
          )}
          {sortedRarities.length > 0 && (
            <PickSelector
              label="Raridade"
              value={criteria.rarity || null}
              options={sortedRarities.map((rarity) => ({ value: rarity.code, label: rarity.name }))}
              onChange={(rarity) => pages.setCriteria({ rarity })}
              icon={<FilterList sx={{ fontSize: 18 }} />}
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
