import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { ApiError } from "../../api/ApiError";
import type { ContentResource } from "../../api/content";
import type { ListingFilterOption } from "../../api/query";
import { useContentCounts, useListingFilters } from "../../api/useContent";
import { usePlatform } from "../../hooks/usePlatform";
import { ContentIcon } from "./ContentIcon";
import { ListingDataView } from "./ListingDataView";
import { StyledContainer } from "./StyledContainer";

/** O valor de "nenhuma opção" na URL das listas. */
const ALL = "all";

interface CategoryPanelPageProps {
  /** Recurso da listagem, cujo filtro traz as opções (GET /{resource}/query/filters). */
  resource: ContentResource;
  /** Key do filtro da listagem que vira os cards: "category", "station"... */
  filterKey: string;
  /** Tipo de conteúdo contado no card de todos (GET /content-counts) e símbolo dele sem ícone. */
  kind: string;
  /** Símbolo das opções sem ícone. */
  optionKind: string;
  /** Rota da lista, relativa ao jogo; a opção escolhida vai no fim. */
  listPath: string;
  title: (gameId: string) => string;
  label: string;
  allLabel: string;
  searchPlaceholder: string;
  emptyMessage: string;
  unit: [singular: string, plural: string];
}

/**
 * Painel de uma listagem: as opções de um filtro dela (as categorias principais, as bancadas), cada
 * uma com quantos registros tem, e um card de todos à frente. Escolher uma abre a lista filtrada.
 */
export function CategoryPanelPage({
  resource,
  filterKey,
  kind,
  optionKind,
  listPath,
  title,
  label,
  allLabel,
  searchPlaceholder,
  emptyMessage,
  unit,
}: CategoryPanelPageProps) {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { isMobile } = usePlatform();
  const [search, setSearch] = useState("");

  const listing = useListingFilters(gameId, resource);
  const counts = useContentCounts(gameId);

  const cards = useMemo<ListingFilterOption[]>(() => {
    const options = listing.data?.filters.find((filter) => filter.key === filterKey)?.options ?? [];
    const term = search.trim().toLowerCase();
    if (term) return options.filter((option) => option.label.toLowerCase().includes(term));
    return [{ value: ALL, label: allLabel, count: counts.data?.[kind] }, ...options];
  }, [listing.data, counts.data, search, filterKey, kind, allLabel]);

  return (
    <StyledContainer
      title={title(gameId)}
      label={label}
      search={{ placeholder: searchPlaceholder }}
      searchValue={search}
      onChangeSearch={setSearch}
    >
      {listing.isPending ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : listing.isError ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar as opções.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {listing.error instanceof ApiError ? listing.error.message : "Erro inesperado."}
          </Typography>
        </Stack>
      ) : (
        <ListingDataView
          data={cards}
          viewMode="cards"
          cardMinWidth={isMobile ? 150 : 220}
          emptyMessage={emptyMessage}
          renderCard={(option) => {
            const all = option.value === ALL;
            return (
              <Card
                onClick={() => navigate(`/game/${gameId}/${listPath}/${encodeURIComponent(option.value)}`)}
                sx={{
                  height: "100%",
                  cursor: "pointer",
                  borderRadius: 1,
                  border: 1,
                  borderColor: all ? "primary.main" : "divider",
                  transition: "all 0.3s",
                  "&:hover": { transform: "translateY(-4px)", borderColor: "primary.main" },
                }}
              >
                <Stack alignItems="center" spacing={1.5} sx={{ p: isMobile ? 2 : 3, textAlign: "center", height: "100%" }}>
                  <ContentIcon mediaId={option.iconMediaId} kind={all ? kind : optionKind} alt={option.label} size={56} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    {option.label}
                  </Typography>
                  {option.count != null && (
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`${option.count} ${option.count === 1 ? unit[0] : unit[1]}`}
                      sx={{ mt: "auto", fontWeight: 700 }}
                    />
                  )}
                </Stack>
              </Card>
            );
          }}
        />
      )}
    </StyledContainer>
  );
}
