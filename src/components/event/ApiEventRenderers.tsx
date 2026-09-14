import type { ReactElement } from "react";
import { Box, Card, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { AccessTime, Cloud, Star, Terrain, WbSunny } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import type { EventDocument } from "../../api/content";
import { contentRoute, currentMedia, mediaUrl } from "../../api/references";
import { useEventFilter } from "../../context/EventFilterContext";
import { formatDate } from "../../utils/format";
import { ContentIcon } from "../common/ContentIcon";
import { DataChip } from "../common/DataChip";

interface EventTypeInfo {
  label: string;
  color: string;
  icon: ReactElement;
}

/** Tipos conhecidos, na ordem das abas. Tipo fora desta lista aparece só em "Todos". */
export const EVENT_TYPES: Record<string, EventTypeInfo> = {
  clima: { label: "Clima", color: "#4fc3f7", icon: <Cloud /> },
  season: { label: "Temporada", color: "#ffb74d", icon: <WbSunny /> },
  mapa: { label: "Mapa", color: "#81c784", icon: <Terrain /> },
  event: { label: "Evento", color: "#ba68c8", icon: <Star /> },
};

export function eventTypeInfo(type: string): EventTypeInfo {
  return EVENT_TYPES[type] ?? { label: type, color: "#999999", icon: <Star /> };
}

export type EventStatus = "live" | "upcoming" | "ended" | "occasional";

const STATUS: Record<EventStatus, { label: string; color: "success" | "info" | "default" }> = {
  live: { label: "Acontecendo agora", color: "success" },
  upcoming: { label: "Em breve", color: "info" },
  ended: { label: "Encerrado", color: "default" },
  occasional: { label: "Ocasional", color: "default" },
};

function localIsoDate(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

/** Situação pelo período, com as datas inclusivas. Sem datas, o evento é ocasional. */
export function eventStatus(event: EventDocument, today: Date = new Date()): EventStatus {
  if (!event.periodStart && !event.periodEnd) return "occasional";
  const day = localIsoDate(today);
  if (event.periodStart && day < event.periodStart) return "upcoming";
  if (event.periodEnd && day > event.periodEnd) return "ended";
  return "live";
}

export function formatPeriod(event: EventDocument): string {
  if (event.periodStart && event.periodEnd) return `${formatDate(event.periodStart)} — ${formatDate(event.periodEnd)}`;
  if (event.periodStart) return `A partir de ${formatDate(event.periodStart)}`;
  if (event.periodEnd) return `Até ${formatDate(event.periodEnd)}`;
  return "Sem período definido";
}

export function EventTypeChip({ type }: { type: string }) {
  const info = eventTypeInfo(type);
  return (
    <DataChip
      icon={info.icon}
      label={info.label}
      variant="outlined"
      sx={{ color: info.color, borderColor: info.color, "& .MuiChip-icon": { color: "inherit", fontSize: 14 } }}
    />
  );
}

export function EventStatusChip({ event }: { event: EventDocument }) {
  const status = STATUS[eventStatus(event)];
  return <DataChip label={status.label} color={status.color} />;
}

/** Liga ou desliga o evento no filtro de eventos ativos, que esconde das listas o conteúdo de evento desligado. */
export function EventFilterSwitch({ eventId }: { eventId: string }) {
  const { isEventActive, toggleEvent } = useEventFilter();
  return (
    <FormControlLabel
      onClick={(event) => event.stopPropagation()}
      control={<Switch size="small" color="primary" checked={isEventActive(eventId)} onChange={() => toggleEvent(eventId)} />}
      label={
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
          Mostrar nas listas
        </Typography>
      }
    />
  );
}

/** Card da listagem de eventos vindos da API. */
export function ApiEventCard({ event, gameId }: { event: EventDocument; gameId: string }) {
  const navigate = useNavigate();
  const type = eventTypeInfo(event.eventType);
  const bannerId = currentMedia(event.media, "banner");

  return (
    <Card
      onClick={() => navigate(contentRoute(gameId, "event", event.extId)!)}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
        transition: "all 0.3s",
        "&:hover": { transform: "translateY(-4px)", borderColor: type.color },
      }}
    >
      {bannerId && (
        <Box
          sx={{
            height: 140,
            flexShrink: 0,
            backgroundImage: `url(${mediaUrl(bannerId, "thumb")})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <Stack spacing={1.5} sx={{ p: 2, flex: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <ContentIcon mediaId={currentMedia(event.media, "icon")} kind="event" alt={event.name} size={48} />
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {event.name}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              <EventTypeChip type={event.eventType} />
              <EventStatusChip event={event} />
            </Stack>
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {event.summary ?? event.description ?? "Sem descrição."}
        </Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccessTime sx={{ fontSize: 16, color: "secondary.main" }} />
            <Typography variant="caption" fontWeight={700}>
              {formatPeriod(event)}
            </Typography>
          </Stack>
          <EventFilterSwitch eventId={event.extId} />
        </Stack>
      </Stack>
    </Card>
  );
}
