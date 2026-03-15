import { 
  Box, 
  Typography, 
  Button, 
  Menu, 
  MenuItem, 
  alpha, 
  useTheme,
  Stack,
  Checkbox,
  FormControlLabel
} from "@mui/material";
import { 
  KeyboardArrowDown, 
  Category 
} from "@mui/icons-material";
import { useState } from "react";

interface MultiPickSelectorProps {
  label: string;
  selectedOptions: string[];
  options: string[];
  onChange: (selected: string[]) => void;
  allLabel?: string;
  icon?: React.ReactNode;
}

export function MultiPickSelector({
  label,
  selectedOptions,
  options,
  onChange,
  allLabel = "Todas",
  icon = <Category sx={{ fontSize: 18 }} />
}: MultiPickSelectorProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleToggleOption = (option: string) => {
    const isSelected = selectedOptions.includes(option);
    if (isSelected) {
      onChange(selectedOptions.filter(o => o !== option));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  const isAllSelected = selectedOptions.length === options.length;

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const displayText = selectedOptions.length === 0 
    ? "Nenhuma" 
    : isAllSelected 
      ? allLabel 
      : `${selectedOptions.length} Selecionadas`;

  return (
    <Box>
      <Button
        id="multi-pick-selector-button"
        aria-controls={open ? 'multi-pick-selector-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        endIcon={<KeyboardArrowDown sx={{ 
          transition: 'transform 0.3s', 
          transform: open ? 'rotate(180deg)' : 'none',
          color: selectedOptions.length > 0 ? 'primary.main' : 'text.disabled'
        }} />}
        startIcon={icon}
        sx={{
          backgroundColor: selectedOptions.length > 0 ? alpha(theme.palette.primary.main, 0.1) : 'rgba(255, 255, 255, 0.03)',
          color: selectedOptions.length > 0 ? 'primary.main' : 'text.primary',
          borderRadius: 2,
          px: 2,
          py: 1,
          textTransform: 'none',
          fontWeight: 600,
          border: '1px solid',
          borderColor: selectedOptions.length > 0 ? alpha(theme.palette.primary.main, 0.3) : 'divider',
          backdropFilter: 'blur(8px)',
          '&:hover': {
            backgroundColor: selectedOptions.length > 0 ? alpha(theme.palette.primary.main, 0.15) : 'rgba(255, 255, 255, 0.08)',
            borderColor: selectedOptions.length > 0 ? 'primary.main' : 'rgba(255, 255, 255, 0.2)',
          }
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.6, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {displayText}
          </Typography>
        </Stack>
      </Button>
      <Menu
        id="multi-pick-selector-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'multi-pick-selector-button',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: 2,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: 200,
            maxHeight: 400,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            '& .MuiMenuItem-root': {
              fontSize: '0.9rem',
              fontWeight: 500,
              py: 0.5,
              px: 1,
              mx: 0.5,
              borderRadius: 1,
              transition: 'all 0.2s',
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'text.primary',
              }
            }
          }
        }}
      >
        <MenuItem onClick={handleToggleAll}>
          <FormControlLabel
            control={
              <Checkbox 
                size="small" 
                checked={isAllSelected}
                indeterminate={selectedOptions.length > 0 && selectedOptions.length < options.length}
                sx={{ color: 'rgba(255,255,255,0.3)' }}
              />
            }
            label={allLabel}
            sx={{ margin: 0, '& .MuiTypography-root': { fontSize: '0.9rem', fontWeight: 600 } }}
            onClick={(e) => e.preventDefault()}
          />
        </MenuItem>
        <Box sx={{ my: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }} />
        {options.map((option) => (
          <MenuItem key={option} onClick={() => handleToggleOption(option)}>
            <FormControlLabel
              control={
                <Checkbox 
                  size="small" 
                  checked={selectedOptions.includes(option)}
                  sx={{ color: 'rgba(255,255,255,0.3)' }}
                />
              }
              label={option}
              sx={{ margin: 0, '& .MuiTypography-root': { fontSize: '0.9rem' } }}
              onClick={(e) => e.preventDefault()}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
