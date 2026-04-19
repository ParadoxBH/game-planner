import { Box, Typography, Paper, Stack, Collapse } from "@mui/material";
import { useState } from "react";
import { getPublicUrl } from "../../utils/pathUtils";
import { OutputField } from "../common/OutputField";
import type { MapMetadata } from "../../types/gameModels";
import { theme } from "../../theme/theme";

interface MapInfoOverlayProps {
  gameName?: string;
  coords: [number, number];
  region?: string;
  maps: MapMetadata[];
  selectedMapId: string;
  onSelectMap: (id: string) => void;
}

export const MapInfoOverlay = ({
  gameName,
  coords,
  region = "Desconhecido",
  maps,
  selectedMapId,
  onSelectMap,
}: MapInfoOverlayProps) => {
  const [expanded, setExpanded] = useState(false);
  const currentMap = maps.find(m => m.id === selectedMapId);

  return (
    <Paper
      elevation={0}
      sx={{
        position: "absolute",
        bottom: 12,
        left: 12,
        zIndex: 1000,
        backgroundColor: theme.designTokens.colors.glassBg,
        backdropFilter: theme.designTokens.colors.glassFilter,
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        width: "400px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Stack m={2.5} spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack alignItems={"start"}>
            <Typography variant="subtitle2" sx={{ color: "designTokens.colors.fieldLabel", fontSize: "0.65rem" }}>
              Explorando
            </Typography>
            <Typography variant="h6" sx={{ letterSpacing: "-0.5px" }}>
              {currentMap?.name || gameName}
            </Typography>
          </Stack>
          <Box
            onClick={() => setExpanded(!expanded)}
            sx={{
              width: 56,
              height: 56,
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              overflow: "hidden",
              cursor: "pointer",
              position: "relative",
              transition: "transform 0.2s",
              "&:hover": { transform: "scale(1.05)" },
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            <img src={getPublicUrl(currentMap?.thumbnail || "https://placehold.co/100x100/333/fff?text=Map")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <Stack sx={{ position: "absolute", bottom: 0, width: "100%", bgcolor: "rgba(0,0,0,0.6)", textAlign: "center" }}>
              <Typography variant="caption" sx={{ fontSize: "9px", fontWeight: 800 }}>MAPAS</Typography>
            </Stack>
          </Box>
        </Stack>
        <Collapse in={expanded}>
          <Stack spacing={1} sx={{ mt: 1, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: "designTokens.colors.fieldLabel", mb: 1, display: "block", fontSize: "0.65rem" }}>SELECIONAR MAPA</Typography>
            <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
              {maps.map((map) => (
                <Box
                  key={map.id}
                  onClick={() => { onSelectMap(map.id); setExpanded(false); }}
                  sx={{
                    minWidth: 80, height: 80, borderRadius: 1,
                    border: selectedMapId === map.id ? 2 : 1,
                    borderColor: selectedMapId === map.id ? "primary.main" : "divider",
                    overflow: "hidden", cursor: "pointer", position: "relative",
                    opacity: selectedMapId === map.id ? 1 : 0.7, transition: "all 0.2s",
                    "&:hover": { opacity: 1, borderColor: "rgba(255,255,255,0.5)" },
                  }}
                >
                  <img src={getPublicUrl(map.thumbnail || "https://placehold.co/100x100/333/fff?text=Map")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <Typography variant="caption" sx={{ position: "absolute", bottom: 0, width: "100%", bgcolor: "rgba(0,0,0,0.7)", fontSize: "10px", textAlign: "center", p: 0.5 }}>{map.name}</Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Collapse>
        <Stack direction={"row"} spacing={1.5}>
          <OutputField label="Região" values={[region]} flex={1} />
          <OutputField label="Coordenadas" values={[`X: ${coords[1].toFixed(1)}`, `Y: ${coords[0].toFixed(1)}`]} flex={1.5} />
        </Stack>
      </Stack>
    </Paper>
  );
};
