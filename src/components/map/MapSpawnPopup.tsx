import { useMemo } from "react";
import { Box, Button, CircularProgress, Divider, Paper, Stack, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import type { MapMarker, MarkerOccupant, SpawnPointDocument } from "../../api/content";
import { currentMedia, mediaUrl, ReferenceIndex } from "../../api/references";
import { useContentDetails } from "../../api/useContent";
import { formatChance } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { ContentIcon } from "../common/ContentIcon";
import { LevelBadge } from "../common/LevelBadge";
import { OutputField } from "../common/OutputField";
import { SpawnConditionList } from "./SpawnConditions";

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

/** Ocupante compacto: ícone com a chance embaixo; o resto fica no tooltip e o clique abre o resumo. */
function OccupantTile({ occupant, onExpand }: { occupant: MarkerOccupant; onExpand: MapSpawnPopupProps["onExpand"] }) {
  const name = occupant.name ?? occupant.extId;
  const expandable = occupant.kind !== "category";
  const tooltip = (
    <Stack spacing={0.25}>
      <Typography variant="body2" fontWeight={700}>
        {name}
      </Typography>
      {occupant.chance !== null && <Typography variant="caption">Chance: {formatChance(occupant.chance)}</Typography>}
      {occupant.level !== null && <Typography variant="caption">Nível {occupant.level}</Typography>}
      {occupant.respawnDelayMinutes !== null && <Typography variant="caption">Respawn: {occupant.respawnDelayMinutes} min</Typography>}
      {expandable && (
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Clique para ver o resumo
        </Typography>
      )}
    </Stack>
  );

  return (
    <Tooltip title={tooltip} arrow>
      <Stack
        alignItems="center"
        spacing={0.25}
        onClick={expandable ? () => onExpand(occupant.kind === "item" ? "item" : "entity", occupant.extId) : undefined}
        sx={{ width: 48, cursor: expandable ? "pointer" : "default" }}
      >
        <Box sx={{ position: "relative", width: 40, height: 40 }}>
          <Paper
            variant="outlined"
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 1,
              overflow: "hidden",
              transition: "transform 0.2s",
              "&:hover": expandable ? { transform: "scale(1.08)", borderColor: "primary.main" } : undefined,
            }}
          >
            <ContentIcon mediaId={occupant.iconMediaId} kind={occupant.kind ?? "entity"} alt={name} size={28} />
          </Paper>
          <LevelBadge level={occupant.level} />
        </Box>
        {occupant.chance !== null && (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, fontWeight: 600 }}>
            {formatChance(occupant.chance)}
          </Typography>
        )}
      </Stack>
    </Tooltip>
  );
}

/** Conteúdo do popup de um ponto: screenshot, ocupantes, respawn e, carregados ao abrir, drops do ponto. */
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
        {screenshot && (
          <Box component="img" src={mediaUrl(screenshot, "thumb")} alt="Local" sx={{ width: "100%", borderRadius: 1, display: "block" }} />
        )}
        {marker.name && (
          <Typography variant="subtitle2" fontWeight={800}>
            {marker.name}
          </Typography>
        )}

        {marker.occupants.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {marker.occupants.map((occupant, index) => (
              <OccupantTile key={index} occupant={occupant} onExpand={onExpand} />
            ))}
          </Stack>
        )}

        <Divider />

        {point?.summary && <Typography variant="caption">{point.summary}</Typography>}
        {point && point.conditions.length > 0 && <SpawnConditionList conditions={point.conditions} />}
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
