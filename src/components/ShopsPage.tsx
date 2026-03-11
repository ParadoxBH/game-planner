import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
  Tabs,
  Tab,
  Avatar,
  Tooltip
} from "@mui/material";
import { 
  Storefront,
  AccessTime,
  Refresh,
  Lock,
  Payments,
  SwapHoriz
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useGameData } from "../hooks/useGameData";
import { useState, useMemo } from "react";

interface ShopCondition {
  type: string;
  id: string;
  description: string;
}

interface ShopExchange {
  id: string;
  amount: number;
}

interface ShopItem {
  id: string;
  amount?: number;
  price?: number;
  currency?: string;
  exchange?: ShopExchange[];
  conditions?: ShopCondition[];
}

interface GameShop {
  id: string;
  npcId: string;
  resetType?: string;
  resetTime?: string;
  conditions?: ShopCondition[];
  items: ShopItem[];
}

interface GameItem {
  id: string;
  name: string;
  icon?: string;
  sellPrice?: number;
  buyPrice?: number;
}

interface GameEntity {
  id: string;
  name: string;
  icon?: string;
}

export function ShopsPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: shops, loading: loadingShops } = useGameData<GameShop[]>(gameId, "shops");
  const { data: items } = useGameData<GameItem[]>(gameId, "items");
  const { data: entities } = useGameData<GameEntity[]>(gameId, "entity");
  const [selectedShopIndex, setSelectedShopIndex] = useState(0);

  const itemsMap = useMemo(() => {
    const map = new Map<string, GameItem>();
    if (items) items.forEach(item => map.set(item.id, item));
    return map;
  }, [items]);

  const entitiesMap = useMemo(() => {
    const map = new Map<string, GameEntity>();
    if (entities) entities.forEach(entity => map.set(entity.id, entity));
    return map;
  }, [entities]);

  const currentShop = shops?.[selectedShopIndex];
  const currentNpc = currentShop ? entitiesMap.get(currentShop.npcId) : null;

  if (loadingShops) {
    return <Box sx={{ p: 4, textAlign: 'center' }}>Carregando lojas...</Box>;
  }

  if (!shops || shops.length === 0) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <Storefront sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" color="text.secondary">Nenhuma loja cadastrada para este jogo.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box>
          <Typography variant="h4" sx={{ 
            fontWeight: 800, 
            background: 'linear-gradient(45deg, #ff4400, #ff8800)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}>
            Lojas de {gameId}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Visite os NPCs locais para comprar suprimentos e trocar recursos.
          </Typography>
        </Box>

        {/* Shop Selector */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={selectedShopIndex} 
            onChange={(_, newValue) => setSelectedShopIndex(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                minWidth: 120,
              }
            }}
          >
            {shops.map((shop) => {
              const npc = entitiesMap.get(shop.npcId);
              return (
                <Tab 
                  key={shop.id} 
                  label={npc?.name || shop.npcId} 
                  icon={npc?.icon ? <Avatar src={npc.icon} sx={{ width: 24, height: 24, mr: 1 }} /> : <Storefront />}
                  iconPosition="start"
                />
              );
            })}
          </Tabs>
        </Box>

        {currentShop && (
          <Grid container spacing={4}>
            {/* NPC Info & Reset */}
            <Grid size={{ xs: 12, md: 4, lg: 3 }}>
              <Stack spacing={3}>
                <Card sx={{ 
                  borderRadius: 2, 
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <Box sx={{ 
                    height: 200, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(255, 68, 0, 0.1), rgba(255, 136, 0, 0.1))'
                  }}>
                    {currentNpc?.icon ? (
                      <img src={currentNpc.icon} alt={currentNpc.name} style={{ width: 120, height: 120, objectFit: 'contain' }} />
                    ) : (
                      <Storefront sx={{ fontSize: 80, color: 'text.disabled' }} />
                    )}
                  </Box>
                  <CardContent>
                    <Typography variant="h5" align="center" sx={{ fontWeight: 700, mb: 1 }}>
                      {currentNpc?.name || currentShop.npcId}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                      {currentShop.resetType && (
                        <Chip 
                          size="small" 
                          icon={<Refresh sx={{ fontSize: '1rem' }} />} 
                          label={`Reseta: ${currentShop.resetType}`} 
                          sx={{ backgroundColor: 'rgba(255, 68, 0, 0.1)', color: '#ff4400' }}
                        />
                      )}
                      {currentShop.resetTime && (
                        <Chip 
                          size="small" 
                          icon={<AccessTime sx={{ fontSize: '1rem' }} />} 
                          label={currentShop.resetTime} 
                          sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                        />
                      )}
                    </Stack>

                    {currentShop.conditions && currentShop.conditions.length > 0 && (
                      <Box sx={{ 
                        mt: 2, 
                        p: 2, 
                        borderRadius: 2, 
                        backgroundColor: 'rgba(255, 68, 0, 0.05)', 
                        border: '1px dashed rgba(255, 68, 0, 0.2)' 
                      }}>
                        <Typography variant="overline" sx={{ color: '#ffbb00', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                          <Lock sx={{ fontSize: '1rem' }} /> REQUISITOS
                        </Typography>
                        {currentShop.conditions.map((cond, i) => (
                          <Typography key={i} variant="body2" sx={{ fontSize: '0.85rem' }}>
                            • {cond.description}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            </Grid>

            {/* Items List */}
            <Grid size={{ xs: 12, md: 8, lg: 9 }}>
              <Grid container spacing={2}>
                {currentShop.items.map((shopItem, idx) => {
                  const baseItem = itemsMap.get(shopItem.id);
                  const price = shopItem.price ?? baseItem?.buyPrice ?? baseItem?.sellPrice ?? '???';
                  const currency = shopItem.currency || 'ouro';
                  const currencyItem = itemsMap.get(currency);

                  return (
                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={idx}>
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
                            zIndex: 1,
                            background: 'rgba(0,0,0,0.6)',
                            borderRadius: 1,
                            p: 0.5,
                            display: 'flex'
                          }}>
                            <Tooltip title={shopItem.conditions.map(c => c.description).join(", ")}>
                              <Lock sx={{ color: '#ffbb00', fontSize: '1.2rem' }} />
                            </Tooltip>
                          </Box>
                        )}
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ 
                              width: 56, 
                              height: 56, 
                              borderRadius: 1.5, 
                              backgroundColor: 'rgba(0,0,0,0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              p: 1
                            }}>
                              {baseItem?.icon ? (
                                <img src={baseItem.icon} alt={baseItem.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              ) : (
                                <Storefront sx={{ color: 'text.disabled' }} />
                              )}
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                {baseItem?.name || shopItem.id}
                              </Typography>
                              {shopItem.amount && (
                                <Typography variant="caption" color="text.secondary">
                                  Qtd: {shopItem.amount}
                                </Typography>
                              )}
                            </Box>
                          </Stack>

                          <Box sx={{ mt: 2 }}>
                            {shopItem.exchange ? (
                              <Stack spacing={0.5}>
                                <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <SwapHoriz sx={{ fontSize: '1rem' }} /> TROCAR POR:
                                </Typography>
                                {shopItem.exchange.map((ex, i) => {
                                  const exItem = itemsMap.get(ex.id);
                                  return (
                                    <Stack key={i} direction="row" alignItems="center" spacing={1} sx={{ p: 0.5, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
                                      {exItem?.icon && <img src={exItem.icon} alt="" style={{ width: 16, height: 16 }} />}
                                      <Typography variant="caption">{exItem?.name || ex.id}</Typography>
                                      <Typography variant="caption" sx={{ ml: 'auto', fontWeight: 600 }}>x{ex.amount}</Typography>
                                    </Stack>
                                  );
                                })}
                              </Stack>
                            ) : (
                              <Stack direction="row" alignItems="center" spacing={1} sx={{ 
                                mt: 1, 
                                p: 1, 
                                borderRadius: 1.5, 
                                backgroundColor: 'rgba(255, 68, 0, 0.05)',
                                color: 'primary.main'
                              }}>
                                <Payments sx={{ fontSize: '1.2rem' }} />
                                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{price}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {currencyItem?.name || currency}
                                </Typography>
                                {currencyItem?.icon && <img src={currencyItem.icon} alt="" style={{ width: 20, height: 20, marginLeft: 'auto' }} />}
                              </Stack>
                            )}
                          </Box>

                          {shopItem.conditions && shopItem.conditions.length > 0 && (
                            <Box sx={{ mt: 1.5, p: 1, borderRadius: 1, backgroundColor: 'rgba(255, 187, 0, 0.05)', border: '1px dashed rgba(255, 187, 0, 0.2)' }}>
                              {shopItem.conditions.map((c, i) => (
                                <Typography key={i} variant="caption" sx={{ color: '#ffbb00', display: 'block', fontSize: '0.75rem' }}>
                                  • {c.description}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
