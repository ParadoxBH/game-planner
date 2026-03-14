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

export interface ItemChipProps {
  id: string;
  name?: string;
  amount?: number;
  type?: 'item' | 'entity' | 'category' | 'skill';
  icon?: string;
  isProduct?: boolean;
  size?: 'small' | 'medium' | 'large';
  disableLink?: boolean;
}

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
  
  const boxSize = size === 'large' ? 56 : size === 'medium' ? 40 : 32;
  const iconSize = size === 'large' ? 28 : size === 'medium' ? 20 : 16;
  const badgeSize = size === 'large' ? 22 : size === 'medium' ? 18 : 16;
  const badgeOffset = size === 'large' ? -6 : size === 'medium' ? -4 : -2;

  const renderIcon = () => {
    if (type === 'category') {
      return <Category sx={{ fontSize: iconSize, color: 'warning.main' }} />;
    }
    if (iconSrc) {
      return <img src={iconSrc} alt={id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
    }
    if (type === 'entity') {
      return <Bolt sx={{ fontSize: iconSize, color: 'secondary.main' }} />;
    }
    if (type === 'skill') {
      return <AutoFixHigh sx={{ fontSize: iconSize, color: 'warning.light' }} />;
    }
    return <Inventory sx={{ fontSize: iconSize, color: isProduct ? 'primary.main' : 'text.disabled' }} />;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (type === 'item' && !disableLink && gameId) {
      e.preventDefault();
      e.stopPropagation();
      navigate(`/game/${gameId}/items/view/${id}`);
    }
  };

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Box 
        onClick={handleClick}
        sx={{ 
          position: 'relative', 
          width: boxSize, 
          height: boxSize,
          cursor: (type === 'item' && !disableLink) ? 'pointer' : 'default'
        }}
      >
        <Paper variant="outlined" sx={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          p: size === 'large' ? 0.75 : 0.5,
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
        {amount !== undefined && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: badgeOffset, 
            right: badgeOffset, 
            backgroundColor: isProduct ? 'primary.main' : 'background.paper',
            color: isProduct ? 'primary.contrastText' : 'text.primary',
            borderRadius: '10px',
            px: size === 'large' ? 1 : 0.5,
            minWidth: badgeSize,
            height: badgeSize,
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
              fontSize: size === 'large' ? '0.75rem' : '0.65rem' 
            }}>
              {formatAmount(amount)}
            </Typography>
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}
