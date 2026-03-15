import {
  Box,
  Typography,
  Chip,
  Stack,
  Tabs,
  Tab,
  Avatar,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { Storefront, Lock, Refresh } from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useMemo } from "react";
import { StyledContainer } from "./common/StyledContainer";
import { ShopItemCard } from "./shops/ShopItemCard";
import { ShopCard } from "./shops/ShopCard";
import type { ShopItem } from "../types/gameModels";
import { ListingDataView } from "./common/ListingDataView";
import { Tooltip } from "@mui/material";
import { ViewModeSelector } from "./common/ViewModeSelector";
import { useViewMode } from "../hooks/useViewMode";

export function ShopsPage() {
  const { gameId, category: urlShopId } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();

  const { loading: loadingApi, getShopDetails, raw } = useApi(gameId);
  const [viewMode, setViewMode] = useViewMode("shops");
  const [itemsViewMode, setItemsViewMode] = useViewMode("shop_items");

  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (raw?.items) raw.items.forEach((item) => map.set(item.id, item));
    return map;
  }, [raw?.items]);

  const entitiesMap = useMemo(() => {
    const map = new Map<string, any>();
    if (raw?.entities) raw.entities.forEach((entity) => map.set(entity.id, entity));
    return map;
  }, [raw?.entities]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (raw?.events) raw.events.forEach((event) => map.set(event.id, event));
    return map;
  }, [raw?.events]);

  const shops = raw?.shops || [];

  const currentIndex = useMemo(() => {
    if (!shops || !urlShopId) return -1;
    return shops.findIndex((s) => s.id === urlShopId);
  }, [shops, urlShopId]);

  const shopDetails = useMemo(() => (urlShopId ? getShopDetails(urlShopId) : null), [getShopDetails, urlShopId]);
  const currentShop = shopDetails?.shop;
  const currentNpc = shopDetails?.npc;

  if (loadingApi) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          width: "100%",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!shops || shops.length === 0) {
    return (
      <StyledContainer
        title={`Lojas de ${gameId}`}
        label="Visite os NPCs locais para comprar suprimentos e trocar recursos."
      >
        <Stack
          sx={{
            flex: 1,
            textAlign: "center",
            py: 8,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Storefront sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography variant="h5" color="text.secondary">
            Nenhuma loja cadastrada para este jogo.
          </Typography>
        </Stack>
      </StyledContainer>
    );
  }

  const isOverview = currentIndex === -1;

  return (
    <StyledContainer
      title={`Lojas de ${gameId}`}
      label="Visite os NPCs locais para comprar suprimentos e trocar recursos."
      sx={{ container: { overflowY: isOverview ? "auto" : "hidden" } }}
      actionsStart={
        !isOverview && (
          <Tabs
            value={currentIndex}
            onChange={(_, newValue) => {
              const shop = shops[newValue];
              navigate(`/game/${gameId}/shops/list/${shop.id}`);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.9rem",
                minWidth: 120,
                minHeight: 48,
                color: "text.secondary",
                "&.Mui-selected": { color: "primary.main" },
              },
              "& .MuiTabs-indicator": { backgroundColor: "primary.main" },
            }}
          >
            {shops.map((shop) => {
              const npc = entitiesMap.get(shop.npcId);
              return (
                <Tab
                  key={shop.id}
                  label={shop.name || npc?.name || shop.npcId}
                  icon={
                    npc?.icon ? (
                      <Avatar
                        src={npc.icon}
                        sx={{ width: 24, height: 24, mr: 1 }}
                      />
                    ) : (
                      <Storefront />
                    )
                  }
                  iconPosition="start"
                />
              );
            })}
          </Tabs>
        )
      }
      actionsEnd={
        isOverview ? (
          <ViewModeSelector mode={viewMode} onChange={setViewMode} />
        ) : (
          <ViewModeSelector mode={itemsViewMode} onChange={setItemsViewMode} />
        )
      }
    >
      {isOverview ? (
        <ListingDataView
          data={shops}
          viewMode={viewMode}
          cardMinWidth={300}
          emptyMessage="Nenhuma loja cadastrada para este jogo."
          renderCard={(shop) => (
            <ShopCard
              shop={shop}
              npc={entitiesMap.get(shop.npcId)}
              onClick={() => navigate(`/game/${gameId}/shops/list/${shop.id}`)}
            />
          )}
          renderListItem={(shop) => {
            const npc = entitiesMap.get(shop.npcId);
            return (
              <Box 
                onClick={() => navigate(`/game/${gameId}/shops/list/${shop.id}`)}
                sx={{ 
                  p: 1.5, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  cursor: 'pointer',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 0.5, backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {npc?.icon ? (
                      <img src={npc.icon} alt={shop.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                    ) : (
                      <Storefront sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.2)' }} />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>{shop.name || npc?.name || shop.npcId}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{shop.id}</Typography>
                  </Box>
                </Box>
                {shop.conditional && shop.conditional.length > 0 && (
                  <Chip 
                    label="Requisitos" 
                    size="small" 
                    color="warning" 
                    variant="outlined" 
                    icon={<Lock sx={{ fontSize: '0.7rem' }} />}
                    sx={{ height: 20, fontSize: '0.6rem' }} 
                  />
                )}
              </Box>
            );
          }}
          renderIconItem={(shop) => {
            const npc = entitiesMap.get(shop.npcId);
            return (
              <Tooltip title={`${shop.name || npc?.name || shop.npcId} (${shop.id})`}>
                <Box 
                  onClick={() => navigate(`/game/${gameId}/shops/list/${shop.id}`)}
                  sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1 }}
                >
                  {npc?.icon ? (
                    <img src={npc.icon} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Storefront sx={{ fontSize: 32, color: 'rgba(255, 255, 255, 0.2)' }} />
                  )}
                </Box>
              </Tooltip>
            );
          }}
        />
      ) : (
        currentShop && (
        <Stack direction="row" spacing={4} flex={1} overflow={"hidden"}>
          {/* NPC Info & Reset */}
          <Stack spacing={2}>
            <Card
              sx={{
                width: "300px",
                borderRadius: 2,
                overflow: "hidden",
                background: "rgba(255, 255, 255, 0.02)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <Box
                sx={{
                  height: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg, rgba(255, 68, 0, 0.05), rgba(255, 136, 0, 0.05))",
                  backgroundImage: `url(${currentNpc?.icon})`,
                  backgroundPosition: "top center",
                  backgroundSize: "cover",
                }}
              >
                {!currentNpc?.icon && (
                  <Storefront sx={{ fontSize: 80, color: "text.disabled" }} />
                )}
              </Box>
              <CardContent>
                <Typography
                  variant="h5"
                  align="center"
                  sx={{ fontWeight: 700, mb: 1 }}
                >
                  {currentShop.name || currentNpc?.name || currentShop.npcId}
                </Typography>

                {currentShop.conditional &&
                  currentShop.conditional.length > 0 && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: "rgba(255, 68, 0, 0.05)",
                        border: "1px dashed rgba(255, 68, 0, 0.2)",
                      }}
                    >
                      <Typography
                        variant="overline"
                        sx={{
                          color: "#ffbb00",
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          mb: 1,
                        }}
                      >
                        <Lock sx={{ fontSize: "1rem" }} /> REQUISITOS
                      </Typography>
                      {currentShop.conditional.map((cond, i) => {
                        const eventName =
                          cond.type === "event"
                            ? eventsMap.get(cond.id)?.name
                            : null;
                        return (
                          <Typography
                            key={i}
                            variant="body2"
                            sx={{ fontSize: "0.85rem" }}
                          >
                            •{" "}
                            {eventName
                              ? `Evento: ${eventName}`
                              : cond.description}
                            {eventName &&
                              cond.description &&
                              ` (${cond.description})`}
                          </Typography>
                        );
                      })}
                    </Box>
                  )}
              </CardContent>
            </Card>
          </Stack>

          {/* Groups and Items List */}
          <Stack flex={1} sx={{ overflowY: "auto", pr: 1 }}>
            {currentShop.groups.map((group, idx) => (
              <Box key={`group-${idx}`} sx={{ mb: 4 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {group.name}
                  </Typography>
                  {group.resetType && (
                    <Chip
                      size="small"
                      icon={<Refresh sx={{ fontSize: "0.9rem" }} />}
                      label={group.resetType === 'diario' ? 'Diário' : group.resetType === 'semanal' ? 'Semanal' : 'Único'}
                      sx={{ 
                        backgroundColor: 'rgba(255, 68, 0, 0.08)', 
                        color: '#ff4400',
                        height: 24,
                        '& .MuiChip-label': { px: 1, fontWeight: 700, fontSize: '0.7rem' }
                      }}
                    />
                  )}
                  <Box sx={{ flexGrow: 1, height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />
                </Stack>
                <ListingDataView
                  data={group.items}
                  viewMode={itemsViewMode}
                  cardMinWidth={300}
                  renderCard={(shopItem: ShopItem) => (
                    <ShopItemCard
                      shopItem={shopItem}
                      baseItem={itemsMap.get(shopItem.id)}
                      baseEntity={entitiesMap.get(shopItem.id)}
                      currencyItem={itemsMap.get(shopItem.currency || "ouro")}
                      eventsMap={eventsMap}
                      itemsMap={itemsMap}
                      entitiesMap={entitiesMap}
                    />
                  )}
                  renderListItem={(shopItem: ShopItem) => {
                    const baseItem = itemsMap.get(shopItem.id);
                    const baseEntity = entitiesMap.get(shopItem.id);
                    const currencyItem = itemsMap.get(shopItem.currency || "ouro");
                    const target = baseItem || baseEntity;
                    
                    return (
                      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: 0.5, backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img src={target?.icon} alt={target?.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                          </Box>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>{target?.name}</Typography>
                            {shopItem.amount && shopItem.amount > 1 && (
                              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>x{shopItem.amount}</Typography>
                            )}
                          </Box>
                        </Box>
                        <Stack direction="row" spacing={2} alignItems="center">
                          {shopItem.price !== undefined && (
                            <Box sx={{ 
                              px: 1.5, py: 0.5, 
                              borderRadius: 1, 
                              backgroundColor: 'rgba(255,255,255,0.03)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#ffbb00' }}>
                                {shopItem.price.toLocaleString()}
                              </Typography>
                              {currencyItem?.icon && (
                                <img src={currencyItem.icon} alt={currencyItem.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                              )}
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    );
                  }}
                  renderIconItem={(shopItem: ShopItem) => {
                    const baseItem = itemsMap.get(shopItem.id);
                    const baseEntity = entitiesMap.get(shopItem.id);
                    const target = baseItem || baseEntity;
                    return (
                      <Tooltip title={`${target?.name} - ${shopItem.price} ${shopItem.currency || 'ouro'}`}>
                        <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1 }}>
                          <img src={target?.icon} alt={target?.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </Box>
                      </Tooltip>
                    );
                  }}
                />
              </Box>
            ))}
          </Stack>
        </Stack>
        )
      )}
    </StyledContainer>
  );
}
