import { useMediaQuery, useTheme } from "@mui/material";

export function usePlatform() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  
  return { isMobile };
}
