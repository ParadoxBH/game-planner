import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Card, CircularProgress, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { Add, Delete, Edit, Visibility } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type CategoryDocument } from "../../api/content";
import { contentRoute, currentMedia } from "../../api/references";
import { useContentWrites, useListing, useListingFilters } from "../../api/useContent";
import type { FilterValues } from "../../api/query";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { useViewMode } from "../../hooks/useViewMode";
import { AdminGate } from "../common/AdminGate";
import { ContentIcon } from "../common/ContentIcon";
import { DataChip } from "../common/DataChip";
import { ListingDataView } from "../common/ListingDataView";
import { QueryBuilder } from "../common/QueryBuilder";
import { StyledContainer } from "../common/StyledContainer";
import { StyledDialog } from "../common/StyledDialog";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { CategoryFormDialog } from "./CategoryFormDialog";

export const APPLIES_TO_LABELS: Record<CategoryDocument["appliesTo"], string> = {
  item: "Itens",
  entity: "Entidades",
  both: "Itens e entidades",
};

const NO_FILTERS: FilterValues = {};

function categoryRoute(gameId: string, category: CategoryDocument): string {
  return contentRoute(gameId, "category", category.extId)!;
}

/** O que o painel faz com uma categoria. */
interface CategoryActions {
  onEdit: (category: CategoryDocument) => void;
  onDelete: (category: CategoryDocument) => void;
}

/** Visualizar, editar e apagar. Os cliques não chegam ao card, que também abre a categoria. */
function CategoryActionButtons({ category, gameId, actions }: { category: CategoryDocument; gameId: string; actions: CategoryActions }) {
  const navigate = useNavigate();
  const act = (handler: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    handler();
  };
  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Visualizar">
        <IconButton size="small" onClick={act(() => navigate(categoryRoute(gameId, category)))}>
          <Visibility fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Editar">
        <IconButton size="small" onClick={act(() => actions.onEdit(category))}>
          <Edit fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Apagar">
        <IconButton size="small" color="error" onClick={act(() => actions.onDelete(category))}>
          <Delete fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function CategoryCard({
  category,
  variant,
  gameId,
  actions,
}: {
  category: CategoryDocument;
  variant: "default" | "compact";
  gameId: string;
  actions: CategoryActions;
}) {
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
          <CategoryActionButtons category={category} gameId={gameId} actions={actions} />
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

function categoryListCells(category: CategoryDocument, gameId: string, actions: CategoryActions): ReactNode[] {
  return [
    <CategoryNameCell key="name" category={category} gameId={gameId} />,
    <Stack key="appliesTo" direction="row" spacing={0.5}>
      <DataChip label={APPLIES_TO_LABELS[category.appliesTo]} />
      {category.primary && <PrimaryChip />}
    </Stack>,
    <Typography key="id" variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
      {category.extId}
    </Typography>,
    <CategoryActionButtons key="actions" category={category} gameId={gameId} actions={actions} />,
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

/** Confirma e apaga a categoria. O backend guarda o último estado como revisão, para restaurar depois. */
function DeleteCategoryDialog({ gameId, category, onClose }: { gameId: string; category: CategoryDocument; onClose: () => void }) {
  const { remove } = useContentWrites(gameId, "categories");

  return (
    <StyledDialog
      open
      onClose={remove.isPending ? () => undefined : onClose}
      title="Apagar categoria"
      maxWidth="xs"
      actions={
        <>
          <Button onClick={onClose} disabled={remove.isPending} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={remove.isPending}
            startIcon={remove.isPending ? <CircularProgress size={16} color="inherit" /> : <Delete />}
            onClick={() => remove.mutate(category.extId, { onSuccess: onClose })}
            sx={{ textTransform: "none" }}
          >
            Apagar
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2">
          Apagar <strong>{category.name ?? category.extId}</strong> (<code>{category.extId}</code>)? Itens e
          entidades que a usam continuam marcados com o código dela. O último estado fica guardado como revisão.
        </Typography>
        {remove.error && (
          <Alert severity="error">{remove.error instanceof ApiError ? remove.error.message : "Erro inesperado."}</Alert>
        )}
      </Stack>
    </StyledDialog>
  );
}

/**
 * Painel de categorias, só para administradores do jogo: lista todas, filtrável pelo que a categoria
 * agrupa, e permite visualizar, criar, editar e apagar. A restrição aqui é de interface; cada escrita é
 * validada pelo backend.
 */
export function CategoriesPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  return (
    <AdminGate gameId={gameId} title="Categorias" from={`/game/${gameId}/categories`}>
      <CategoriesPanel gameId={gameId} />
    </AdminGate>
  );
}

function CategoriesPanel({ gameId }: { gameId: string }) {
  const { isMobile } = usePlatform();
  const pages = usePagination(NO_FILTERS);
  const [viewMode, setViewMode] = useViewMode("categories");
  // undefined: formulário fechado; null: criando.
  const [editing, setEditing] = useState<CategoryDocument | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<CategoryDocument | null>(null);
  const actions: CategoryActions = { onEdit: setEditing, onDelete: setDeleting };

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
      title="Categorias"
      label="Gerencie as categorias que organizam os itens e as entidades do jogo."
      searchEnd={
        <>
          <Button variant="contained" startIcon={<Add />} onClick={() => setEditing(null)} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            Nova categoria
          </Button>
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
          <QueryBuilder
            schema={listing.data}
            search={pages.info.search}
            onSearchChange={pages.setSearch}
            values={criteria}
            onChange={(key, value) => pages.setCriteria({ [key]: value })}
          />
        </>
      }
      pages={pages}
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
            { label: "Categoria", width: "40%" },
            { label: "Agrupa", width: "25%" },
            { label: "Código", width: "20%", hidden: isMobile },
            { label: "Ações", width: "15%", align: "right" as const },
          ]}
          emptyMessage="Nenhuma categoria encontrada com estes filtros."
          renderCard={(category, variant) => <CategoryCard category={category} variant={variant} gameId={gameId} actions={actions} />}
          renderListItem={(category) => categoryListCells(category, gameId, actions)}
          renderIconItem={(category) => <CategoryIconItem category={category} gameId={gameId} />}
        />
      )}
      {editing !== undefined && (
        <CategoryFormDialog gameId={gameId} category={editing} onClose={() => setEditing(undefined)} />
      )}
      {deleting && <DeleteCategoryDialog gameId={gameId} category={deleting} onClose={() => setDeleting(null)} />}
    </StyledContainer>
  );
}
