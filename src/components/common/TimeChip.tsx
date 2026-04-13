import { Stack, Typography, Box, Tooltip } from "@mui/material";
import { AccessTime } from "@mui/icons-material";

interface TimeChipProps {
  seconds: number;
  label?: string;
  size?: "small" | "medium";
  showIcon?: boolean;
}

export function TimeChip({ 
  seconds, 
  label, 
  size = "small", 
  showIcon = true 
}: TimeChipProps) {
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "-";
    if (totalSeconds < 60) return `${totalSeconds}s`;
    
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    
    if (totalSeconds < 3600) {
      return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ""}`;
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const remainingMinutes = minutes % 60;
    
    if (totalSeconds < 86400) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`;
    }

    const days = Math.floor(totalSeconds / 86400);
    const remainingHours = hours % 24;

    return `${days}d${remainingHours > 0 ? ` ${remainingHours}h` : ""}`;
  };

  const timeStr = formatTime(seconds);

  if (seconds <= 0) return null;

  return (
    <Tooltip title={label || "Tempo de produção"}>
      <Box
        sx={{
          display: "inline-flex",
          px: size === "small" ? 1 : 1.5,
          py: size === "small" ? 0.25 : 0.5,
          borderRadius: 1,
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="center">
          {showIcon && (
            <AccessTime 
              sx={{ 
                fontSize: size === "small" ? 14 : 18, 
                opacity: 0.7,
                color: "primary.main" 
              }} 
            />
          )}
          <Typography 
            variant={size === "small" ? "caption" : "body2"} 
            fontWeight={700}
            sx={{ whiteSpace: "nowrap" }}
          >
            {timeStr}
          </Typography>
        </Stack>
      </Box>
    </Tooltip>
  );
}
