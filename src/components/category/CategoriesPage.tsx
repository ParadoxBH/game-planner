import { useEffect, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Card, CircularProgress, Stack, Tooltip, Typography } from "@mui/material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type CategoryDocument } from "../../api/content";
import { contentRoute, currentMedia } from "../../api/references";
import { useListing, useListingFilters } from "../../api/useContent";
import type { FilterValues } from "../../api/query";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { useViewMode } from "../../hooks/useViewMode";
import { ContentIcon } from "../common/ContentIcon";
import { DataChip } from "../common/DataChip";
import { ListingDataView } from "../common/ListingDataView";
import { ListingFilterBar } from "../common/ListingFilterBar";
import { StyledContainer } from "../common/StyledContainer";
import { ViewModeSelector } from "../common/ViewModeSelector";

export const APPLIES_TO_LABELS: Record<CategoryDocument["appliesTo"], string> = {
  item: "Itens",
  entity: "Entidades",
  both: "Itens e entidades",
};

const NO_FILTERS: FilterValues = {};

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
          <Stack direction="row" spacing={0.5} justifyContent={compact ? "center" : "flex-start"}>
            <DataChip label={APPLIES_TO_LABELS[category.appliesTo]} />
            {category.primary && <PrimaryChip />}
          </Stack>
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

/** Marca a categoria principal, a que abre a listagem de itens e entidades; as demais são sub-categorias. */
function PrimaryChip() {
  return (
    <Tooltip title="Categoria principal: aparece no filtro Categoria e no menu; as demais são sub-categorias">
      <DataChip label="Principal" color="primary" sx={{ bgcolor: "primary.main", color: "primary.contrastText" }} />
    </Tooltip>
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
    <Stack key="appliesTo" direction="row" spacing={0.5}>
      <DataChip label={APPLIES_TO_LABELS[category.appliesTo]} />
      {category.primary && <PrimaryChip />}
    </Stack>,
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
  const pages = usePagination(NO_FILTERS);
  const [viewMode, setViewMode] = useViewMode("categories");

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { criteria, pagination } = pages.info;

  const listing = useListingFilters(gameId, "categories");
  const categories = useListing<CategoryDocument>(gameId, "categories", {
    search,
    values: criteria,
    page: pagination.page - 1,
    size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
    sort: "name",
  });

  useEffect(() => {
    if (categories.data) pages.setTotalItems(categories.data.total);
  }, [categories.data, pages.setTotalItems]);

  return (
    <StyledContainer
      title="Explorar categorias"
      label="Navegue por todo o conteúdo organizado por tipos de itens e entidades."
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: listing.data?.search.placeholder }}
      pages={pages}
      actionsStart={
        <Stack direction="row" spacing={1} justifyContent="space-between" flex={1} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <ListingFilterBar
              filters={listing.data?.filters}
              values={criteria}
              onChange={(key, value) => pages.setCriteria({ [key]: value })}
            />
          </Stack>
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
