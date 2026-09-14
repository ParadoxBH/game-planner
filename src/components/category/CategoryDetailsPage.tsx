import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { CircularProgress, Grid, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import { Bolt, Construction, Inventory, Storefront } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import {
  MAX_PAGE_SIZE,
  type CategoryDocument,
  type CategoryRelated,
  type ContentPage,
  type EntityDocument,
  type ItemDocument,
  type ListQuery,
  type RecipeDocument,
  type Reference,
  type ShopDocument,
} from "../../api/content";
import { currentMedia, ReferenceIndex } from "../../api/references";
import { useAttributeDefinitions, useContentDetails, useContentList, useRarities } from "../../api/useContent";
import { useEventFilter } from "../../context/EventFilterContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { useViewMode } from "../../hooks/useViewMode";
import { usePlatform } from "../../hooks/usePlatform";
import { ContentIcon } from "../common/ContentIcon";
import { ListingDataView } from "../common/ListingDataView";
import { StyledContainer } from "../common/StyledContainer";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { ApiEntityCard, ApiEntityIcon, entityListCells, entityRarityColor, type EntityListView } from "../entity/ApiEntityRenderers";
import { ApiItemCard, ApiItemIcon, itemListCells, rarityColorOf, type ItemListView } from "../item/ApiItemRenderers";
import { ApiRecipeCard } from "../recipe/ApiRecipeCard";
import { ApiShopCard, type ShopListView } from "../shop/ApiShopRenderers";
import { APPLIES_TO_LABELS } from "./CategoriesPage";

type CategoryTab = "items" | "entities" | "recipes" | "shops";

const TABS: Record<CategoryTab, { label: string; icon: ReactElement }> = {
  items: { label: "Itens", icon: <Inventory /> },
  entities: { label: "Entidades", icon: <Bolt /> },
  recipes: { label: "Receitas", icon: <Construction /> },
  shops: { label: "Lojas", icon: <Storefront /> },
};

const NO_CRITERIA = {};

/** Abas com conteúdo: itens e entidades conforme o que a categoria agrupa, receitas e lojas quando houver. */
function tabsFor(category: CategoryDocument, related: CategoryRelated): CategoryTab[] {
  const tabs: CategoryTab[] = [];
  if (category.appliesTo !== "entity" || related.items.total > 0) tabs.push("items");
  if (category.appliesTo !== "item" || related.entities.total > 0) tabs.push("entities");
  if (related.producedBy.total + related.usedIn.total > 0) tabs.push("recipes");
  if (related.shops.total > 0) tabs.push("shops");
  return tabs;
}

function tabCount(tab: CategoryTab, related: CategoryRelated): number {
  switch (tab) {
    case "items":
      return related.items.total;
    case "entities":
      return related.entities.total;
    case "recipes":
      return related.producedBy.total + related.usedIn.total;
    case "shops":
      return related.shops.total;
  }
}

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

function RecipeSection({
  title,
  page,
  references,
  highlight,
}: {
  title: string;
  page: ContentPage<RecipeDocument>;
  references: ReferenceIndex;
  highlight: Reference;
}) {
  if (page.content.length === 0) return null;
  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
        {title} ({page.total})
      </Typography>
      <Grid container spacing={1}>
        {page.content.map((recipe) => (
          <Grid size={{ xs: 12, lg: 6 }} key={recipe.extId}>
            <ApiRecipeCard recipe={recipe} references={references} highlight={highlight} />
          </Grid>
        ))}
      </Grid>
      {page.content.length < page.total && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Mostrando {page.content.length} de {page.total}.
        </Typography>
      )}
    </Paper>
  );
}

