import { Box, Typography, Button, Stack, Divider } from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import InventoryIcon from "@mui/icons-material/Inventory";

interface SimplifiedEntityProps {
  entity: {
    id: string;
    name: string;
    category: string;
    icon?: string;
  };
  position: [number, number];
  onExpand: () => void;
}

export const SimplifiedEntity = ({
  entity,
  position,
  onExpand,
}: SimplifiedEntityProps) => {
  return (
    <Box sx={{ minWidth: 220, p: 0.5 }}>
      <Stack spacing={1}>
        {/* Header with Icon */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              bgcolor: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {entity.icon ? (
              <img
                src={entity.icon}
                alt={entity.name}
                style={{ width: "85%", height: "85%", objectFit: "contain" }}
              />
            ) : (
              <InventoryIcon sx={{ fontSize: 24, color: "rgba(0,0,0,0.2)" }} />
            )}
          </Box>
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1.2 }}
            >
              {entity.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                textTransform: "capitalize",
                fontWeight: 600,
              }}
            >
              {entity.category}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Details Section */}
        <Box>
          <Typography variant="subtitle2">Coordenada</Typography>
          <Stack spacing={1} direction={"row"}>
            <Typography
              flex={1}
              variant="caption"
              sx={{
                fontFamily: "monospace",
                display: "block",
                bgcolor: "rgba(0,0,0,0.03)",
                p: 0.5,
                borderRadius: "4px",
              }}
            >
              X: {position[1].toFixed(1)}
            </Typography>
            <Typography
              flex={1}
              variant="caption"
              sx={{
                fontFamily: "monospace",
                display: "block",
                bgcolor: "rgba(0,0,0,0.03)",
                p: 0.5,
                borderRadius: "4px",
              }}
            >
              Y: {position[0].toFixed(1)}
            </Typography>
          </Stack>
        </Box>

        <Button
          variant="contained"
          size="small"
          fullWidth
          startIcon={<OpenInFullIcon sx={{ fontSize: "14px !important" }} />}
          onClick={onExpand}
          sx={{
            textTransform: "none",
            fontSize: "0.75rem",
            fontWeight: 700,
            py: 0.6,
            borderRadius: "6px",
            boxShadow: "none",
            "&:hover": {
              boxShadow: "0 4px 12px rgba(255, 68, 0, 0.3)",
            },
          }}
        >
          Ver Detalhes Completos
        </Button>
      </Stack>
    </Box>
  );
};
