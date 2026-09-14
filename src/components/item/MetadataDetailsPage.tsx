import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumbs, CircularProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import { Bolt, Bookmarks, Inventory, NavigateNext } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import {
  MAX_PAGE_SIZE,
  type CategoryDocument,
  type EntityDocument,
  type ItemDocument,
  type ListQuery,
  type ShopDocument,
} from "../../api/content";
import { useAttributeDefinitions, useContentList, useRarities } from "../../api/useContent";
import { useEventFilter } from "../../context/EventFilterContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { useViewMode } from "../../hooks/useViewMode";
import { DataChip } from "../common/DataChip";
import { ListingDataView } from "../common/ListingDataView";
import { StyledContainer } from "../common/StyledContainer";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { ApiEntityCard, ApiEntityIcon, entityListCells, entityRarityColor, type EntityListView } from "../entity/ApiEntityRenderers";
import { ApiItemCard, ApiItemIcon, attributeLabel, itemListCells, rarityColorOf, type ItemListView } from "./ApiItemRenderers";

type MetadataTab = "items" | "entities";

const NO_CRITERIA = {};

function Loading() {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
      <CircularProgress color="primary" />
    </Stack>
  );
}

function ListError({ error }: { error: Error }) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
      <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
        Não foi possível carregar a lista.
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {error instanceof ApiError ? error.message : "Erro inesperado."}
      </Typography>
    </Stack>
  );
}

