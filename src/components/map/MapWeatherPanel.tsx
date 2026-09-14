import { Paper, Stack, IconButton, Tooltip, Box, Typography, Fade } from "@mui/material";
import { useState } from "react";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import CloseIcon from "@mui/icons-material/Close";
import type { EventDocument } from "../../api/content";
import { currentMedia } from "../../api/references";
import { usePlatform } from "../../hooks/usePlatform";
import { ContentIcon } from "../common/ContentIcon";

interface MapWeatherPanelProps {
  availableWeathers: EventDocument[];
  activeWeatherIds: string[];
  onToggleWeather: (id: string) => void;
  onClearWeathers: () => void;
}

/** Climas do mapa: cada um é um evento que liga ou desliga no filtro de eventos ativos. */
export const MapWeatherPanel = ({ availableWeathers, activeWeatherIds, onToggleWeather, onClearWeathers }: MapWeatherPanelProps) => {
  const { isMobile } = usePlatform();
  const [isExpanded, setIsExpanded] = useState(false);

  if (availableWeathers.length === 0) return null;

  const isClear = activeWeatherIds.length === 0;

  if (isMobile && !isExpanded) {
    const activeWeather = availableWeathers.find((weather) => activeWeatherIds.includes(weather.extId));
    return (
      <Paper
        elevation={4}
        sx={{
          backgroundColor: "designTokens.colors.glassBg",
          backdropFilter: "blur(16px)",
          borderRadius: "50%",
          border: 1,
          borderColor: "divider",
          p: 0.5,
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconButton onClick={() => setIsExpanded(true)} sx={{ width: 40, height: 40 }}>
          {isClear || !activeWeather ? (
            <WbSunnyIcon sx={{ color: "primary.main" }} />
          ) : (
            <ContentIcon mediaId={currentMedia(activeWeather.media, "icon")} kind="event" alt={activeWeather.name} size={24} />
          )}
        </IconButton>
      </Paper>
    );
  }

  return (
    <Fade in={true}>
      <Paper
        elevation={4}
        sx={{
          backgroundColor: "designTokens.colors.glassBg",
          backdropFilter: "blur(16px)",
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          p: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          position: "relative",
        }}
      >
        <Stack direction={"row"} justifyContent={isMobile ? "space-between" : "center"} alignItems="center">
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.65rem",
              fontWeight: 800,
              textTransform: "uppercase",
              opacity: 0.7,
              ml: 0.5,
              color: "primary.main",
              letterSpacing: 1,
              textAlign: "center",
            }}
          >
            Climas
          </Typography>
          {isMobile && (
            <IconButton size="small" onClick={() => setIsExpanded(false)} sx={{ p: 0 }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Limpar climas">
            <IconButton
              onClick={onClearWeathers}
              size="small"
              sx={{
                width: 34,
                height: 34,
                position: "relative",
                bgcolor: isClear ? "rgba(255, 255, 255, 0.15)" : "transparent",
                border: 1,
                borderColor: isClear ? "primary.main" : "transparent",
                borderRadius: 1.5,
                transition: "all 0.2s",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)", transform: "translateY(-1px)" },
              }}
            >
              <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: isClear ? 1 : 0.6 }}>
                ☀️
              </Box>
            </IconButton>
          </Tooltip>
          {availableWeathers.map((weather) => {
            const isActive = activeWeatherIds.includes(weather.extId);
            return (
              <Tooltip key={weather.extId} title={weather.name}>
                <IconButton
                  onClick={() => onToggleWeather(weather.extId)}
                  size="small"
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: isActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
                    border: 1,
                    borderColor: isActive ? "primary.main" : "transparent",
                    borderRadius: 1.5,
                    transition: "all 0.2s",
                    opacity: isActive ? 1 : 0.6,
                    filter: isActive ? "none" : "grayscale(50%)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)", transform: "translateY(-1px)" },
                  }}
                >
                  <ContentIcon mediaId={currentMedia(weather.media, "icon")} kind="event" alt={weather.name} size={20} />
                </IconButton>
              </Tooltip>
            );
          })}
        </Stack>
      </Paper>
    </Fade>
  );
};
