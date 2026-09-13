import { Box } from "@mui/material";

const SIZES = {
  small: { box: 16, fontSize: "0.6rem", offset: -4 },
  large: { box: 28, fontSize: "0.95rem", offset: -10 },
};

interface LevelBadgeProps {
  level?: number | null;
  size?: keyof typeof SIZES;
}

/** Nível no canto do ícone. O pai precisa de position relative. */
export function LevelBadge({ level, size = "small" }: LevelBadgeProps) {
  if (!level || level <= 0) return null;
  const config = SIZES[size];
  return (
    <Box
      sx={{
        position: "absolute",
        top: config.offset,
        left: config.offset,
        minWidth: config.box,
        height: config.box,
        px: 0.5,
        borderRadius: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "warning.main",
        color: "warning.contrastText",
        fontSize: config.fontSize,
        fontWeight: 800,
        zIndex: 2,
      }}
    >
      {level}
    </Box>
  );
}
