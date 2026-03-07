import { Box, Typography, Button, Stack } from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

interface SimplifiedEntityProps {
  entity: {
    id: string;
    name: string;
    category: string;
  };
  onExpand: () => void;
}

export const SimplifiedEntity = ({ entity, onExpand }: SimplifiedEntityProps) => {
  return (
    <Box sx={{ minWidth: 200, p: 0.5 }}>
      <Stack spacing={1}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: "primary.main" }}>
            {entity.name}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textTransform: "capitalize" }}>
            {entity.category}
          </Typography>
        </Box>
        
        <Typography variant="caption" sx={{ fontFamily: "monospace", opacity: 0.7 }}>
          ID: {entity.id}
        </Typography>

        <Button
          variant="contained"
          size="small"
          fullWidth
          startIcon={<OpenInFullIcon sx={{ fontSize: "14px !important" }} />}
          onClick={onExpand}
          sx={{
            mt: 1,
            textTransform: "none",
            fontSize: "0.75rem",
            py: 0.5,
            borderRadius: "4px",
            boxShadow: "none",
            "&:hover": {
              boxShadow: "0 2px 8px rgba(255, 68, 0, 0.4)",
            },
          }}
        >
          Expandir Detalhes
        </Button>
      </Stack>
    </Box>
  );
};
