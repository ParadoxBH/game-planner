import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Stack,
  Tooltip
} from "@mui/material";
import { 
  Lock,
  Payments,
  SwapHoriz
} from "@mui/icons-material";
import { ItemChip } from "../common/ItemChip";

export interface ShopCondition {
  type: string;
  id: string;
  description: string;
}

export interface ShopExchange {
  id: string;
  amount: number;
}

export interface ShopItem {
  id: string;
  amount?: number;
  price?: number;
  currency?: string;
  exchange?: ShopExchange[];
  conditions?: ShopCondition[];
}

interface ShopItemCardProps {
  shopItem: ShopItem;
  baseItem?: { name: string; icon?: string; buyPrice?: number; sellPrice?: number };
  currencyItem?: { name: string; icon?: string };
  eventsMap: Map<string, { name: string }>;
  itemsMap: Map<string, { name: string; icon?: string }>;
}

export function ShopItemCard({ 
  shopItem, 
  baseItem, 
  currencyItem, 
  eventsMap, 
  itemsMap 
}: ShopItemCardProps) {
  const price = shopItem.price ?? baseItem?.buyPrice ?? baseItem?.sellPrice ?? '???';
  const currency = shopItem.currency || 'ouro';

  return (
    <Card sx={{ 
      height: '100%',
      borderRadius: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.03)',
      transition: 'transform 0.2s, background-color 0.2s',
      position: 'relative',
      '&:hover': {
        transform: 'translateY(-4px)',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderColor: 'rgba(255, 68, 0, 0.2)'
      }
    }}>
      {shopItem.conditions && shopItem.conditions.length > 0 && (
        <Box sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          zIndex: 2,
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 1,
          p: 0.5,
          display: 'flex'
        }}>
          <Tooltip title={shopItem.conditions.map(c => {
            const eventName = c.type === 'event' ? eventsMap.get(c.id)?.name : null;
            return eventName ? `Evento: ${eventName}${c.description ? ` (${c.description})` : ''}` : c.description;
          }).join(", ")}>
            <Lock sx={{ color: '#ffbb00', fontSize: '1.2rem' }} />
          </Tooltip>
        </Box>
      )}
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <ItemChip 
            id={shopItem.id}
            name={baseItem?.name}
            icon={baseItem?.icon}
            amount={shopItem.amount}
            isProduct={true}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {baseItem?.name || shopItem.id}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 2 }}>
          {shopItem.exchange ? (
            <Stack spacing={1}>
              <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SwapHoriz sx={{ fontSize: '1rem' }} /> TROCAR POR:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {shopItem.exchange.map((ex, i) => {
                  const exItem = itemsMap.get(ex.id);
                  return (
                    <ItemChip 
                      key={i}
                      id={ex.id}
                      name={exItem?.name}
                      icon={exItem?.icon}
                      amount={ex.amount}
                      size="medium"
                    />
                  );
                })}
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={0.5}>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Payments sx={{ fontSize: '1rem' }} /> VALOR:
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ 
                p: 0.5, 
                pr: 1.5,
                borderRadius: 2, 
                backgroundColor: 'rgba(255, 68, 0, 0.05)',
                color: 'primary.main',
                width: 'fit-content'
              }}>
                <ItemChip 
                  id={currency}
                  name={currencyItem?.name}
                  icon={currencyItem?.icon}
                  size="small"
                />
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{price}</Typography>
              </Stack>
            </Stack>
          )}
        </Box>

        {shopItem.conditions && shopItem.conditions.length > 0 && (
          <Box sx={{ mt: 1.5, p: 1, borderRadius: 1, backgroundColor: 'rgba(255, 187, 0, 0.05)', border: '1px dashed rgba(255, 187, 0, 0.2)' }}>
            {shopItem.conditions.map((c, i) => {
              const eventName = c.type === 'event' ? eventsMap.get(c.id)?.name : null;
              return (
                <Typography key={i} variant="caption" sx={{ color: '#ffbb00', display: 'block', fontSize: '0.75rem' }}>
                  • {eventName ? `Evento: ${eventName}` : c.description}
                  {eventName && c.description && ` (${c.description})`}
                </Typography>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
