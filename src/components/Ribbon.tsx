import { Box, Typography } from "@mui/material";
import { theme } from "../theme/theme";
import { usePlatform } from "../hooks/usePlatform";

interface RibbonProps {
  backgroundColor?: string;
  color?: string;
  label: string;
}

export function Ribbon({ backgroundColor, color, label }: RibbonProps) {
  const { isMobile } = usePlatform();
  const width = isMobile ? 80 : 120;

  return (
    <Box
      sx={{
        position: "absolute",
        top: isMobile ? 14 : 20,
        right: -(width / 4),
        width,
        backgroundColor: backgroundColor || theme.palette.primary.main,
        color: color || "white",
        py: isMobile ? 0.1 : 0.5,
        transform: "rotate(45deg)",
        zIndex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transformOrigin: "center center",
      }}
    >
      <Typography
        fontSize={isMobile ? 8 : 12}
        fontWeight={isMobile ? 400 : 800}
        textTransform="uppercase"
        textAlign="center"
        noWrap
      >
        {label}
      </Typography>
    </Box>
  );
}