/** Itens e entidades que têm um atributo (os antigos metadados), paginados pela API com ?attribute=. */
export function MetadataDetailsPage() {
  const { gameId = "", type: attributeKey = "" } = useParams<{ gameId: string; type: string }>();
  const { isMobile } = usePlatform();
  const { activeEventIds } = useEventFilter();
  const [tab, setTab] = useState<MetadataTab>("items");
  const [viewMode, setViewMode] = useViewMode("metadata_details");
  const pages = usePagination(NO_CRITERIA);

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { pagination } = pages.info;
  const activeEvents = activeEventIds.join(",");

  const query = useMemo<ListQuery>(
    () => ({
      search: search || undefined,
      page: pagination.page - 1,
      size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
      sort: "name",
      filters: { attribute: attributeKey, activeEvents },
    }),
    [search, pagination, attributeKey, activeEvents],
  );
  // Só o total, para as contagens das abas.
  const countQuery = useMemo<ListQuery>(() => ({ size: 1, filters: { attribute: attributeKey, activeEvents } }), [attributeKey, activeEvents]);

  const items = useContentList<ItemDocument>(gameId, "items", query, { enabled: tab === "items" });
  const entities = useContentList<EntityDocument>(gameId, "entities", query, { enabled: tab === "entities" });
  const itemCount = useContentList<ItemDocument>(gameId, "items", countQuery);
  const entityCount = useContentList<EntityDocument>(gameId, "entities", countQuery);
  const categories = useContentList<CategoryDocument>(gameId, "categories", { size: MAX_PAGE_SIZE, sort: "name" });
  const shops = useContentList<ShopDocument>(gameId, "shops", { size: MAX_PAGE_SIZE }, { enabled: tab === "entities" });
  const rarities = useRarities(gameId);
  const attributes = useAttributeDefinitions(gameId);

  useEffect(() => {
    const total = tab === "items" ? items.data?.total : entities.data?.total;
    if (total !== undefined) pages.setTotalItems(total);
  }, [tab, items.data, entities.data, pages.setTotalItems]);

  const definitions = useMemo(
    () => new Map((attributes.data ?? []).map((definition) => [definition.key, definition])),
    [attributes.data],
  );
  const categoryMap = useMemo(
    () => new Map((categories.data?.content ?? []).map((category) => [category.extId, category])),
    [categories.data],
  );
  const rarityMap = useMemo(() => new Map((rarities.data ?? []).map((rarity) => [rarity.code, rarity])), [rarities.data]);
  const itemView = useMemo<ItemListView>(
    () => ({ gameId, showPrices: false, rarities: rarityMap, categories: categoryMap, attributes: definitions }),
    [gameId, rarityMap, categoryMap, definitions],
  );
  const entityView = useMemo<EntityListView>(
    () => ({
      gameId,
      showPrices: false,
      rarities: rarityMap,
      categories: categoryMap,
      shopNpcs: new Set((shops.data?.content ?? []).flatMap((shop) => (shop.npc ? [shop.npc] : []))),
    }),
    [gameId, rarityMap, categoryMap, shops.data],
  );

  const definition = definitions.get(attributeKey);
  const label = definition?.label ?? attributeKey;

  const changeTab = (next: MetadataTab) => {
    setTab(next);
    pages.setPage(1);
  };

  return (
    <StyledContainer
      prefix={<Bookmarks sx={{ height: 60, width: 60, color: "primary.main" }} />}
      title={label}
      label={`Itens e entidades com o atributo "${label}"${definition?.unit ? `, em ${definition.unit}` : ""}.`}
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: tab === "items" ? "Pesquisar itens..." : "Pesquisar entidades..." }}
      pages={pages}
      actionsStart={
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          {!isMobile && (
            <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
              <Link to={`/game/${gameId}`}>Dashboard</Link>
              <Link to={`/game/${gameId}/items/list`}>Itens</Link>
              <Typography color="primary">Atributo: {label}</Typography>
            </Breadcrumbs>
          )}
          <Tabs value={tab} onChange={(_, value: MetadataTab) => changeTab(value)} variant="scrollable" scrollButtons="auto">
            <Tab value="items" icon={<Inventory />} iconPosition="start" label={`Itens (${itemCount.data?.total ?? "…"})`} />
            <Tab value="entities" icon={<Bolt />} iconPosition="start" label={`Entidades (${entityCount.data?.total ?? "…"})`} />
          </Tabs>
        </Stack>
      }
      actionsEnd={
        <Stack direction="row" flex={1} justifyContent={isMobile ? "flex-start" : "flex-end"}>
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
        </Stack>
      }
    >
      {tab === "items" &&
        (items.isPending ? (
          <Loading />
        ) : items.isError ? (
          <ListError error={items.error} />
        ) : (
          <ListingDataView
            data={items.data.content}
            viewMode={viewMode}
            variant="compact"
            cardMinWidth={200}
            listHeader={[
              { label: "Item", width: "45%" },
              { label: "Atributos", width: "25%", hidden: isMobile },
              { label: "Categorias", width: "30%", hidden: isMobile },
              { label: "Preços", align: "right" as const, width: "10%", hidden: true },
            ]}
            emptyMessage="Nenhum item com este atributo."
            getRowColor={(item) => rarityColorOf(itemView, item)}
            renderCard={(item, variant) => <ApiItemCard item={item} variant={variant} view={itemView} />}
            renderListItem={(item) => itemListCells(item, itemView)}
            renderIconItem={(item) => <ApiItemIcon item={item} view={itemView} />}
          />
        ))}

      {tab === "entities" &&
        (entities.isPending ? (
          <Loading />
        ) : entities.isError ? (
          <ListError error={entities.error} />
        ) : (
          <ListingDataView
            data={entities.data.content}
            viewMode={viewMode}
            variant="compact"
            cardMinWidth={200}
            listHeader={[
              { label: "Entidade", width: "60%" },
              { label: "Valor", width: "40%" },
            ]}
            emptyMessage="Nenhuma entidade com este atributo."
            getRowColor={(entity) => entityRarityColor(entityView, entity)}
            renderCard={(entity, variant) => <ApiEntityCard entity={entity} variant={variant} view={entityView} />}
            renderListItem={(entity) => {
              const value = entity.attributes[attributeKey];
              return [
                entityListCells(entity, entityView)[0],
                value === undefined ? (
                  <Typography key="value" variant="caption" color="text.disabled">
                    -
                  </Typography>
                ) : (
                  <DataChip key="value" label={attributeLabel(attributeKey, value, definition)} />
                ),
              ];
            }}
            renderIconItem={(entity) => <ApiEntityIcon entity={entity} view={entityView} />}
          />
        ))}
    </StyledContainer>
  );
}
