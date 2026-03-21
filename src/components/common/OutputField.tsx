import { Box, Typography, Stack, useTheme } from "@mui/material";
import { DataCard } from "./DataCard";

interface OutputFieldProps {
  label: string;
  values: string[];
  flex?: number | string;
}

/**
 * Standardized component for displaying labeled information in "boxed" segments.
 * Perfect for coordinates, regions, and technical IDs.
 */
export const OutputField = ({ label, values, flex }: OutputFieldProps) => {
  const theme = useTheme();
  const { spacing: dtSpacing, borderRadius: dtRadius } = theme.designTokens;

  return (
    <Box sx={{ flex }}>
      <Typography
        variant="subtitle2"
        sx={{ 
          color: "designTokens.colors.fieldLabel", 
          fontSize: "0.65rem", 
          mb: dtSpacing.fieldGap,
          fontWeight: 700,
          textTransform: "none"
        }}
      >
        {label}
      </Typography>
      <Stack direction="row" spacing={dtSpacing.itemGap}>
        {values.map((v, i) => (
          <DataCard
            key={i}
            flex={1}
            sx={{
              p: 0.75, // Mantendo compacto para valores técnicos
              textAlign: "center",
              justifyContent: "center",
              minHeight: "28px",
              borderRadius: dtRadius
            }}
          >
            <Typography
              variant={"caption"}
              sx={{
                fontFamily: "monospace",
                color: "designTokens.colors.fieldValue",
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "0.5px",
              }}
            >
              {v}
            </Typography>
          </DataCard>
        ))}
      </Stack>
    </Box>
  );
};
