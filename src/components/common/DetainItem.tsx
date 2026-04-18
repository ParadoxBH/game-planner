import { Grid, Paper, Stack, Typography, type SxProps } from "@mui/material";
import type { ReactNode } from "react";
import { DataChip } from "./DataChip";
import { TablePaginator } from "./TablePaginator";
import type { PaginationController } from "../../hooks/usePagination";
import { usePlatform } from "../../hooks/usePlatform";

interface DetainItemProps {
  startIcon?: ReactNode;
  children?: ReactNode;
  size?: number;
  label: string;
  count?: number;
  actions?: ReactNode;
  pages?: PaginationController<any>;
  sx?: {label: SxProps};
}

export function DetainItem({
  startIcon,
  children,
  label,
  sx,
  size,
  count,
  actions,
  pages,
}: DetainItemProps) {
  const { isMobile } = usePlatform();
  if (!children) return <></>;
  return (
    <Grid size={size || 12}>
      <Paper elevation={0} sx={{ p: isMobile ? 1 : 2 }}>
        <Stack direction={isMobile ? "column" : "row"} spacing={0.5} alignItems="stretch" sx={{ mb: 1 }} justifyContent={isMobile ? "stretch" : "space-between"}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent={isMobile ? "space-between" : "start"}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent={"start"}>
              {startIcon}
              <Typography variant="subtitle2" fontSize={isMobile ? undefined : 24} fontWeight={700} sx={sx?.label}>
                {label}
              </Typography>
            </Stack>
            {!!count && (
              <DataChip label={count.toString()} color="primary" size="small" />
            )}
          </Stack>
          {actions && <Stack direction="row" spacing={1} alignItems="center" justifyContent={isMobile ? "stretch" : "end"}>
            {actions}
          </Stack>}
        </Stack>
        {children}
        {pages && <TablePaginator controller={pages} />}
      </Paper>
    </Grid>
  );
}
