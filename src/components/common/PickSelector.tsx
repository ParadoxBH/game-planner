import { 
  Box, 
  Typography, 
  Button, 
  Menu, 
  MenuItem, 
  alpha, 
  useTheme 
} from "@mui/material";
import { 
  KeyboardArrowDown, 
  Category 
} from "@mui/icons-material";
import { useState } from "react";

interface PickSelectorProps {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  allLabel?: string;
  icon?: React.ReactNode;
}

export function PickSelector({
  label,
  value,
  options,
  onChange,
  allLabel = "Todos",
  icon = <Category sx={{ fontSize: 18 }} />
}: PickSelectorProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (val: string | null) => {
    onChange(val);
    handleClose();
  };

  return (
    <Box>
      <Button
        id="pick-selector-button"
        aria-controls={open ? 'pick-selector-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        endIcon={<KeyboardArrowDown sx={{ 
          transition: 'transform 0.3s', 
          transform: open ? 'rotate(180deg)' : 'none',
          color: value ? 'primary.main' : 'text.disabled'
        }} />}
        startIcon={icon}
        sx={{
          backgroundColor: value ? alpha(theme.palette.primary.main, 0.1) : 'rgba(255, 255, 255, 0.03)',
          color: value ? 'primary.main' : 'text.primary',
          borderRadius: 2,
          px: 2,
          py: 1,
          textTransform: 'none',
          fontWeight: 600,
          border: '1px solid',
          borderColor: value ? alpha(theme.palette.primary.main, 0.3) : 'divider',
          backdropFilter: 'blur(8px)',
          '&:hover': {
            backgroundColor: value ? alpha(theme.palette.primary.main, 0.15) : 'rgba(255, 255, 255, 0.08)',
            borderColor: value ? 'primary.main' : 'rgba(255, 255, 255, 0.2)',
          }
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.6, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {value || allLabel}
          </Typography>
        </Stack>
      </Button>
      <Menu
        id="pick-selector-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'pick-selector-button',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: 2,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: 180,
            maxHeight: 400,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            '& .MuiMenuItem-root': {
              fontSize: '0.9rem',
              fontWeight: 500,
              py: 1,
              px: 2,
              mx: 0.5,
              borderRadius: 1,
              transition: 'all 0.2s',
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'text.primary',
              },
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                fontWeight: 700,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                }
              }
            }
          }
        }}
      >
        <MenuItem 
          selected={value === null}
          onClick={() => handleSelect(null)}
        >
          {allLabel}
        </MenuItem>
        {options.map((option) => (
          <MenuItem 
            key={option} 
            selected={value === option}
            onClick={() => handleSelect(option)}
          >
            {option}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

// Utility Stack for usage within PickSelector button
import { Stack } from "@mui/material";
