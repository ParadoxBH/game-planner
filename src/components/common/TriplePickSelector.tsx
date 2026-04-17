import { 
  Box, 
  Typography, 
  Button, 
  Menu, 
  MenuItem, 
  alpha, 
  useTheme,
  Stack,
  Tooltip,
  ButtonGroup
} from "@mui/material";
import { 
  KeyboardArrowDown, 
  Category
} from "@mui/icons-material";
import { useState } from "react";
import { usePlatform } from "../../hooks/usePlatform";
import { getPublicUrl } from "../../utils/pathUtils";

export type TripleState = 'include' | 'exclude' | 'indifferent';

interface TripleToggleGroupProps {
  state: TripleState;
  onChange: (newState: TripleState) => void;
}

function TripleToggleGroup({ state, onChange }: TripleToggleGroupProps) {
  const theme = useTheme();

  const handleToggle = (target: TripleState) => {
    if (state === target) {
      onChange('indifferent');
    } else {
      onChange(target);
    }
  };

  const sizeButton = theme.spacing(3);

  return (
    <ButtonGroup>
      <Tooltip title="Não Conter" arrow placement="top">
        <Box
          onClick={(e) => { e.stopPropagation(); handleToggle('exclude'); }}
          sx={{
            width: sizeButton,
            height: sizeButton,
            borderTopLeftRadius: theme.spacing(1),
            borderBottomLeftRadius: theme.spacing(1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '1px solid',
            borderColor: state === 'exclude' ? alpha(theme.palette.error.main, 0.2) : 'rgba(255, 255, 255, 0.1)',
            backgroundColor: state === 'exclude' ? alpha(theme.palette.error.main, 0.8) : 'rgba(255, 255, 255, 0.03)',
            color: state === 'exclude' ? theme.palette.error.light : 'text.disabled',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: state === 'exclude' ? theme.palette.error.main : 'rgba(255, 255, 255, 0.08)',
              borderColor: state === 'exclude' ? alpha(theme.palette.error.main, 0.3) : 'rgba(255, 255, 255, 0.2)',
            }
          }}
        />
      </Tooltip>

      <Tooltip title="Conter" arrow placement="top">
        <Box
          onClick={(e) => { e.stopPropagation(); handleToggle('include'); }}
          sx={{
            width: sizeButton,
            height: sizeButton,
            borderTopRightRadius: theme.spacing(1),
            borderBottomRightRadius: theme.spacing(1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '1px solid',
            borderColor: state === 'include' ? alpha(theme.palette.success.main, 0.2) : 'rgba(255, 255, 255, 0.1)',
            backgroundColor: state === 'include' ? alpha(theme.palette.success.main, 0.6) : 'rgba(255, 255, 255, 0.03)',
            color: state === 'include' ? theme.palette.success.light : 'text.disabled',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: state === 'include' ? theme.palette.success.main : 'rgba(255, 255, 255, 0.08)',
              borderColor: state === 'include' ? alpha(theme.palette.success.main, 0.3) : 'rgba(255, 255, 255, 0.2)',
            }
          }}
        />
      </Tooltip>
    </ButtonGroup>
  );
}

interface TriplePickOption {
  value: string;
  label: string;
  icon?: string;
}

interface TriplePickSelectorProps {
  label: string;
  states: Record<string, TripleState>;
  options: (string | TriplePickOption)[];
  onChange: (option: string, newState: TripleState) => void;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function TriplePickSelector({
  label,
  states,
  options,
  onChange,
  fullWidth,
  icon = <Category sx={{ fontSize: 18 }} />
}: TriplePickSelectorProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const { isMobile } = usePlatform();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const activeCount = Object.values(states).filter(s => s !== 'indifferent').length;

  const displayText = activeCount === 0 
    ? "Todas" 
    : `${activeCount} Filtros`;

  return (
    <>
      <Button
        id="triple-pick-selector-button"
        aria-controls={open ? 'triple-pick-selector-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        endIcon={<KeyboardArrowDown sx={{ 
          transition: 'transform 0.3s', 
          transform: open ? 'rotate(180deg)' : 'none',
          color: activeCount > 0 ? 'primary.main' : 'text.disabled'
        }} />}
        startIcon={icon}
        sx={{
          flex: fullWidth ? 1 : undefined,
          backgroundColor: activeCount > 0 ? alpha(theme.palette.primary.main, 0.1) : 'rgba(255, 255, 255, 0.03)',
          color: activeCount > 0 ? 'primary.main' : 'text.primary',
          borderRadius: isMobile ? 1 : 2,
          px: isMobile ? 1 : 2,
          py: isMobile ? 0.5 : 1,
          textTransform: 'none',
          fontWeight: 600,
          border: '1px solid',
          borderColor: activeCount > 0 ? alpha(theme.palette.primary.main, 0.3) : 'divider',
          backdropFilter: 'blur(8px)',
          '&:hover': {
            backgroundColor: activeCount > 0 ? alpha(theme.palette.primary.main, 0.15) : 'rgba(255, 255, 255, 0.08)',
            borderColor: activeCount > 0 ? 'primary.main' : 'rgba(255, 255, 255, 0.2)',
          }
        }}
      >
        <Stack direction={isMobile ? "column" : "row"} spacing={isMobile ? 0.5 : 1} alignItems={isMobile ? "start" : "center"}>
          {!isMobile && <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.6, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}:
          </Typography>}
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {displayText}
          </Typography>
        </Stack>
      </Button>
      <Menu
        id="triple-pick-selector-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'triple-pick-selector-button',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: 260,
            maxHeight: 400,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            '& .MuiMenuItem-root': {
              fontSize: '0.9rem',
              fontWeight: 500,
              py: 1.2,
              px: 2,
              mx: 0.5,
              borderRadius: 1,
              transition: 'all 0.2s',
              color: 'text.secondary',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'default',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'text.primary',
              }
            }
          }
        }}
      >
        <Box sx={{ px: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase' }}>
            Ajustar Filtros
          </Typography>
        </Box>
        {options.map((option) => {
          const optValue = typeof option === 'string' ? option : option.value;
          const optLabel = typeof option === 'string' ? option : option.label;
          const state = states[optValue] || 'indifferent';
          
          return (
            <MenuItem key={optValue} disableRipple>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {typeof option !== 'string' && option.icon && (
                  <Box 
                    component="img" 
                    src={getPublicUrl(option.icon)} 
                    sx={{ width: 18, height: 18, objectFit: 'contain' }} 
                  />
                )}
                <Typography variant="body2" sx={{ 
                  color: state !== 'indifferent' ? 'text.primary' : 'inherit',
                  fontWeight: state !== 'indifferent' ? 700 : 500,
                }}>
                  {optLabel}
                </Typography>
              </Stack>
              <TripleToggleGroup 
                state={state} 
                onChange={(newState) => onChange(optValue, newState)} 
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
