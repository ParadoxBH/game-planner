import { Chip } from "@mui/material";
import type { ChipProps } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * Standardized Chip for displaying counts, quantities, and small labels.
 * Follows the project's data-driven aesthetic.
 */
export const DataChip = styled(Chip)<ChipProps>(() => ({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  fontWeight: 800,
  height: 20,
  fontSize: "0.7rem",
  borderRadius: 4, // More subtle than the default
  "& .MuiChip-label": {
    paddingLeft: 6,
    paddingRight: 6,
  },
  // Variants or specific states can be added here
}));
