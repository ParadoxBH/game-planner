import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Stack,
  Divider,
  CardActionArea
} from "@mui/material";
import { 
  Storefront, 
  Payments, 
  SwapHoriz, 
  ChevronRight,
  Refresh
} from "@mui/icons-material";
import { ItemChip } from "../common/ItemChip";
import type { ShopItem } from "../../types/gameModels";

interface ItemShopCardProps {
  shop: {
    id: string;
    name?: string;
  };
  shopItem: ShopItem;
  npc?: {
    name: string;
    icon?: string;
  };
  currencyItem?: { name: string; icon?: string };
  itemsMap: Map<string, { name: string; icon?: string; buyPrice?: number; sellPrice?: number; level?: number }>;
  entitiesMap: Map<string, { name: string; icon?: string; buyPrice?: number; sellPrice?: number; level?: number }>;
  eventsMap: Map<string, { name: string }>;
  onClick: () => void;
}

export function ItemShopCard({ 
  shop, 
  shopItem, 
  npc, 
  currencyItem, 
  itemsMap, 
  entitiesMap, 
  eventsMap,
  onClick 
}: ItemShopCardProps) {
  const isEntity = shopItem.type === 'entity';
  const baseData = isEntity ? entitiesMap.get(shopItem.id) : itemsMap.get(shopItem.id);
  
  const currency = shopItem.currency || 'ouro';
  const price = shopItem.price ?? 
                (baseData?.buyPrice ?? baseData?.sellPrice) ?? 
                '???';

  return (
    <Card sx={{ 
      borderRadius: 2, 
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      height: '100%',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        transform: 'translateY(-4px)',
        borderColor: 'primary.main',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }
    }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2 }}>
          {/* Shop Header */}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Box sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: '50%', 
              backgroundColor: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }}>
              {npc?.icon ? (
                <img src={npc.icon} alt={npc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Storefront sx={{ fontSize: 24, color: 'text.disabled' }} />
              )}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {shop.name || npc?.name || shop.id}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                NPC: {npc?.name || "Desconhecido"}
              </Typography>
            </Box>
            <ChevronRight sx={{ fontSize: 20, color: 'text.disabled' }} />
          </Stack>

          <Divider sx={{ mb: 2, opacity: 0.1 }} />

          {/* Pricing / Exchange Info */}
          <Stack direction={"row"} justifyContent={"space-between"} alignItems={"Start"}>
            {shopItem.exchange ? (
              <Stack spacing={1}>
                <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <SwapHoriz sx={{ fontSize: '0.9rem' }} /> Requisito:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {shopItem.exchange.map((ex, i) => {
                    const exData = ex.type === 'entity' ? entitiesMap.get(ex.id) : itemsMap.get(ex.id);
                    return (
                      <ItemChip 
                        key={i}
                        id={ex.id}
                        name={exData?.name}
                        icon={exData?.icon}
                        amount={ex.amount}
                        level={exData?.level}
                        size="small"
                        type={ex.type || 'item'}
                      />
                    );
                  })}
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={0.5}>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <Payments sx={{ fontSize: '0.9rem' }} /> Preço:
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{price}</Typography>
                </Stack>
              </Stack>
            )}

            {/* Stock / Limit Information */}
            {shopItem.amount !== undefined && (
              <Stack alignItems={"center"} spacing={0.5}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Limite
                </Typography>
                 <Box sx={{ 
                   px: 1, 
                   py: 0.2, 
                   borderRadius: 1, 
                   bgcolor: 'rgba(255,255,255,0.05)', 
                   border: '1px solid rgba(255,255,255,0.1)' 
                 }}>
                   <Typography variant="caption" sx={{ fontWeight: 800 }}>
                     {shopItem.amount}x
                   </Typography>
                 </Box>
                 {shopItem.resetType && (
                   <Box sx={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     gap: 0.5, 
                     bgcolor: 'rgba(255, 68, 0, 0.08)', 
                     color: '#ff4400', 
                     px: 1, 
                     py: 0.2, 
                     borderRadius: 1,
                     border: '1px solid rgba(255, 68, 0, 0.2)'
                   }}>
                     <Refresh sx={{ fontSize: '0.8rem' }} />
                     <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                       {shopItem.resetType === 'diario' ? 'Diário' : shopItem.resetType === 'semanal' ? 'Semanal' : 'Único'}
                     </Typography>
                   </Box>
                 )}
              </Stack>
            )}
          </Stack>

          {/* Conditions */}
          {shopItem.conditions && shopItem.conditions.length > 0 && (
            <Box sx={{ mt: 1.5, p: 1, borderRadius: 1.5, backgroundColor: 'rgba(255, 187, 0, 0.05)', border: '1px dashed rgba(255, 187, 0, 0.2)' }}>
              {shopItem.conditions.map((c, i) => {
                const eventName = c.type === 'event' ? eventsMap.get(c.id)?.name : null;
                return (
                  <Typography key={i} variant="caption" sx={{ color: '#ffbb00', display: 'block', fontSize: '0.7rem', fontWeight: 600 }}>
                    • {eventName ? `Evento: ${eventName}` : c.description}
                  </Typography>
                );
              })}
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
