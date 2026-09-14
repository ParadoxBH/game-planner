import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { ClearAll, DoneAll, EventAvailable, FilterList, History } from "@mui/icons-material";
import { MAX_PAGE_SIZE, type EventDocument } from "../../api/content";
import { useContentList } from "../../api/useContent";
import { useEventFilter } from "../../context/EventFilterContext";
import { usePlatform } from "../../hooks/usePlatform";
import { eventTypeInfo, formatPeriod } from "../event/ApiEventRenderers";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Quanto falta para começar ou terminar; nulo para evento sem data de fim. */
function timeRemaining(event: EventDocument, now: Date = new Date()): string | null {
  if (!event.periodEnd) return null;
  const start = event.periodStart ? new Date(`${event.periodStart}T00:00:00`) : null;
  const end = new Date(`${event.periodEnd}T23:59:59`);

  if (start && now < start) {
    const days = Math.floor((start.getTime() - now.getTime()) / DAY);
    return days > 0 ? `Começa em ${days}d` : "Começa em breve";
  }

  const diff = end.getTime() - now.getTime();
  if (diff < 0) return "Finalizado";
  const days = Math.floor(diff / DAY);
  if (days > 0) return `${days}d restantes`;
  const hours = Math.floor(diff / HOUR);
  if (hours > 0) return `${hours}h restantes`;
  return "Termina em breve";
}

/** Filtro de eventos do cabeçalho, com os eventos lidos da API. */
export function GlobalEventFilter() {
  const { gameId } = useParams<{ gameId: string }>();
  const { activeEventIds, toggleEvent, setAllEvents, clearFilters, initializeNewEvents, restoreDefaults, checkEventLive } =
    useEventFilter();
  const { isMobile } = usePlatform();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const initializedFor = useRef<string | null>(null);

  const events = useContentList<EventDocument>(gameId, "events", { size: MAX_PAGE_SIZE, sort: "-periodStart" });
  const list = events.data?.content;

  // Liga ou desliga os eventos novos pelo período, uma vez por jogo aberto.
  useEffect(() => {
    if (!gameId || !list || initializedFor.current === gameId) return;
    initializedFor.current = gameId;
    initializeNewEvents(list);
  }, [gameId, list, initializeNewEvents]);

  if (!gameId || !list || list.length === 0) return null;

  const activeCount = activeEventIds.length;

  // Os que estão acontecendo primeiro, depois o fim mais próximo e o nome; agrupados por tipo.
  const sorted = [...list].sort((a, b) => {
    const aLive = checkEventLive(a);
    const bLive = checkEventLive(b);
    if (aLive !== bLive) return aLive ? -1 : 1;
    const aEnd = a.periodEnd ?? "9999-12-31";
    const bEnd = b.periodEnd ?? "9999-12-31";
    if (aEnd !== bEnd) return aEnd < bEnd ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const groups = new Map<string, EventDocument[]>();
  sorted.forEach((event) => groups.set(event.eventType, [...(groups.get(event.eventType) ?? []), event]));

  return (
    <>
      <Tooltip title="Filtro de eventos globais">
        <IconButton
          onClick={(event) => setAnchorEl(event.currentTarget)}
          size="small"
          sx={{
            color: activeCount > 0 ? "primary.main" : "white",
            backgroundColor: activeCount > 0 ? "rgba(255, 68, 0, 0.1)" : "transparent",
            border: activeCount > 0 ? "1px solid" : "1px solid transparent",
            borderColor: "primary.main",
            transition: "all 0.2s",
          }}
        >
          <Badge badgeContent={activeCount} color="primary">
            <FilterList fontSize={isMobile ? "small" : undefined} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            width: 320,
            backgroundColor: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            mt: 1.5,
            "& .MuiMenuItem-root": { py: 1, px: 2 },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Stack sx={{ overflow: "hidden", maxHeight: 500 }}>
          <Box sx={{ px: 2, py: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <EventAvailable color="primary" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>
                Filtro de eventos
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Conteúdo de evento só aparece se o evento estiver selecionado. Conteúdo sem evento sempre aparece.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<DoneAll />}
                onClick={() => setAllEvents(list.map((event) => event.extId))}
                sx={{ textTransform: "none", fontSize: "0.75rem" }}
              >
                Todos
              </Button>
              <Button size="small" startIcon={<ClearAll />} onClick={clearFilters} color="inherit" sx={{ textTransform: "none", fontSize: "0.75rem" }}>
                Limpar
              </Button>
              <Button
                size="small"
                startIcon={<History />}
                onClick={() => restoreDefaults(list)}
                color="info"
                sx={{ textTransform: "none", fontSize: "0.75rem" }}
              >
                Restaurar
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ opacity: 0.1 }} />

          <Box sx={{ maxHeight: 350, overflow: "auto" }}>
            {[...groups.entries()].map(([type, groupEvents]) => (
              <Box key={type}>
                <Box sx={{ px: 2, py: 0.5, backgroundColor: "rgba(255,255,255,0.03)", borderY: "1px solid rgba(255,255,255,0.05)" }}>
                  <Typography variant="overline" sx={{ fontWeight: 800, color: "primary.main", letterSpacing: 1.5 }}>
                    {eventTypeInfo(type).label}
                  </Typography>
                </Box>
                {groupEvents.map((event) => {
                  const isLive = checkEventLive(event);
                  const remaining = timeRemaining(event);
                  const selected = activeEventIds.includes(event.extId);

                  return (
                    <Tooltip
                      key={event.extId}
                      placement="right"
                      arrow
                      title={
                        <Box sx={{ p: 1 }}>
                          <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5 }}>
                            {event.name} {isLive ? "(acontecendo)" : "(fora do período)"}
                          </Typography>
                          {(event.summary || event.description) && (
                            <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                              {event.summary ?? event.description}
                            </Typography>
                          )}
                          {remaining && (
                            <>
                              <Divider sx={{ my: 1, borderColor: "rgba(255,255,255,0.1)" }} />
                              <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 700 }}>
                                Status: {remaining}
                              </Typography>
                            </>
                          )}
                          <Typography variant="caption" color="primary.main" sx={{ display: "block", mt: 0.5 }}>
                            {formatPeriod(event)}
                          </Typography>
                        </Box>
                      }
                    >
                      <MenuItem onClick={() => toggleEvent(event.extId)}>
                        <Checkbox checked={selected} size="small" sx={{ p: 0.5, mr: 1 }} />
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              {event.name}
                              <Chip
                                label={isLive ? "Live" : "Off"}
                                size="small"
                                color={isLive ? "success" : "default"}
                                variant="outlined"
                                sx={{
                                  height: 16,
                                  fontSize: "10px !important",
                                  px: 0,
                                  opacity: isLive ? 1 : 0.5,
                                  borderColor: isLive ? "success.main" : "rgba(255,255,255,0.2)",
                                }}
                              />
                            </Box>
                          }
                          primaryTypographyProps={{ variant: "body2", fontWeight: selected ? 700 : 400 }}
                          secondary={remaining ?? formatPeriod(event)}
                          secondaryTypographyProps={{
                            variant: "caption",
                            sx: { opacity: 0.8, color: isLive ? "success.main" : "text.secondary", fontWeight: isLive ? 600 : 400 },
                          }}
                        />
                      </MenuItem>
                    </Tooltip>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Stack>
      </Menu>
    </>
  );
}
