import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Card, CircularProgress, Stack, Typography } from "@mui/material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type CollectionDocument, type CollectionGroupDocument } from "../../api/content";
import { contentRoute, currentMedia } from "../../api/references";
import { useListing, useListingFilters } from "../../api/useContent";
import type { FilterValues } from "../../api/query";
import {
  addProgress,
  groupProgress,
  isComplete,
  NO_PROGRESS,
  useCollectedMembers,
  type Progress,
} from "../../hooks/useCollectedMembers";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { ContentIcon } from "../common/ContentIcon";
import { ListingDataView } from "../common/ListingDataView";
import { QueryBuilder } from "../common/QueryBuilder";
import { StyledContainer } from "../common/StyledContainer";
import { CollectionProgress } from "./CollectionProgress";

const NO_FILTERS: FilterValues = {};

/** Lista de coleções (conjuntos), lida da API, com o progresso marcado no navegador. */
export function ConjuntosPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { isMobile } = usePlatform();
  const { collected } = useCollectedMembers(gameId);
  const pages = usePagination(NO_FILTERS);

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { criteria, pagination } = pages.info;

  const listing = useListingFilters(gameId, "collections");
  const collections = useListing<CollectionDocument>(gameId, "collections", {
    search,
    values: criteria,
    page: pagination.page - 1,
    size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
    sort: "name",
  });
  // O progresso soma os grupos dos eventos ativos; uma página cheia cobre os grupos do jogo.
  const groups = useListing<CollectionGroupDocument>(gameId, "collection-groups", { size: MAX_PAGE_SIZE });

  useEffect(() => {
    if (collections.data) pages.setTotalItems(collections.data.total);
  }, [collections.data, pages.setTotalItems]);

  const progressByCollection = useMemo(() => {
    const progress = new Map<string, Progress>();
    (groups.data?.content ?? []).forEach((group) => {
      const own = groupProgress(group, collected);
      group.collections.forEach((id) => progress.set(id, addProgress(progress.get(id) ?? NO_PROGRESS, own)));
    });
    return progress;
  }, [groups.data, collected]);

  const visible = collections.data?.content ?? [];

  return (
    <StyledContainer
      title="Conjuntos"
      label="Explore coleções e conjuntos de itens temáticos."
      searchEnd={
        <QueryBuilder
          schema={listing.data}
          search={pages.info.search}
          onSearchChange={pages.setSearch}
          values={criteria}
          onChange={(key, value) => pages.setCriteria({ [key]: value })}
        />
      }
      pages={pages}
    >
      {collections.isPending ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : collections.isError ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar os conjuntos.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {collections.error instanceof ApiError ? collections.error.message : "Erro inesperado."}
          </Typography>
        </Stack>
      ) : (
        <ListingDataView
          data={visible}
          viewMode="cards"
          cardMinWidth={isMobile ? 160 : 240}
          emptyMessage="Nenhum conjunto encontrado."
          renderCard={(collection) => {
            const progress = progressByCollection.get(collection.extId) ?? NO_PROGRESS;
            return (
              <Card
                onClick={() => navigate(contentRoute(gameId, "collection", collection.extId)!)}
                sx={{
                  height: "100%",
                  cursor: "pointer",
                  borderRadius: 1,
                  border: 1,
                  borderColor: isComplete(progress) ? "success.main" : "divider",
                  transition: "all 0.3s",
                  "&:hover": { transform: "translateY(-4px)", borderColor: "primary.main" },
                }}
              >
                <Stack alignItems="center" spacing={1.5} sx={{ p: isMobile ? 2 : 3, textAlign: "center", height: "100%" }}>
                  <ContentIcon mediaId={currentMedia(collection.media, "icon")} kind="collection" alt={collection.name} size={56} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    {collection.name}
                  </Typography>
                  {collection.summary && (
                    <Typography variant="caption" color="text.secondary">
                      {collection.summary}
                    </Typography>
                  )}
                  <Box sx={{ width: "100%", mt: "auto" }}>
                    <CollectionProgress progress={progress} />
                  </Box>
                </Stack>
              </Card>
            );
          }}
        />
      )}
    </StyledContainer>
  );
}
