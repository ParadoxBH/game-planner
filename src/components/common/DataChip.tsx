import { Chip } from "@mui/material";
import type { ChipProps } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * Standardized Chip for displaying counts, quantities, and small labels.
 * Follows the project's data-driven aesthetic.
 */
export const DataChip = styled(Chip)<ChipProps>(({ theme }) => ({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  fontWeight: 800,
  height: 20,
  fontSize: "0.7rem",
  borderRadius: theme.designTokens.borderRadius * 8, // Level 1 = 8px
  "& .MuiChip-label": {
    paddingLeft: 6,
    paddingRight: 6,
  },
}));
