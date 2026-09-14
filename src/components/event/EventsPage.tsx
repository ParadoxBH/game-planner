import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { CircularProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import { ApiError } from "../../api/ApiError";
import { MAX_PAGE_SIZE, type EventDocument, type ListQuery } from "../../api/content";
import { useContentList } from "../../api/useContent";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";
import { ListingDataView } from "../common/ListingDataView";
import { StyledContainer } from "../common/StyledContainer";
import { ApiEventCard, EVENT_TYPES } from "./ApiEventRenderers";

interface EventCriteria {
  type: string | null;
}

const INITIAL_CRITERIA: EventCriteria = { type: null };
const ALL = "all";

/** Lista de eventos, lida da API, com abas por tipo e os mais recentes primeiro. */
export function EventsPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const { isMobile } = usePlatform();
  const pages = usePagination(INITIAL_CRITERIA);

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { criteria, pagination } = pages.info;

  const query = useMemo<ListQuery>(
    () => ({
      search: search || undefined,
      page: pagination.page - 1,
      size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
      sort: "-periodStart",
      filters: { type: criteria.type ?? undefined },
    }),
    [search, pagination, criteria.type],
  );

  const events = useContentList<EventDocument>(gameId, "events", query);

  useEffect(() => {
    if (events.data) pages.setTotalItems(events.data.total);
  }, [events.data, pages.setTotalItems]);

  return (
    <StyledContainer
      title={`Eventos de ${gameId}`}
      label={isMobile ? undefined : "Central de eventos climáticos, temporadas e atividades especiais."}
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: "Pesquisar eventos..." }}
      pages={pages}
      actionsStart={
        <Tabs
          value={criteria.type ?? ALL}
          onChange={(_, value: string) => pages.setCriteria({ type: value === ALL ? null : value })}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value={ALL} label="Todos" />
          {Object.entries(EVENT_TYPES).map(([type, info]) => (
            <Tab key={type} value={type} label={info.label} />
          ))}
        </Tabs>
      }
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
          viewMode="cards"
          cardMinWidth={isMobile ? 260 : 340}
          emptyMessage="Nenhum evento encontrado com estes filtros."
          renderCard={(event) => <ApiEventCard event={event} gameId={gameId} />}
        />
      )}
    </StyledContainer>
  );
}
