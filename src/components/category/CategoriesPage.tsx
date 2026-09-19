import { useEffect, useMemo, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Card, CircularProgress, Stack, Tooltip, Typography } from "@mui/material";
import { FilterList } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type CategoryDocument, type ListQuery } from "../../api/content";
import { contentRoute, currentMedia } from "../../api/references";
import { useContentList } from "../../api/useContent";
import { and, inActiveEvents, rule, textSearch } from "../../api/query";
import { useEventFilter } from "../../context/EventFilterContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { useViewMode } from "../../hooks/useViewMode";
import { ContentIcon } from "../common/ContentIcon";
import { DataChip } from "../common/DataChip";
import { ListingDataView } from "../common/ListingDataView";
import { PickSelector } from "../common/PickSelector";
import { StyledContainer } from "../common/StyledContainer";
import { ViewModeSelector } from "../common/ViewModeSelector";

export const APPLIES_TO_LABELS: Record<CategoryDocument["appliesTo"], string> = {
  item: "Itens",
  entity: "Entidades",
  both: "Itens e entidades",
};

interface CategoryCriteria {
  appliesTo: string | null;
}

const INITIAL_CRITERIA: CategoryCriteria = { appliesTo: null };

function categoryRoute(gameId: string, category: CategoryDocument): string {
  return contentRoute(gameId, "category", category.extId)!;
}

function CategoryCard({ category, variant, gameId }: { category: CategoryDocument; variant: "default" | "compact"; gameId: string }) {
  const navigate = useNavigate();
  const compact = variant === "compact";
  return (
    <Card
      onClick={() => navigate(categoryRoute(gameId, category))}
      sx={{
        height: "100%",
        cursor: "pointer",
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        transition: "all 0.3s",
        "&:hover": { transform: "translateY(-4px)", borderColor: "primary.main" },
      }}
    >
      <Stack direction={compact ? "column" : "row"} spacing={2} alignItems="center" sx={{ p: 2, textAlign: compact ? "center" : "left" }}>
        <ContentIcon mediaId={currentMedia(category.media, "icon")} kind="category" alt={category.name} size={compact ? 56 : 48} />
        <Stack spacing={0.5} alignItems={compact ? "center" : "flex-start"} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {category.name}
          </Typography>
          <DataChip label={APPLIES_TO_LABELS[category.appliesTo]} />
          {!compact && category.summary && (
            <Typography variant="caption" color="text.secondary">
              {category.summary}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

function CategoryNameCell({ category, gameId }: { category: CategoryDocument; gameId: string }) {
  const navigate = useNavigate();
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ cursor: "pointer" }} onClick={() => navigate(categoryRoute(gameId, category))}>
      <ContentIcon mediaId={currentMedia(category.media, "icon")} kind="category" alt={category.name} size={28} />
      <Typography variant="body2" sx={{ fontWeight: 700, "&:hover": { color: "primary.main" } }}>
        {category.name}
      </Typography>
    </Stack>
  );
}

function categoryListCells(category: CategoryDocument, gameId: string): ReactNode[] {
  return [
    <CategoryNameCell key="name" category={category} gameId={gameId} />,
    <DataChip key="appliesTo" label={APPLIES_TO_LABELS[category.appliesTo]} />,
    <Typography key="id" variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
      {category.extId}
    </Typography>,
  ];
}

function CategoryIconItem({ category, gameId }: { category: CategoryDocument; gameId: string }) {
  const navigate = useNavigate();
  return (
    <Tooltip title={`${category.name} (${category.extId})`}>
      <Box
        onClick={() => navigate(categoryRoute(gameId, category))}
        sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", p: 1, cursor: "pointer" }}
      >
        <ContentIcon mediaId={currentMedia(category.media, "icon")} kind="category" alt={category.name} size={56} />
      </Box>
    </Tooltip>
  );
}

/** Lista de categorias, lida da API, filtrável pelo que a categoria agrupa. */
export function CategoriesPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const { isMobile } = usePlatform();
  const { activeEventIds } = useEventFilter();
  const pages = usePagination(INITIAL_CRITERIA);
  const [viewMode, setViewMode] = useViewMode("categories");

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { criteria, pagination } = pages.info;

  const query = useMemo<ListQuery>(
    () => ({
      where: and(
        textSearch(search),
        // Categoria "both" vale para item e para entidade.
        criteria.appliesTo &&
          rule("appliesTo", "in", criteria.appliesTo === "both" ? ["both"] : [criteria.appliesTo, "both"]),
        inActiveEvents(activeEventIds),
      ),
      page: pagination.page - 1,
      size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
      sort: "name",
    }),
    [search, pagination, criteria.appliesTo, activeEventIds],
  );

  const categories = useContentList<CategoryDocument>(gameId, "categories", query);

  useEffect(() => {
    if (categories.data) pages.setTotalItems(categories.data.total);
  }, [categories.data, pages.setTotalItems]);

  return (
    <StyledContainer
      title="Explorar categorias"
      label="Navegue por todo o conteúdo organizado por tipos de itens e entidades."
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: "Pesquisar categorias..." }}
      pages={pages}
      actionsStart={
        <Stack direction="row" spacing={1} justifyContent="space-between" flex={1} alignItems="center">
          <PickSelector
            label="Agrupa"
            value={criteria.appliesTo}
            options={[
              { value: "item", label: "Itens" },
              { value: "entity", label: "Entidades" },
            ]}
            onChange={(appliesTo) => pages.setCriteria({ appliesTo })}
            allLabel="Tudo"
            icon={<FilterList sx={{ fontSize: 18 }} />}
            fullWidth={isMobile}
          />
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
        </Stack>
      }
    >
      {categories.isPending ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : categories.isError ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar as categorias.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {categories.error instanceof ApiError ? categories.error.message : "Erro inesperado."}
          </Typography>
        </Stack>
      ) : (
        <ListingDataView
          data={categories.data.content}
          viewMode={viewMode}
          variant="default"
          cardMinWidth={260}
          listHeader={[
            { label: "Categoria", width: "50%" },
            { label: "Agrupa", width: "25%" },
            { label: "Código", width: "25%", hidden: isMobile },
          ]}
          emptyMessage="Nenhuma categoria encontrada com estes filtros."
          renderCard={(category, variant) => <CategoryCard category={category} variant={variant} gameId={gameId} />}
          renderListItem={(category) => categoryListCells(category, gameId)}
          renderIconItem={(category) => <CategoryIconItem category={category} gameId={gameId} />}
        />
      )}
    </StyledContainer>
  );
}
