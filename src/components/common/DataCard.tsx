import { Box, useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import type { ReactNode } from "react";

interface DataCardProps {
  children: ReactNode;
  onClick?: () => void;
  flex?: number | string;
  sx?: SxProps<Theme>;
  hoverable?: boolean;
}

/**
 * Standardized card for containing data elements.
 * Unifies the look of boxed information across the project.
 */
export const DataCard = ({ children, onClick, flex, sx = {}, hoverable }: DataCardProps) => {
  const theme = useTheme();
  const { spacing: dtSpacing, borderRadius: dtRadius } = theme.designTokens;
  const isClickable = Boolean(onClick) || hoverable;

  return (
    <Box
      onClick={onClick}
      sx={{
        flex,
        bgcolor: "rgba(255,255,255,0.03)",
        p: dtSpacing.cardPadding,
        borderRadius: dtRadius,
        border: 1,
        borderColor: "divider",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: isClickable ? "pointer" : "default",
        position: "relative",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        ...(isClickable && {
          "&:hover": {
            bgcolor: "rgba(255, 68, 0, 0.08)",
            borderColor: "rgba(255, 68, 0, 0.4)",
            transform: onClick ? "translateX(4px)" : "none",
          },
        }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};
