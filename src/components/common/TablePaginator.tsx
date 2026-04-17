import {
  Box,
  Button,
  Typography,
  alpha,
  useTheme,
  Menu,
  MenuItem,
  Stack,
} from "@mui/material";
import { ChevronLeft, ChevronRight, List } from "@mui/icons-material";
import { useState } from "react";
import type { PaginationController } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";

interface TablePaginatorProps {
  controller: PaginationController<any>;
}

export function TablePaginator({ controller }: TablePaginatorProps) {
  const theme = useTheme();
  const { info, lastPage, totalItems, setPage, setPageSize } = controller;
  const { page, pageSize } = info.pagination;

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openSizeMenu = Boolean(anchorEl);
  const { isMobile } = usePlatform();

  const arrowSx = {
            borderRadius: 1,
            textTransform: "none",
            fontWeight: 700,
            minWidth: "auto",
            p: isMobile ? 0 : 0.5,
            px: isMobile ? undefined : 2,
            borderColor: alpha(theme.palette.divider, 0.2),
            "&:hover": {
              borderColor: "primary.main",
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            },
          };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: isMobile ? 0.5 : 1,
        borderRadius: 1,
        backgroundColor: alpha(theme.palette.background.paper, 0.03),
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backdropFilter: "blur(8px)",
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="outlined"
          disabled={page === 1}
          startIcon={isMobile ? undefined : <ChevronLeft />}
          onClick={() => setPage(page - 1)}
          sx={arrowSx}
        >
          {isMobile ? <ChevronLeft /> : "Anterior"}
        </Button>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {!isMobile && (
            <>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  color: "primary.main",
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  minWidth: 32,
                  textAlign: "center",
                }}
              >
                {page}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  opacity: 0.5,
                  textTransform: "uppercase",
                }}
              >
                de {lastPage}
              </Typography>
            </>
          )}
          {isMobile && (
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, opacity: 0.5, textTransform: "uppercase" }}
            >
              {`${page} / ${lastPage}`}
            </Typography>
          )}
        </Box>

        <Button
          variant="outlined"
          disabled={page === lastPage}
          endIcon={isMobile ? undefined : <ChevronRight />}
          onClick={() => setPage(page + 1)}
          sx={arrowSx}
        >
          {isMobile ? <ChevronRight /> : "Próxima"}
        </Button>
      </Stack>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 600 }}
        >
          {`Mostrando ${Math.min(totalItems, (page - 1) * pageSize + 1)}-${Math.min(totalItems, page * pageSize)} de ${totalItems} itens`}
        </Typography>

        {!isMobile && <Button
          variant="text"
          size="small"
          startIcon={<List sx={{ fontSize: 16 }} />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            color: "text.secondary",
            textTransform: "none",
            fontWeight: 600,
            "&:hover": { color: "primary.main" },
          }}
        >
          {pageSize} por página
        </Button>}
        <Menu
          anchorEl={anchorEl}
          open={openSizeMenu}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: {
              borderRadius: 1,
              backgroundColor: "rgba(20, 20, 20, 0.95)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          {[25, 50, 100, 200, 300].map((size) => (
            <MenuItem
              key={size}
              selected={pageSize === size}
              onClick={() => {
                setPageSize(size);
                setAnchorEl(null);
              }}
              sx={{ fontSize: "0.8rem", fontWeight: 600 }}
            >
              {size} itens
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Box>
  );
}
