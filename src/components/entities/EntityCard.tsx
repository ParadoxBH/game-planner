import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
  Tooltip
} from "@mui/material";
import { 
  Category as CategoryIcon,
  TravelExplore as RequirementsIcon,
  Inventory as DropsIcon,
  ShoppingCart,
  Sell
} from "@mui/icons-material";
import { ItemChip } from "../common/ItemChip";

export interface EntityDrop {
  itemId: string;
  chance: number;
  quant: number;
  maxQuant?: number;
}

export interface GameEntity {
  id: string;
  name: string;
  category: string | string[];
  icon?: string;
  requirements?: {
    itemId: string;
    quant: number;
    maxQuant?: number;
  }[];
  drops?: EntityDrop[];
  buyPrice?: number;
  sellPrice?: number;
}

interface EntityCardProps {
  entity: GameEntity;
  showPrices?: boolean;
  onClick: () => void;
}

export function EntityCard({ entity, showPrices, onClick }: EntityCardProps) {
  return (
    <Card sx={{ 
      backgroundColor: 'rgba(255, 255, 255, 0.02)', 
      backdropFilter: 'blur(16px)',
      borderRadius: 2,
      border: 1,
      borderColor: 'divider',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-6px)',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }
    }}
    onClick={onClick}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ 
          width: 64, 
          height: 64, 
          borderRadius: 1.5, 
          backgroundColor: 'rgba(0,0,0,0.2)',
          border: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {entity.icon ? (
            <img src={entity.icon} alt={entity.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
          ) : (
            <CategoryIcon sx={{ fontSize: 32, color: 'rgba(255, 255, 255, 0.2)' }} />
          )}
        </Box>
        <Box>
          <Stack direction="row" spacing={0.5} sx={{ mb: 0.5, flexWrap: 'wrap' }}>
            {(Array.isArray(entity.category) ? entity.category : [entity.category]).map(cat => (
              <Typography key={cat} variant="subtitle2" sx={{ color: 'primary.main', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>
                #{cat}
              </Typography>
            ))}
          </Stack>
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2 }}>
            {entity.name}
          </Typography>
        </Box>
      </Box>
      <CardContent sx={{ pt: 0, flexGrow: 1 }}>
        <Stack spacing={1} sx={{ mb: 2 }}>
          {entity.requirements && entity.requirements.length > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              <RequirementsIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {entity.requirements.length} Requisitos
              </Typography>
            </Stack>
          )}
          {entity.drops && entity.drops.length > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              <DropsIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {entity.drops.length} Drops
              </Typography>
            </Stack>
          )}
        </Stack>
        
        {showPrices && (entity.sellPrice !== undefined || entity.buyPrice !== undefined) && (
          <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
            {entity.buyPrice !== undefined && (
              <Tooltip title="Preço de Compra">
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ 
                  backgroundColor: 'rgba(76, 175, 80, 0.05)', 
                  px: 0.5, 
                  borderRadius: 0.5,
                  border: '1px solid rgba(76, 175, 80, 0.1)'
                }}>
                  <ShoppingCart sx={{ fontSize: 12, color: 'success.main' }} />
                  <ItemChip id="ouro" amount={entity.buyPrice} size="small" icon="/img/heartopia/stats/ouro.png" />
                </Stack>
              </Tooltip>
            )}
            {entity.sellPrice !== undefined && (
              <Tooltip title="Preço de Venda">
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ 
                  backgroundColor: 'rgba(255, 152, 0, 0.05)', 
                  px: 0.5, 
                  borderRadius: 0.5,
                  border: '1px solid rgba(255, 152, 0, 0.1)'
                }}>
                  <Sell sx={{ fontSize: 12, color: 'warning.main' }} />
                  <ItemChip id="ouro" amount={entity.sellPrice} size="small" icon="/img/heartopia/stats/ouro.png" />
                </Stack>
              </Tooltip>
            )}
          </Stack>
        )}
        
        <Box sx={{ mt: 'auto' }}>
          <Tooltip title="ID da Entidade">
            <Chip 
              size="small" 
              label={entity.id} 
              sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                color: 'text.disabled', 
                fontSize: '0.6rem',
                fontFamily: 'monospace',
                borderRadius: 0.5,
                height: 20
              }} 
            />
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}
