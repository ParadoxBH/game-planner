import { useState, useMemo } from "react";
import { 
  Box, 
  IconButton, 
  Menu, 
  MenuItem, 
  Checkbox, 
  ListItemText, 
  Typography, 
  Tooltip,
  Badge,
  Divider,
  Button
} from "@mui/material";
import { FilterList, EventAvailable, ClearAll, DoneAll } from "@mui/icons-material";
import { useEventFilter } from "../../context/EventFilterContext";
import { useApi } from "../../hooks/useApi";
import { useParams } from "react-router-dom";

export function GlobalEventFilter() {
  const { gameId } = useParams<{ gameId: string }>();
  const { activeEventIds, toggleEvent, setAllEvents, clearFilters } = useEventFilter();
  const { raw } = useApi(gameId);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const events = useMemo(() => raw?.events || [], [raw?.events]);
  const activeCount = activeEventIds.length;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectAll = () => {
    setAllEvents(events.map(e => e.id));
  };

  if (!gameId || events.length === 0) return null;

  return (
    <Box sx={{ ml: 2 }}>
      <Tooltip title="Filtro de Eventos Globais">
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{ 
            color: activeCount > 0 ? "primary.main" : "white",
            backgroundColor: activeCount > 0 ? "rgba(255, 68, 0, 0.1)" : "transparent",
            border: activeCount > 0 ? "1px solid" : "1px solid transparent",
            borderColor: "primary.main",
            transition: 'all 0.2s'
          }}
        >
          <Badge badgeContent={activeCount} color="primary">
            <FilterList />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 500,
            backgroundColor: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            mt: 1.5,
            '& .MuiMenuItem-root': {
              py: 1,
              px: 2,
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <EventAvailable color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={700}>Filtro de Eventos</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Itens com evento só aparecem se o evento estiver selecionado. Itens sem evento sempre aparecem.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button 
              size="small" 
              startIcon={<DoneAll />} 
              onClick={handleSelectAll}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Todos
            </Button>
            <Button 
              size="small" 
              startIcon={<ClearAll />} 
              onClick={clearFilters}
              color="inherit"
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Limpar
            </Button>
          </Stack>
        </Box>
        
        <Divider sx={{ opacity: 0.1 }} />
        
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {events.map((event) => (
            <MenuItem key={event.id} onClick={() => toggleEvent(event.id)}>
              <Checkbox
                checked={activeEventIds.includes(event.id)}
                size="small"
                sx={{ p: 0.5, mr: 1 }}
              />
              <ListItemText 
                primary={event.name} 
                primaryTypographyProps={{ 
                  variant: 'body2', 
                  fontWeight: activeEventIds.includes(event.id) ? 700 : 400 
                }} 
              />
            </MenuItem>
          ))}
        </Box>
      </Menu>
    </Box>
  );
}

// Helper component for Stack since MUI Stack might not be imported in some environments
function Stack({ children, direction = "column", spacing = 0, alignItems = "stretch", sx = {} }: any) {
  return (
    <Box 
      sx={{ 
        display: "flex", 
        flexDirection: direction === "column" ? "column" : "row", 
        gap: spacing * 8 + "px",
        alignItems,
        ...sx 
      }}
    >
      {children}
    </Box>
  );
}
