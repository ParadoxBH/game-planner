import { 
  Box, 
  Typography, 
  Paper, 
  Tooltip 
} from "@mui/material";
import { 
  Inventory,
  Bolt,
  Category,
  AutoFixHigh
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import type { GameDataTypes } from "../../types/gameModels";

export interface ItemChipProps {
  id: string;
  name?: string;
  amount?: number;
  type?: GameDataTypes;
  icon?: string;
  isProduct?: boolean;
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
  disableLink?: boolean;
}

const SIZES = {
  small: {
    box: 32,
    icon: 16,
    badge: 16,
    offset: -2,
    p: 0.5,
    px: 0.5,
    fontSize: '0.65rem'
  },
  medium: {
    box: 40,
    icon: 20,
    badge: 18,
    offset: -4,
    p: 0.5,
    px: 0.5,
    fontSize: '0.65rem'
  },
  large: {
    box: 56,
    icon: 28,
    badge: 22,
    offset: -6,
    p: 0.75,
    px: 1,
    fontSize: '0.75rem'
  },
  extraLarge: {
    box: 100,
    icon: 50,
    badge: 32,
    offset: -10,
    p: 1.5,
    px: 2,
    fontSize: '1.1rem'
  }
};

/**
 * A standardized component to display game items/entities with an icon,
 * amount badge, and tooltip.
 */
export function ItemChip({
  id,
  name,
  amount,
  type = 'item',
  icon: iconSrc,
  isProduct = false,
  size = 'large',
  disableLink = false
}: ItemChipProps) {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();

  const formatAmount = (num: number) => {
    if (num < 1000) return num.toString();
    if (num < 1000000) {
      const k = num / 1000;
      return (k % 1 === 0 ? k : k.toFixed(1)) + 'K';
    }
    const m = num / 1000000;
    return (m % 1 === 0 ? m : m.toFixed(1)) + 'M';
  };

  const displayName = type === 'category' ? `Qualquer ${id}` : (name || id);
  const tooltipTitle = amount !== undefined
    ? `${displayName} ${amount.toString()}x` 
    : displayName;
  
  const config = SIZES[size];

  const renderIcon = () => {
    if (type === 'category') {
      return <Category sx={{ fontSize: config.icon, color: 'warning.main' }} />;
    }
    if (iconSrc) {
      return <img src={iconSrc} alt={id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
    }
    if (type === 'entity') {
      return <Bolt sx={{ fontSize: config.icon, color: 'secondary.main' }} />;
    }
    if (type === 'skill') {
      return <AutoFixHigh sx={{ fontSize: config.icon, color: 'warning.light' }} />;
    }
    return <Inventory sx={{ fontSize: config.icon, color: isProduct ? 'primary.main' : 'text.disabled' }} />;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!disableLink && gameId) {
      if (type === 'item') {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/game/${gameId}/items/view/${id}`);
      } else if (type === 'entity') {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/game/${gameId}/entity/view/${id}`);
      }
    }
  };

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Box 
        onClick={handleClick}
        sx={{ 
          position: 'relative', 
          width: config.box, 
          height: config.box,
          cursor: (type === 'item' && !disableLink) ? 'pointer' : 'default'
        }}
      >
        <Paper variant="outlined" sx={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          p: config.p,
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderColor: type === 'category' ? 'warning.dark' : 
                       type === 'entity' ? 'secondary.dark' : 
                       type === 'skill' ? 'warning.main' :
                       isProduct ? 'primary.dark' : 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: (type === 'item' && !disableLink) ? 'scale(1.1)' : 'scale(1.05)',
            borderColor: 'primary.main',
            boxShadow: (type === 'item' && !disableLink) ? '0 0 15px rgba(255, 68, 0, 0.3)' : 'none'
          }
        }}>
          {renderIcon()}
        </Paper>
        {(amount !== undefined && amount != 0) && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: config.offset, 
            right: config.offset, 
            backgroundColor: isProduct ? 'primary.main' : 'background.paper',
            color: isProduct ? 'primary.contrastText' : 'text.primary',
            borderRadius: '10px',
            px: config.px,
            minWidth: config.badge,
            height: config.badge,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid',
            borderColor: '#121212', // Match background
            boxShadow: 4,
            zIndex: 1
          }}>
            <Typography variant="caption" sx={{ 
              fontWeight: 800, 
              fontSize: config.fontSize 
            }}>
              {formatAmount(amount)}
            </Typography>
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}
