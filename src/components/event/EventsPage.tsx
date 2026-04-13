import { 
  Box, 
  Typography, 
  Grid, 
  Stack,
  Tabs,
  Tab,
  CircularProgress
} from "@mui/material";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { StyledContainer } from "../common/StyledContainer";
import { EventCard } from "./EventCard";
import type { GameEvent } from "../../types/gameModels";
import { eventRepository } from "../../repositories/EventRepository";

export function EventsPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { loading: dbLoading, error } = useApi(gameId);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    eventRepository.getAll().then(allEvents => {
      if (!isMounted) return;
      setEvents(allEvents);
      setDataLoading(false);
    }).catch(err => {
      console.error("Error fetching events:", err);
      if (isMounted) setDataLoading(false);
    });

    return () => { isMounted = false; };
  }, [dbLoading]);

  if (dbLoading || dataLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h6">Erro ao carregar eventos: {error}</Typography>
      </Box>
    );
  }

  const filteredEvents = events?.filter(event => {
    if (tabValue === 0) return true;
    const types = ["all", "clima", "season", "mapa", "event"];
    return event.type === (types[tabValue] as any);
  }) || [];

  return (
    <StyledContainer
      title={`Eventos de ${gameId}`}
      label="Central de eventos climáticos, temporadas e atividades especiais."
      actionsStart={
        <Tabs 
          value={tabValue} 
          onChange={(_, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': { 
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              minWidth: 100,
              minHeight: 48,
              color: 'text.secondary',
              '&.Mui-selected': { color: 'secondary.main' }
            },
            '& .MuiTabs-indicator': { backgroundColor: 'secondary.main', height: 3, borderRadius: '3px 3px 0 0' }
          }}
        >
          <Tab label="Todos" />
          <Tab label="Clima" />
          <Tab label="Temporadas" />
          <Tab label="Mapa" />
          <Tab label="Eventos" />
        </Tabs>
      }
    >
      <Grid container spacing={3}>
        {filteredEvents.map((event) => (
          <Grid size={{ xs: 12, md: 6 }} key={event.id}>
            <EventCard event={event} />
          </Grid>
        ))}
      </Grid>

      {filteredEvents.length === 0 && (
        <Stack sx={{ flex: 1, textAlign: 'center', py: 8, alignItems: "center", justifyContent: "center" }}>
          <Typography variant="h6" color="text.secondary">
            Nenhum evento desta categoria encontrado.
          </Typography>
        </Stack>
      )}
    </StyledContainer>
  );
}
