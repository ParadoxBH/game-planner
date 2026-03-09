import { Box, Typography, Button, Stack, Divider, useTheme } from "@mui/material";
import { DataCard } from "./common/DataCard";
import { OutputField } from "./common/OutputField";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import InventoryIcon from "@mui/icons-material/Inventory";

interface SimplifiedEntityProps {
  entity: {
    id: string;
    name: string;
    category: string;
    icon?: string;
  };
  position: [number, number];
  mode?: "once" | "respawn";
  respawnDelay?: number;
  onExpand: () => void;
}

export const SimplifiedEntity = ({
  entity,
  position,
  mode,
  respawnDelay,
  onExpand,
}: SimplifiedEntityProps) => {
  const theme = useTheme();

  return (
    <Box sx={{ minWidth: 220 }}>
      <Stack spacing={theme.designTokens.spacing.itemGap}>
        {/* Header with Icon */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <DataCard
            sx={{
              width: 42,
              height: 42,
              p: 0,
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {entity.icon ? (
              <img
                src={entity.icon}
                alt={entity.name}
                style={{ width: "85%", height: "85%", objectFit: "contain" }}
              />
            ) : (
              <InventoryIcon sx={{ fontSize: 24, color: "text.disabled" }} />
            )}
          </DataCard>
          <Stack spacing={0.25} alignItems="start">
            <Typography
              variant="subtitle2"
              sx={{ color: "primary.main", lineHeight: 1.2, textTransform: "none", fontSize: "0.875rem" }}
            >
              {entity.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
              }}
            >
              {entity.category}
            </Typography>
          </Stack>
        </Stack>

        <Divider />

        {/* Details Section */}
        <OutputField 
          label="Coordenadas" 
          values={[`X: ${position[1].toFixed(1)}`, `Y: ${position[0].toFixed(1)}`]}
        />

        {mode === "respawn" && respawnDelay && (
          <OutputField 
            label="Respawn" 
            values={[`${respawnDelay} min`]}
          />
        )}

        <Button
          variant="contained"
          size="small"
          fullWidth
          startIcon={<OpenInFullIcon sx={{ fontSize: "14px !important" }} />}
          onClick={onExpand}
          sx={{
            mt: 0.5,
            fontSize: "0.75rem",
            py: 0.6,
          }}
        >
          Ver Detalhes Completos
        </Button>
      </Stack>
    </Box>
  );
};
