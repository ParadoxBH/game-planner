import {
  Box,
  Checkbox,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";
import type { ReactNode } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

interface MapFilterDrawerItemProps {
  label?: string;
  count?: number;
  max?: number;
  checked?: boolean;
  chip?: string | number;
  children?: ReactNode;
  isExpanded?: boolean;
  allSelected?: boolean;
  onExpand?: () => void;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

export function MapFilterDrawerItem({
  children,
  isExpanded,
  onClick,
  label,
  chip,
  onExpand,
  count,
  max,
  sx,
}: MapFilterDrawerItemProps) {
  const someSelected =
    count != undefined && max != undefined && count > 0 && count < max;
  return (
    <Box sx={sx}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={"space-between"}
        flex={1}
        sx={{
          px: 1,
          borderRadius: 1,
          "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
        }}
      >
        <Stack direction={"row"} alignItems={"center"}>
          {children ? (
            <IconButton
              size="small"
              onClick={onExpand}
              sx={{ p: 0.5, mr: 0.5 }}
            >
              {isExpanded ? (
                <ExpandMoreIcon fontSize="small" />
              ) : (
                <ChevronRightIcon fontSize="small" />
              )}
            </IconButton>
          ) : (
            <Box sx={{ width: 32 }} />
          )}
          <Checkbox
            size="small"
            checked={count === max}
            indeterminate={someSelected}
            onChange={onClick}
          />
          <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
            {label}
          </Typography>
        </Stack>
        {chip && (
          <Chip
            label={chip}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.6rem",
              bgcolor: "rgba(255,255,255,0.1)",
            }}
          />
        )}
      </Stack>
      {!!children && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          {children}
        </Collapse>
      )}
    </Box>
  );
}
