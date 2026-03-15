import { Box, Grid, Stack, Typography, useTheme, alpha } from "@mui/material";
import { type ReactNode, useMemo } from "react";
import { type ViewMode } from "./ViewModeSelector";

interface DataViewProps<T> {
  data: T[];
  renderCard: (item: T) => ReactNode;
  renderListItem?: (item: T) => ReactNode;
  renderIconItem?: (item: T) => ReactNode;
  viewMode?: ViewMode;
  columns?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  cardMinWidth?: number | string;
  emptyMessage?: string;
  storageKey?: string;
  gridProps?: any;
  actions?: ReactNode;
}

export function ListingDataView<T>({ 
  data, 
  viewMode = "cards",
  columns,
  cardMinWidth,
  renderCard, 
  renderListItem, 
  renderIconItem, 
  emptyMessage = "Nenhum item encontrado.",
  gridProps = { spacing: 3 },
  actions
}: DataViewProps<T>) {
  const theme = useTheme();

  // Calcula os tamanhos do grid com base nas colunas desejadas (padrão: 1, 2, 3, 4)
  const gridSizes = useMemo(() => {
    const defaultCols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 6 };
    const cols = typeof columns === 'number' 
      ? { xs: 1, sm: Math.max(1, Math.floor(columns/2)), md: columns, lg: columns, xl: columns }
      : { ...defaultCols, ...columns };

    return {
      xs: Math.floor(12 / (cols.xs || 1)),
      sm: Math.floor(12 / (cols.sm || 2)),
      md: Math.floor(12 / (cols.md || 3)),
      lg: Math.floor(12 / (cols.lg || 4)),
      xl: Math.floor(12 / (cols.xl || 6)),
    };
  }, [columns]);

  if (data.length === 0) {
    return (
      <Stack sx={{ flex: 1, textAlign: 'center', py: 8, alignItems: "center", justifyContent: "center" }}>
        <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
          {emptyMessage}
        </Typography>
      </Stack>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {actions && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          {actions}
        </Box>
      )}

      {viewMode === "cards" && (
        cardMinWidth ? (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(auto-fill, minmax(${typeof cardMinWidth === 'number' ? `${cardMinWidth}px` : cardMinWidth}, 1fr))`, 
            gap: theme.spacing(gridProps.spacing || 3) 
          }}>
            {data.map((item, index) => (
              <Box key={index}>
                {renderCard(item)}
              </Box>
            ))}
          </Box>
        ) : (
          <Grid container {...gridProps}>
            {data.map((item, index) => (
              <Grid key={index} size={gridSizes}>
                {renderCard(item)}
              </Grid>
            ))}
          </Grid>
        )
      )}

      {viewMode === "list" && (
        <Stack spacing={1}>
          {data.map((item, index) => (
            <Box key={index} sx={{ 
              width: '100%',
              backgroundColor: alpha(theme.palette.background.paper, 0.05),
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              '&:hover': {
                backgroundColor: alpha(theme.palette.background.paper, 0.08),
                borderColor: alpha(theme.palette.primary.main, 0.3),
              }
            }}>
              {renderListItem ? renderListItem(item) : renderCard(item)}
            </Box>
          ))}
        </Stack>
      )}

      {viewMode === "icons" && (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
          gap: 2 
        }}>
          {data.map((item, index) => (
            <Box key={index} sx={{ 
              aspectRatio: '1/1',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: alpha(theme.palette.background.paper, 0.05),
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'scale(1.05)',
                backgroundColor: alpha(theme.palette.background.paper, 0.1),
                borderColor: theme.palette.primary.main,
                boxShadow: `0 0 15px ${alpha(theme.palette.primary.main, 0.2)}`
              }
            }}>
              {renderIconItem ? renderIconItem(item) : renderCard(item)}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
