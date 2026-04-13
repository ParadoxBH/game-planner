import { Box, Button, Typography, alpha, useTheme } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

interface PaginationProps {
  page: number;
  lastPage: number;
  onPageChange: (newPage: number) => void;
}

export function Pagination({ page, lastPage, onPageChange }: PaginationProps) {
  const theme = useTheme();

  if (lastPage <= 1) return null;

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        mt: 4, 
        gap: 2,
        p: 2,
        borderRadius: 2,
        backgroundColor: alpha(theme.palette.background.paper, 0.03),
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Button 
        variant="outlined" 
        disabled={page === 1}
        startIcon={<ChevronLeft />}
        onClick={() => onPageChange(page - 1)}
        sx={{
          borderRadius: 1.5,
          textTransform: 'none',
          fontWeight: 700,
          borderColor: alpha(theme.palette.divider, 0.2),
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          }
        }}
      >
        Anterior
      </Button>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 800, 
            color: 'primary.main',
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            minWidth: 32,
            textAlign: 'center'
          }}
        >
          {page}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.5, textTransform: 'uppercase' }}>
          de {lastPage}
        </Typography>
      </Box>

      <Button 
        variant="outlined" 
        disabled={page === lastPage}
        endIcon={<ChevronRight />}
        onClick={() => onPageChange(page + 1)}
        sx={{
          borderRadius: 1.5,
          textTransform: 'none',
          fontWeight: 700,
          borderColor: alpha(theme.palette.divider, 0.2),
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          }
        }}
      >
        Próxima
      </Button>
    </Box>
  );
}
