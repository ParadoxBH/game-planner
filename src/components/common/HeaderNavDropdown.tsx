import { 
  Button, 
  Menu, 
  MenuItem, 
  alpha, 
  useTheme,
  Box
} from "@mui/material";
import { 
  KeyboardArrowDown 
} from "@mui/icons-material";
import { useState } from "react";
import { Link, useLocation } from 'react-router-dom';

interface HeaderNavDropdownProps {
  label: string;
  icon: React.ReactNode;
  rootPath: string;
  options: {
    label: string;
    path: string;
    icon?: React.ReactNode;
  }[];
}

export function HeaderNavDropdown({
  label,
  icon,
  rootPath,
  options
}: HeaderNavDropdownProps) {
  const theme = useTheme();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isActive = location.pathname.startsWith(rootPath);

  return (
    <Box>
      <Button
        id={`${label}-nav-button`}
        aria-controls={open ? `${label}-nav-menu` : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        startIcon={icon}
        endIcon={<KeyboardArrowDown sx={{ 
          transition: 'transform 0.3s', 
          transform: open ? 'rotate(180deg)' : 'none',
          fontSize: '1rem'
        }} />}
        sx={{ 
          my: 2, 
          color: isActive ? "primary.main" : "white", 
          display: "flex", 
          mx: 1,
          textTransform: 'none',
          transition: 'all 0.2s',
          borderBottom: isActive ? '2px solid #ff4400' : '2px solid transparent',
          borderRadius: 0,
          '&:hover': {
            color: 'primary.main',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        }}
      >
        {label}
      </Button>
      <Menu
        id={`${label}-nav-menu`}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': `${label}-nav-button`,
        }}
        PaperProps={{
          sx: {
            mt: 0.5,
            backgroundColor: 'rgba(20, 20, 20, 0.95)',
            backdropFilter: 'blur(16px)',
            borderRadius: 1,
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
              borderRadius: 0.5,
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
          component={Link}
          to={rootPath}
          onClick={handleClose}
          selected={location.pathname === rootPath}
        >
          Todas
        </MenuItem>
        {options.map((option) => (
          <MenuItem 
            key={option.path}
            component={Link}
            to={option.path}
            onClick={handleClose}
            selected={location.pathname === option.path}
            sx={{ gap: 1 }}
          >
            {option.icon && <Box sx={{ display: 'flex', opacity: 0.7 }}>{option.icon}</Box>}
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
