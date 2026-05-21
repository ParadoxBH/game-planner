import { Box, Typography, Button, Stack, Divider, useTheme } from "@mui/material";
import { DataCard } from "../common/DataCard";
import { OutputField } from "../common/OutputField";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import InventoryIcon from "@mui/icons-material/Inventory";
import { ItemChip } from "../common/ItemChip";

import type { Entity, ReferencePointsRespawnMode, EntityDrop } from "../../types/gameModels";
import { getPublicUrl } from "../../utils/pathUtils";
import { isDev } from "../../utils/mapper";

interface SimplifiedEntityProps {
  entity: Entity;
  position: [number, number];
  mode?: ReferencePointsRespawnMode;
  respawnDelay?: number;
  isCollected?: boolean;
  onToggleCollected?: () => void;
  onExpand: (id?: string) => void;
  entities?: Entity[];
  categoriesMap?: Record<string, string>;
  pointImage?: string;
  customDrops?: EntityDrop[];
}

export const SimplifiedEntity = ({
  entity,
  position,
  mode,
  respawnDelay,
  isCollected,
  onToggleCollected,
  onExpand,
  categoriesMap = {},
  pointImage,
  customDrops,
  entities,
}: SimplifiedEntityProps) => {
  const theme = useTheme() as any;

  return (
    <Box sx={{ minWidth: 220 }}>
      <Stack spacing={theme.designTokens.spacing.itemGap}>
        {/* Header with Icon */}
        <Stack spacing={1}>
          {(entities && entities.length > 0 ? entities : [entity]).map((ent, idx) => (
            <Stack key={idx} direction="row" spacing={1.5} alignItems="center">
              <DataCard
                sx={{
                  width: 42,
                  height: 42,
                  p: 0,
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {ent.icon ? (
                  <img
                    src={getPublicUrl(ent.icon)}
                    alt={ent.name}
                    style={{ width: "85%", height: "85%", objectFit: "contain" }}
                  />
                ) : (
                  <InventoryIcon sx={{ fontSize: 24, color: "text.disabled" }} />
                )}
              </DataCard>
              <Stack spacing={0.25} alignItems="start" sx={{ flexGrow: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "primary.main", lineHeight: 1.2, textTransform: "none", fontSize: "0.875rem" }}
                >
                  {ent.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    display: "block",
                    fontSize: "0.65rem",
                    fontWeight: 600
                  }}
                >
                  {(Array.isArray(ent.category) ? ent.category : [ent.category])
                    .map((cat) => !!cat && cat in categoriesMap ? categoriesMap[cat] : `#${cat}`)
                    .join(" ")}
                </Typography>
              </Stack>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onExpand(ent.id)}
                sx={{ minWidth: "auto", p: 0.5, borderRadius: 1 }}
              >
                <OpenInFullIcon sx={{ fontSize: "16px !important" }} />
              </Button>
            </Stack>
          ))}
        </Stack>

        <Divider />

        {pointImage && (
          <Box sx={{ mt: 1, mb: 1, borderRadius: 1, overflow: 'hidden' }}>
            <img src={getPublicUrl(pointImage)} alt="Local" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </Box>
        )}

        {/* Details Section */}
        {isDev() && <OutputField 
          label="Coordenadas" 
          values={[`X: ${position[1].toFixed(1)}`, `Y: ${position[0].toFixed(1)}`]}
        />}

        {mode === "respawn" && respawnDelay && (
          <OutputField 
            label="Respawn" 
            values={[`${respawnDelay} min`]}
          />
        )}
        {mode === "daily" && (
          <OutputField 
            label="Respawn" 
            values={["Diário"]}
          />
        )}
        {mode === "weekly" && (
          <OutputField 
            label="Respawn" 
            values={["Semanal"]}
          />
        )}

        {customDrops && customDrops.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block", mb: 0.5 }}>
              Drops Especiais
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {customDrops.map((drop, idx) => (
                <ItemChip key={idx} id={drop.itemId} amount={drop.quant} size="small" />
              ))}
            </Stack>
          </Box>
        )}

        {onToggleCollected && (
          <Button
            variant={isCollected ? "outlined" : "contained"}
            color={isCollected ? "secondary" : "success"}
            size="small"
            fullWidth
            onClick={onToggleCollected}
            sx={{
              mt: 0.5,
              fontSize: "0.75rem",
              py: 0.6,
            }}
          >
            {isCollected ? "Desmarcar Coletado" : "Marcar como Coletado"}
          </Button>
        )}

        {/* Detalhar was moved next to each entity */}
      </Stack>
    </Box>
  );
};