/** Detalhe de categoria: itens e entidades paginados pela listagem, receitas e lojas do agregado /details. */
export function CategoryDetailsPage() {
  const { gameId = "", categoryId = "" } = useParams<{ gameId: string; categoryId: string }>();
  const { isMobile } = usePlatform();
  const { activeEventIds } = useEventFilter();
  const [selectedTab, setSelectedTab] = useState<CategoryTab>("items");
  const [viewMode, setViewMode] = useViewMode("category_details");
  const pages = usePagination(NO_CRITERIA);

  const details = useContentDetails<CategoryDocument, CategoryRelated>(gameId, "categories", categoryId);
  const tabs = details.data ? tabsFor(details.data.document, details.data.related) : [];
  const tab: CategoryTab | undefined = tabs.includes(selectedTab) ? selectedTab : tabs[0];

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { pagination } = pages.info;
  const query = useMemo<ListQuery>(
    () => ({
      search: search || undefined,
      categories: [categoryId],
      page: pagination.page - 1,
      size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
      sort: "name",
      filters: { activeEvents: activeEventIds.join(",") },
    }),
    [search, categoryId, pagination, activeEventIds],
  );

  const items = useContentList<ItemDocument>(gameId, "items", query, { enabled: tab === "items" });
  const entities = useContentList<EntityDocument>(gameId, "entities", query, { enabled: tab === "entities" });
  const categories = useContentList<CategoryDocument>(gameId, "categories", { size: MAX_PAGE_SIZE, sort: "name" });
  const shops = useContentList<ShopDocument>(gameId, "shops", { size: MAX_PAGE_SIZE }, { enabled: tab === "entities" });
  const rarities = useRarities(gameId);
  const attributes = useAttributeDefinitions(gameId);
  const references = useMemo(() => new ReferenceIndex(details.data?.references), [details.data]);

  useEffect(() => {
    const total = tab === "items" ? items.data?.total : tab === "entities" ? entities.data?.total : undefined;
    if (total !== undefined) pages.setTotalItems(total);
  }, [tab, items.data, entities.data, pages.setTotalItems]);

  const categoryMap = useMemo(
    () => new Map((categories.data?.content ?? []).map((category) => [category.extId, category])),
    [categories.data],
  );
  const rarityMap = useMemo(() => new Map((rarities.data ?? []).map((rarity) => [rarity.code, rarity])), [rarities.data]);
  const itemView = useMemo<ItemListView>(
    () => ({
      gameId,
      showPrices: false,
      rarities: rarityMap,
      categories: categoryMap,
      attributes: new Map((attributes.data ?? []).map((definition) => [definition.key, definition])),
    }),
    [gameId, rarityMap, categoryMap, attributes.data],
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
  const shopView = useMemo<ShopListView>(() => ({ gameId, references }), [gameId, references]);

  if (details.isPending) {
    return (
      <StyledContainer title="Carregando..." label="Obtendo dados da categoria">
        <Loading />
      </StyledContainer>
    );
  }

  if (details.isError) {
    const unregistered = details.error instanceof ApiError && details.error.kind === "unregistered-content";
    return (
      <StyledContainer
        title={unregistered ? "Categoria não cadastrada" : "Não foi possível abrir a categoria"}
        label={unregistered ? `"${categoryId}" é citada em outros conteúdos, mas ainda não foi cadastrada.` : details.error.message}
      >
        <Typography variant="body2" color="text.secondary">
          Verifique o código ou volte para a <Link to={`/game/${gameId}/categories`}>lista de categorias</Link>.
        </Typography>
      </StyledContainer>
    );
  }

  const { document: category, related } = details.data;
  const self: Reference = { kind: "category", extId: category.extId };
  const paged = tab === "items" || tab === "entities";

  const changeTab = (next: CategoryTab) => {
    setSelectedTab(next);
    pages.setPage(1);
  };

  return (
    <StyledContainer
      prefix={<ContentIcon mediaId={currentMedia(category.media, "icon")} kind="category" alt={category.name} size={60} />}
      title={category.name}
      label={category.summary ?? category.description ?? `${APPLIES_TO_LABELS[category.appliesTo]} da categoria ${category.extId}`}
      searchValue={paged ? pages.info.search : undefined}
      onChangeSearch={paged ? pages.setSearch : undefined}
      search={{ placeholder: tab === "entities" ? "Pesquisar entidades da categoria..." : "Pesquisar itens da categoria..." }}
      pages={paged ? pages : undefined}
      actionsStart={
        <Tabs value={tab ?? false} onChange={(_, value: CategoryTab) => changeTab(value)} variant="scrollable" scrollButtons="auto">
          {tabs.map((value) => (
            <Tab
              key={value}
              value={value}
              icon={TABS[value].icon}
              iconPosition="start"
              label={`${TABS[value].label} (${tabCount(value, related)})`}
            />
          ))}
        </Tabs>
      }
      actionsEnd={
        paged ? (
          <Stack direction="row" flex={1} justifyContent={isMobile ? "flex-start" : "flex-end"}>
            <ViewModeSelector mode={viewMode} onChange={setViewMode} />
          </Stack>
        ) : undefined
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
            emptyMessage="Nenhum item desta categoria com estes filtros."
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
              { label: "Entidade", width: "70%" },
              { label: "Preços", align: "right" as const, width: "30%", hidden: true },
            ]}
            emptyMessage="Nenhuma entidade desta categoria com estes filtros."
            getRowColor={(entity) => entityRarityColor(entityView, entity)}
            renderCard={(entity, variant) => <ApiEntityCard entity={entity} variant={variant} view={entityView} />}
            renderListItem={(entity) => entityListCells(entity, entityView)}
            renderIconItem={(entity) => <ApiEntityIcon entity={entity} view={entityView} />}
          />
        ))}

      {tab === "recipes" && (
        <Stack spacing={2} sx={{ overflowY: "auto", flex: 1 }}>
          <RecipeSection title="Receitas que produzem esta categoria" page={related.producedBy} references={references} highlight={self} />
          <RecipeSection
            title="Receitas que aceitam esta categoria como ingrediente"
            page={related.usedIn}
            references={references}
            highlight={self}
          />
        </Stack>
      )}

      {tab === "shops" && (
        <Stack sx={{ overflowY: "auto", flex: 1 }}>
          <Grid container spacing={1}>
            {related.shops.content.map((shop) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={shop.extId}>
                <ApiShopCard shop={shop} variant="default" view={shopView} />
              </Grid>
            ))}
          </Grid>
        </Stack>
      )}
    </StyledContainer>
  );
}
