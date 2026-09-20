import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, CircularProgress, Stack, Tooltip, Typography } from "@mui/material";
import { Add, Science } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type RecipeDocument } from "../../api/content";
import { contentRoute, ReferenceIndex } from "../../api/references";
import { useListing, useListingFilters } from "../../api/useContent";
import type { FilterValue, FilterValues } from "../../api/query";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useGameEditor } from "../../hooks/useGameAdmin";
import { usePagination } from "../../hooks/usePagination";
import { useViewMode } from "../../hooks/useViewMode";
import { formatDuration } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { ContentIcon } from "../common/ContentIcon";
import { DataChip } from "../common/DataChip";
import { ListingDataView } from "../common/ListingDataView";
import { QueryBuilder } from "../common/QueryBuilder";
import { StyledContainer } from "../common/StyledContainer";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { ApiRecipeCard, recipeTitle, unlockLabel } from "./ApiRecipeCard";
import { RecipeFormDialog } from "./RecipeFormDialog";

/** A bancada vem da URL, /recipes/list/:station; "all" é nenhuma. */
function stationFilter(station: string | undefined): FilterValues {
  return { station: station && station !== "all" ? station : null };
}

/**
 * Lista de receitas, lida da API com as referências já resolvidas. A busca e os filtros ficam no QueryBuilder e
 * vêm do backend (GET /recipes/query/filters).
 */
export function RecipesPage() {
  const { gameId = "", category: urlStation } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();

  const pages = usePagination<FilterValues>(stationFilter(urlStation));
  const [viewMode, setViewMode] = useViewMode("recipes");
  const { canEdit } = useGameEditor(gameId);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    pages.setCriteria(stationFilter(urlStation));
  }, [urlStation]);

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { criteria, pagination } = pages.info;

  const listing = useListingFilters(gameId, "recipes");
  const recipes = useListing<RecipeDocument>(gameId, "recipes", {
    search,
    values: criteria,
    page: pagination.page - 1,
    size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
    references: true,
  });
  const references = useMemo(() => new ReferenceIndex(recipes.data?.references), [recipes.data]);

  useEffect(() => {
    if (recipes.data) pages.setTotalItems(recipes.data.total);
  }, [recipes.data, pages.setTotalItems]);

  // A bancada fica na URL, para o link ser compartilhável; o resto, no estado da página.
  const changeFilter = (key: string, value: FilterValue) => {
    if (key === "station") navigate(`/game/${gameId}/recipes/list/${value || "all"}`);
    else pages.setCriteria({ [key]: value });
  };

  const openRecipe = (recipe: RecipeDocument) => navigate(contentRoute(gameId, "recipe", recipe.extId)!);

  return (
    <StyledContainer
      title={`Receitas de ${gameId}`}
      label="Descubra como fabricar todos os itens do jogo."
      searchEnd={
        <>
          {canEdit && (
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => setCreating(true)}
              sx={{ textTransform: "none", whiteSpace: "nowrap" }}
            >
              Nova receita
            </Button>
          )}
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
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
      {recipes.isPending ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : recipes.isError ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar as receitas.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {recipes.error instanceof ApiError ? recipes.error.message : "Erro inesperado."}
          </Typography>
        </Stack>
      ) : (
        <ListingDataView
          data={recipes.data.content}
          viewMode={viewMode}
          variant="default"
          cardMinWidth={320}
          listHeader={[
            { label: "Receita / produto", width: "30%" },
            { label: "Tempo / ingredientes", width: "40%" },
            { label: "Bancadas", width: "15%" },
            { label: "Desbloqueio", align: "right" as const, width: "15%" },
          ]}
          emptyMessage="Nenhuma receita encontrada com estes filtros."
          renderCard={(recipe) => <ApiRecipeCard recipe={recipe} references={references} />}
          renderListItem={(recipe) => {
            const output = recipe.outputs[0];
            return [
              <Stack key="name" direction="row" spacing={2} alignItems="center" sx={{ cursor: "pointer" }} onClick={() => openRecipe(recipe)}>
                {output ? (
                  <ContentChip target={output.target} resolved={references.find(output.target)} size="small" disableLink />
                ) : (
                  <Science sx={{ color: "text.disabled" }} />
                )}
                <Typography variant="body2" fontWeight={700} sx={{ "&:hover": { color: "primary.main" } }}>
                  {recipeTitle(recipe, references)}
                </Typography>
              </Stack>,
              <Stack key="inputs" direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {recipe.craftTimeSeconds ? <DataChip label={formatDuration(recipe.craftTimeSeconds)} /> : null}
                {recipe.inputs.map((input, index) => (
                  <ContentChip
                    key={index}
                    target={input.target}
                    resolved={references.find(input.target)}
                    amount={input.amount}
                    notConsumed={input.notConsumed}
                    size="small"
                  />
                ))}
              </Stack>,
              <Stack key="stations" direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {recipe.stations.map((station) => {
                  const target = { kind: "entity", extId: station.extId };
                  return (
                    <ContentChip
                      key={station.extId}
                      target={target}
                      resolved={references.find(target)}
                      level={station.level}
                      levelOperator="min"
                      size="small"
                    />
                  );
                })}
              </Stack>,
              <Typography key="unlock" variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "right", fontWeight: 700 }}>
                {recipe.unlock[0] ? unlockLabel(recipe.unlock[0], references) : "-"}
              </Typography>,
            ];
          }}
          renderIconItem={(recipe) => {
            const output = recipe.outputs[0];
            const resolved = output ? references.find(output.target) : undefined;
            return (
              <Tooltip title={`${recipeTitle(recipe, references)} (${recipe.extId})`}>
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  onClick={() => openRecipe(recipe)}
                  sx={{ width: "100%", height: "100%", p: 1, cursor: "pointer" }}
                >
                  <ContentIcon mediaId={resolved?.iconMediaId} kind={resolved?.resolvedKind ?? "recipe"} size={56} />
                </Stack>
              </Tooltip>
            );
          }}
        />
      )}
      {creating && (
        <RecipeFormDialog
          gameId={gameId}
          recipe={null}
          onClose={() => setCreating(false)}
          onSaved={(extId) => navigate(contentRoute(gameId, "recipe", extId)!)}
        />
      )}
    </StyledContainer>
  );
}
