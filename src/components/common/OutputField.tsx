import { Box, Typography, Stack } from "@mui/material";
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
  return (
    <Box sx={{ flex }}>
      <Typography
        variant="subtitle2"
        sx={{ 
          color: "designTokens.colors.fieldLabel", 
          fontSize: "0.65rem", 
          mb: 0.5,
          fontWeight: 700,
          textTransform: "none"
        }}
      >
        {label}
      </Typography>
      <Stack direction="row" spacing={0.5}>
        {values.map((v, i) => (
          <DataCard
            key={i}
            flex={1}
            sx={{
              p: 0.75,
              textAlign: "center",
              justifyContent: "center",
              minHeight: "28px"
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
