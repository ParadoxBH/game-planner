import { 
  Box, 
  Grid, 
  Stack, 
  Typography, 
  useTheme, 
  alpha,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  darken
} from "@mui/material";
import { type ReactNode, useMemo } from "react";
import { type ViewMode } from "./ViewModeSelector";

export interface ListDataHeader {
  label: string;
  startIcon?: ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  hidden?: boolean;
}

interface DataViewProps<T> {
  data: T[];
  renderCard: (item: T, variant: "default" | "compact") => ReactNode;
  renderListItem?: (item: T) => ReactNode[];
  renderIconItem?: (item: T) => ReactNode;
  viewMode?: ViewMode;
  columns?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  cardMinWidth?: number | string;
  emptyMessage?: string;
  storageKey?: string;
  gridProps?: any;
  listHeader?: ListDataHeader[];
  actions?: ReactNode;
  variant?: 'default' | 'compact';
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
  gridProps = { spacing: 2 },
  listHeader,
  actions,
  variant = "default"
}: DataViewProps<T>) {
  const theme = useTheme();

  // Calcula os tamanhos do grid com base nas colunas desejadas (padrão: 1, 2, 3, 4)
  const gridSizes = useMemo(() => {
    const defaultCols = { xs: 2, sm: 3, md: 4, lg: 6, xl: 8 };
    const cols = typeof columns === 'number' 
      ? { xs: 2, sm: Math.max(2, Math.floor(columns/2)), md: columns, lg: columns, xl: columns }
      : { ...defaultCols, ...columns };

    return {
      xs: Math.floor(12 / (cols.xs || 1)),
      sm: Math.floor(12 / (cols.sm || 2)),
      md: Math.floor(12 / (cols.md || 3)),
      lg: Math.floor(12 / (cols.lg || 4)),
      xl: Math.floor(12 / (cols.xl || 6)),
    };
  }, [columns]);

  const visibleHeaders = useMemo(() => listHeader?.filter(h => !h.hidden) || [], [listHeader]);

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
    <>
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
            gap: theme.spacing(1),
            borderRadius: 1,
          }}>
            {data.map((item, index) => (
              <Box key={index}>
                {renderCard(item, variant)}
              </Box>
            ))}
          </Box>
        ) : (
          <Grid container {...gridProps}>
            {data.map((item, index) => (
              <Grid key={index} size={gridSizes}>
                {renderCard(item, variant)}
              </Grid>
            ))}
          </Grid>
        )
      )}

      {viewMode === "list" && (
        <TableContainer sx={{ 
          backgroundColor: alpha(theme.palette.background.paper, 0.05),
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          overflow: 'auto',
          display: "block",
          flex: 1,
        }}>
          <Table size="small" stickyHeader>
            {visibleHeaders.length > 0 && (
              <TableHead>
                <TableRow>
                  {visibleHeaders.map((header, i) => (
                    <TableCell 
                      key={i} 
                      align={header.align || 'left'}
                      sx={{ 
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        py: 1.5,
                        width: header.width,
                        backgroundColor: theme.palette.header
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: header.align === 'right' ? 'flex-end' : (header.align === 'center' ? 'center' : 'flex-start') }}>
                        {header.startIcon && <Box sx={{ display: 'flex', color: 'primary.main', '& svg': { fontSize: 16 } }}>{header.startIcon}</Box>}
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 800, 
                            color: 'primary.main', 
                            textTransform: 'uppercase', 
                            letterSpacing: 1,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {header.label}
                        </Typography>
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
            )}
            <TableBody>
              {data.map((item, index) => {
                const rawCells = renderListItem ? renderListItem(item) : [<>{renderCard(item)}</>];
                // Se temos cabeçalho, filtramos as células que não devem aparecer
                const cells = listHeader 
                  ? rawCells.filter((_, i) => !listHeader[i]?.hidden)
                  : rawCells;

                return (
                  <TableRow 
                    key={index}
                    sx={{ 
                      '&:hover': { backgroundColor: alpha(theme.palette.background.paper, 0.08) },
                      '&:last-child td': { borderBottom: 0 },
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {cells.map((cell, cellIndex) => {
                      const headerInfo = visibleHeaders[cellIndex];

                      return (
                        <TableCell 
                          key={cellIndex}
                          align={headerInfo?.align || 'left'}
                          sx={{ 
                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                            py: 1.5,
                            px: 2,
                            color: 'text.primary'
                          }}
                        >
                          {cell}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
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
    </>
  );
}
