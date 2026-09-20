import { useMemo } from "react";
import { Box, Button, CircularProgress, Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import EditIcon from "@mui/icons-material/Edit";
import type { MapMarker, SpawnPointDocument } from "../../api/content";
import { currentMedia, mediaUrl, ReferenceIndex } from "../../api/references";
import { useContentDetails } from "../../api/useContent";
import { formatChance } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { OutputField } from "../common/OutputField";

const RESPAWN_LABELS: Record<string, string> = { once: "Único", daily: "Diário", weekly: "Semanal" };

export function respawnLabel(mode: string | null, delayMinutes: number | null): string | null {
  if (!mode || mode === "respawn") return delayMinutes ? `${delayMinutes} min` : null;
  return RESPAWN_LABELS[mode] ?? mode;
}

interface MapSpawnPopupProps {
  gameId: string;
  marker: MapMarker;
  isCollected: boolean;
  onToggleCollected: () => void;
  onExpand: (type: "entity" | "item", id: string) => void;
  /** Edição do ponto; sem isto (quem não edita o jogo), o botão não aparece. */
  onEdit?: () => void;
}

/** Conteúdo do popup de um ponto: ocupantes, respawn e, carregados ao abrir, screenshot e drops do ponto. */
export function MapSpawnPopup({ gameId, marker, isCollected, onToggleCollected, onExpand, onEdit }: MapSpawnPopupProps) {
  const details = useContentDetails<SpawnPointDocument, unknown>(gameId, "spawn-points", marker.extId);
  const references = useMemo(() => new ReferenceIndex(details.data?.references), [details.data]);
  const point = details.data?.document;
  const screenshot = point ? currentMedia(point.media, "screenshot") : null;
  const respawn = respawnLabel(marker.respawnMode, marker.respawnDelayMinutes);

  return (
    <Box sx={{ minWidth: 240, maxWidth: 300 }}>
      <Stack spacing={1.5}>
        {onEdit && (
          <Button size="small" startIcon={<EditIcon />} onClick={onEdit} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
            Editar ponto
          </Button>
        )}
        {marker.name && (
          <Typography variant="subtitle2" fontWeight={800}>
            {marker.name}
          </Typography>
        )}

        <Stack spacing={1}>
          {marker.occupants.map((occupant, index) => (
            <Stack key={index} direction="row" spacing={1.5} alignItems="center">
              <ContentChip
                target={{ kind: occupant.kind, extId: occupant.extId }}
                resolved={{
                  kind: occupant.kind,
                  extId: occupant.extId,
                  resolvedKind: occupant.name ? occupant.kind ?? "entity" : null,
                  name: occupant.name,
                  iconMediaId: occupant.iconMediaId,
                }}
                size="medium"
              />
              <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {occupant.name ?? occupant.extId}
                </Typography>
                {occupant.chance !== null && (
                  <Typography variant="caption" color="text.secondary">
                    {formatChance(occupant.chance)}
                  </Typography>
                )}
              </Stack>
              {occupant.kind !== "category" && (
                <Tooltip title="Ver resumo">
                  <IconButton size="small" onClick={() => onExpand(occupant.kind === "item" ? "item" : "entity", occupant.extId)}>
                    <OpenInFullIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          ))}
        </Stack>

        <Divider />

        {screenshot && (
          <Box component="img" src={mediaUrl(screenshot, "thumb")} alt="Local" sx={{ width: "100%", borderRadius: 1, display: "block" }} />
        )}
        {point?.summary && <Typography variant="caption">{point.summary}</Typography>}
        {respawn && <OutputField label="Respawn" values={[respawn]} />}
        {details.isPending && <CircularProgress size={16} />}

        {point && point.drops.length > 0 && (
          <Stack spacing={0.5}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Drops do ponto
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {point.drops.map((drop, index) => (
                <ContentChip
                  key={index}
                  target={drop.target}
                  resolved={references.find(drop.target)}
                  amount={drop.amount}
                  maxAmount={drop.maxAmount}
                  chance={drop.chance}
                  size="small"
                />
              ))}
            </Stack>
          </Stack>
        )}

        <Button
          variant={isCollected ? "outlined" : "contained"}
          color={isCollected ? "secondary" : "success"}
          size="small"
          fullWidth
          onClick={onToggleCollected}
        >
          {isCollected ? "Desmarcar coletado" : "Marcar como coletado"}
        </Button>
      </Stack>
    </Box>
  );
}
