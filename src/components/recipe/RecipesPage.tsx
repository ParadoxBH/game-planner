import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircularProgress, Stack, Tooltip, Typography } from "@mui/material";
import { Build, Science } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type ListQuery, type RecipeDocument } from "../../api/content";
import { contentRoute, mediaUrl, ReferenceIndex } from "../../api/references";
import { useContentList, useRecipeStations } from "../../api/useContent";
import { and, inActiveEvents, rule, textSearch } from "../../api/query";
import { useEventFilter } from "../../context/EventFilterContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { useViewMode } from "../../hooks/useViewMode";
import type { RecipeCriteria } from "../../types/filterTypes";
import { formatDuration } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { ContentIcon } from "../common/ContentIcon";
import { DataChip } from "../common/DataChip";
import { ListingDataView } from "../common/ListingDataView";
import { PickSelector } from "../common/PickSelector";
import { StyledContainer } from "../common/StyledContainer";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { ApiRecipeCard, recipeTitle, unlockLabel } from "./ApiRecipeCard";

/** Lista de receitas, lida da API com as referências já resolvidas. */
export function RecipesPage() {
  const { gameId = "", category: urlStation } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();
  const { isMobile } = usePlatform();
  const { activeEventIds } = useEventFilter();

  const pages = usePagination<RecipeCriteria>({ primaryStation: urlStation || "all", subStationStates: {} });
  const [viewMode, setViewMode] = useViewMode("recipes");

  useEffect(() => {
    pages.setCriteria({ primaryStation: urlStation || "all" });
  }, [urlStation]);

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { pagination } = pages.info;
  const station = urlStation && urlStation !== "all" ? urlStation : undefined;

  const query = useMemo<ListQuery>(
    () => ({
      where: and(textSearch(search), station && rule("station", "equal", station), inActiveEvents(activeEventIds)),
      page: pagination.page - 1,
      size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
      references: true,
    }),
    [search, pagination, station, activeEventIds],
  );

  const recipes = useContentList<RecipeDocument>(gameId, "recipes", query);
  const stations = useRecipeStations(gameId);
  const references = useMemo(() => new ReferenceIndex(recipes.data?.references), [recipes.data]);

  useEffect(() => {
    if (recipes.data) pages.setTotalItems(recipes.data.total);
  }, [recipes.data, pages.setTotalItems]);

  const stationOptions = (stations.data ?? []).map((candidate) => ({
    value: candidate.extId,
    label: `${candidate.name ?? candidate.extId} (${candidate.recipeCount})`,
    icon: candidate.iconMediaId ? mediaUrl(candidate.iconMediaId) : undefined,
  }));

  const openRecipe = (recipe: RecipeDocument) => navigate(contentRoute(gameId, "recipe", recipe.extId)!);

  return (
    <StyledContainer
      title={`Receitas de ${gameId}`}
      label="Descubra como fabricar todos os itens do jogo."
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: "Pesquisar receitas pelo nome ou pelo produto..." }}
      pages={pages}
      actionsStart={
        <Stack direction="row" spacing={1} justifyContent="space-between" flex={1} alignItems="center">
          <PickSelector
            label="Bancada"
            value={station ?? null}
            options={stationOptions}
            onChange={(selected) => navigate(`/game/${gameId}/recipes/list/${selected || "all"}`)}
            allLabel="Todas as bancadas"
            icon={<Build sx={{ fontSize: 18 }} />}
            fullWidth={isMobile}
          />
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
        </Stack>
      }
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
                {recipe.stations.map((code) => {
                  const target = { kind: "entity", extId: code };
                  return <ContentChip key={code} target={target} resolved={references.find(target)} size="small" />;
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
    </StyledContainer>
  );
}
