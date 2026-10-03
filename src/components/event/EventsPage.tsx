import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type EventDocument } from "../../api/content";
import { contentRoute } from "../../api/references";
import { useListing, useListingFilters } from "../../api/useContent";
import type { FilterValues } from "../../api/query";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useGameAdmin, useGameEditor } from "../../hooks/useGameAdmin";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { useViewMode } from "../../hooks/useViewMode";
import { ListingDataView } from "../common/ListingDataView";
import { QueryBuilder } from "../common/QueryBuilder";
import { StyledContainer } from "../common/StyledContainer";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { ApiEventCard, type EventActions } from "./ApiEventRenderers";
import { EventFormDialog } from "./EventFormDialog";

const NO_FILTERS: FilterValues = {};

/**
 * Lista de eventos, lida da API, os mais recentes primeiro. A busca e o tipo ficam no QueryBuilder e vêm do
 * backend (GET /events/query/filters), com os tipos que o jogo usa.
 */
export function EventsPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { isMobile } = usePlatform();
  const pages = usePagination(NO_FILTERS);
  const [viewMode, setViewMode] = useViewMode("events");

  const { canEdit } = useGameEditor(gameId);
  const { isAdmin } = useGameAdmin(gameId);

  // undefined: fechado; null: criando; EventDocument: editando
  const [editing, setEditing] = useState<EventDocument | null | undefined>(undefined);

  const actions: EventActions | undefined = canEdit
    ? {
        onEdit: (event) => setEditing(event),
        onDelete: isAdmin ? (event) => setEditing(event) : undefined,
      }
    : undefined;

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { criteria, pagination } = pages.info;

  const listing = useListingFilters(gameId, "events");
  const events = useListing<EventDocument>(gameId, "events", {
    search,
    values: criteria,
    page: pagination.page - 1,
    size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
    sort: "-periodStart",
  });

  useEffect(() => {
    if (events.data) pages.setTotalItems(events.data.total);
  }, [events.data, pages.setTotalItems]);

  return (
    <StyledContainer
      title={`Eventos de ${gameId}`}
      label={isMobile ? undefined : "Central de eventos climáticos, temporadas e atividades especiais."}
      searchEnd={
        <>
          <Stack flex={1} direction="row" justifyContent={isMobile ? "space-between" : "end"} alignItems="center" spacing={1}>
            {canEdit && (
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={() => setEditing(null)}
                sx={{ textTransform: "none", whiteSpace: "nowrap" }}
              >
                Novo evento
              </Button>
            )}
            <ViewModeSelector mode={viewMode} onChange={setViewMode} />
          </Stack>
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
      {events.isPending ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : events.isError ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar os eventos.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {events.error instanceof ApiError ? events.error.message : "Erro inesperado."}
          </Typography>
        </Stack>
      ) : (
        <ListingDataView
          data={events.data.content}
          viewMode={viewMode}
          cardMinWidth={isMobile ? 260 : 340}
          emptyMessage="Nenhum evento encontrado com estes filtros."
          renderCard={(event) => <ApiEventCard event={event} gameId={gameId} actions={actions} />}
        />
      )}

      {editing !== undefined && (
        <EventFormDialog
          gameId={gameId}
          event={editing}
          canDelete={isAdmin}
          onClose={() => setEditing(undefined)}
          onSaved={(extId) => {
            setEditing(undefined);
            const route = contentRoute(gameId, "event", extId);
            if (route) navigate(route);
          }}
        />
      )}
    </StyledContainer>
  );
}
