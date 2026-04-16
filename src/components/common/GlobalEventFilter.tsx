import { useState, useEffect } from "react";
import { 
  Box, 
  IconButton, 
  Menu, 
  MenuItem, 
  Checkbox, 
  ListItemText, 
  Typography, 
  Tooltip,
  Badge,
  Divider,
  Button,
  Chip
} from "@mui/material";
import { FilterList, EventAvailable, ClearAll, DoneAll, History } from "@mui/icons-material";
import { useEventFilter } from "../../context/EventFilterContext";
import { useApi } from "../../hooks/useApi";
import { useParams } from "react-router-dom";
import type { GameEvent } from "../../types/gameModels";
import { usePlatform } from "../../hooks/usePlatform";

export function GlobalEventFilter() {
  const { gameId } = useParams<{ gameId: string }>();
  const { 
    activeEventIds, 
    toggleEvent, 
    setAllEvents, 
    clearFilters, 
    initializeNewEvents, 
    restoreDefaults,
    checkEventLive 
  } = useEventFilter();
  const { getEventsList } = useApi(gameId);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const { isMobile } = usePlatform();

  useEffect(() => {
    if (gameId && !events.length) {
      getEventsList().then(evs => {
        setEvents(evs);
        // Smart activation for new events
        initializeNewEvents(evs);
      });
    }
  }, [gameId, getEventsList, events.length, initializeNewEvents]);
  
  // const loading = apiLoading || localLoading;
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const activeCount = activeEventIds.length;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectAll = () => {
    setAllEvents(events.map((e: GameEvent) => e.id));
  };

  const handleRestore = () => {
    restoreDefaults(events);
  };

  const parseDate = (d?: string) => {
    if (!d) return null;
    const [day, month, year] = d.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const getTimeRemaining = (event: GameEvent) => {
    if (!event.period?.end) return null;
    const end = parseDate(event.period.end);
    const start = parseDate(event.period.start);
    if (!end) return null;

    const now = new Date();
    
    // Check if hasn't started yet
    if (start && now < start) {
      const diffStart = start.getTime() - now.getTime();
      const days = Math.floor(diffStart / (1000 * 60 * 60 * 24));
      if (days > 0) return `Começa em ${days}d`;
      return "Começa em breve";
    }

    const diff = end.getTime() - now.getTime();
    if (diff < 0) return "Finalizado";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}d restantes`;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h restantes`;
    
    return "Termina em breve";
  };

  if (!gameId || events.length === 0) return null;

  return (
    <>
      <Tooltip title="Filtro de Eventos Globais">
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ 
            color: activeCount > 0 ? "primary.main" : "white",
            backgroundColor: activeCount > 0 ? "rgba(255, 68, 0, 0.1)" : "transparent",
            border: activeCount > 0 ? "1px solid" : "1px solid transparent",
            borderColor: "primary.main",
            transition: 'all 0.2s'
          }}
        >
          <Badge badgeContent={activeCount} color="primary">
            <FilterList fontSize={isMobile ? "small" : undefined}/>
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 500,
            backgroundColor: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            mt: 1.5,
            '& .MuiMenuItem-root': {
              py: 1,
              px: 2,
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <EventAvailable color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={700}>Filtro de Eventos</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Itens com evento só aparecem se o evento estiver selecionado. Itens sem evento sempre aparecem.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button 
              size="small" 
              startIcon={<DoneAll />} 
              onClick={handleSelectAll}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Todos
            </Button>
            <Button 
              size="small" 
              startIcon={<ClearAll />} 
              onClick={clearFilters}
              color="inherit"
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Limpar
            </Button>
            <Button 
              size="small" 
              startIcon={<History />} 
              onClick={handleRestore}
              color="info"
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Restaurar
            </Button>
          </Stack>
        </Box>
        
        <Divider sx={{ opacity: 0.1 }} />
        
        <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
          {Object.entries(
            events
              .sort((a, b) => {
                // Sort by: 1. isLive, 2. End date (closest first), 3. Name
                const aLive = checkEventLive(a);
                const bLive = checkEventLive(b);
                if (aLive !== bLive) return aLive ? -1 : 1;

                const aEnd = parseDate(a.period?.end)?.getTime() || Infinity;
                const bEnd = parseDate(b.period?.end)?.getTime() || Infinity;
                if (aEnd !== bEnd) return aEnd - bEnd;

                return a.name.localeCompare(b.name);
              })
              .reduce((acc, event) => {
                const type = event.type || "event";
                if (!acc[type]) acc[type] = [];
                acc[type].push(event);
                return acc;
              }, {} as Record<string, GameEvent[]>)
          ).map(([type, groupEvents]) => (
            <Box key={type}>
              <Box sx={{ 
                px: 2, 
                py: 0.5, 
                backgroundColor: "rgba(255,255,255,0.03)", 
                borderY: "1px solid rgba(255,255,255,0.05)" 
              }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: "primary.main", letterSpacing: 1.5 }}>
                  {type}
                </Typography>
              </Box>
              {groupEvents.map((event: GameEvent) => {
                const isLive = checkEventLive(event);
                const timeRemaining = getTimeRemaining(event);
                
                return (
                  <Tooltip 
                    key={event.id} 
                    title={
                      <Box sx={{ p: 1 }}>
                        <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                          {event.name} {isLive ? "(Ao Vivo)" : "(Inativo)"}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                          {event.description}
                        </Typography>
                        {timeRemaining && (
                          <>
                            <Divider sx={{ my: 1, borderColor: "rgba(255,255,255,0.1)" }} />
                            <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 700 }}>
                              Status: {timeRemaining}
                            </Typography>
                          </>
                        )}
                        <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.5 }}>
                          Período: {event.period?.start || "?"} até {event.period?.end || "?"}
                        </Typography>
                      </Box>
                    }
                    placement="right"
                    arrow
                  >
                    <MenuItem onClick={() => toggleEvent(event.id)}>
                      <Checkbox
                        checked={activeEventIds.includes(event.id)}
                        size="small"
                        sx={{ p: 0.5, mr: 1 }}
                      />
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {event.name}
                            <Chip 
                              label={isLive ? "Live" : "Off"} 
                              size="small" 
                              color={isLive ? "success" : "default"}
                              variant="outlined"
                              sx={{ 
                                height: 16, 
                                fontSize: '10px !important', 
                                px: 0, 
                                opacity: isLive ? 1 : 0.5,
                                borderColor: isLive ? 'success.main' : 'rgba(255,255,255,0.2)'
                              }}
                            />
                          </Box>
                        } 
                        primaryTypographyProps={{ 
                          variant: 'body2', 
                          fontWeight: activeEventIds.includes(event.id) ? 700 : 400 
                        }} 
                        secondary={timeRemaining || (event.period?.start ? `${event.period.start} - ${event.period.end || '?'}` : undefined)}
                        secondaryTypographyProps={{ 
                          variant: 'caption', 
                          sx: { 
                            opacity: 0.8, 
                            color: isLive ? 'success.main' : 'text.secondary',
                            fontWeight: isLive ? 600 : 400
                          } 
                        }}
                      />
                    </MenuItem>
                  </Tooltip>
                );
              })}
            </Box>
          ))}
        </Box>
      </Menu>
    </>
  );
}

// Helper component for Stack since MUI Stack might not be imported in some environments
function Stack({ children, direction = "column", spacing = 0, alignItems = "stretch", sx = {} }: any) {
  return (
    <Box 
      sx={{ 
        display: "flex", 
        flexDirection: direction === "column" ? "column" : "row", 
        gap: spacing * 8 + "px",
        alignItems,
        ...sx 
      }}
    >
      {children}
    </Box>
  );
}
