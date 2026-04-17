import { getPublicUrl } from "../../utils/pathUtils";
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
import { Storefront, Lock, Refresh, Inventory, Map as MapIcon } from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { useMemo, useState, useEffect } from "react";
import { StyledContainer } from "../common/StyledContainer";
import { ShopItemCard } from "./ShopItemCard";
import { ShopCard } from "./ShopCard";
import type { ShopItem, Shop, Entity, Item, GameEvent, ReferencePoints, MapMetadata } from "../../types/gameModels";
import type { ShopDetails } from "../../types/apiModels";
import { ListingDataView } from "../common/ListingDataView";
import { Tooltip } from "@mui/material";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { useViewMode } from "../../hooks/useViewMode";
import { MiniMap } from "../common/MiniMap";
import { parseWKTPoint } from "../../utils/wkt";
import { shopRepository } from "../../repositories/ShopRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { eventRepository } from "../../repositories/EventRepository";
import { referencePointRepository } from "../../repositories/ReferencePointRepository";
import { mapRepository } from "../../repositories/MapRepository";
import { usePlatform } from "../../hooks/usePlatform";

export function ShopsPage() {
  const { gameId, category: urlShopId } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();
  const { isMobile } = usePlatform();
  const { loading: dbLoading, getShopDetails } = useApi(gameId);
  const [shops, setShops] = useState<Shop[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [referencePoints, setReferencePoints] = useState<ReferencePoints[]>([]);
  const [maps, setMaps] = useState<MapMetadata[]>([]);
  
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [viewMode, setViewMode] = useViewMode("shops");
  const [itemsViewMode, setItemsViewMode] = useViewMode("shop_items");

  // Fetch all data for mappings and filtering
  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    const promises: Promise<any>[] = [
      shopRepository.getAll(),
      itemRepository.getAll(),
      entityRepository.getAll(),
      eventRepository.getAll(),
      referencePointRepository.getAll(),
      mapRepository.getAll()
    ];

    if (urlShopId) {
      promises.push(getShopDetails(urlShopId));
    }

    Promise.all(promises).then(([allShops, allItems, allEntities, allEvents, allRefPoints, allMaps, details]) => {
      if (!isMounted) return;
      
      setShops(allShops);
      setItems(allItems);
      setEntities(allEntities);
      setEvents(allEvents);
      setReferencePoints(allRefPoints);
      setMaps(allMaps);
      
      if (details) {
        setShopDetails(details);
      } else {
        setShopDetails(null);
      }
      
      setDataLoading(false);
    }).catch(err => {
      console.error("Error fetching shops data:", err);
      if (isMounted) setDataLoading(false);
    });

    return () => { isMounted = false; };
  }, [dbLoading, getShopDetails, urlShopId]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const entitiesMap = useMemo(() => {
    const map = new Map<string, any>();
    entities.forEach((entity) => map.set(entity.id, entity));
    return map;
  }, [entities]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, any>();
    events.forEach((event) => map.set(event.id, event));
    return map;
  }, [events]);

  const currentIndex = useMemo(() => {
    if (!shops || !urlShopId) return -1;
    return shops.findIndex((s) => s.id === urlShopId);
  }, [shops, urlShopId]);

  const currentShop = shopDetails?.shop;
  const currentNpc = shopDetails?.npc;

  const npcLocation = useMemo(() => {
    if (!currentNpc || !referencePoints) return null;
    return referencePoints.find((s: any) => s.entityId === currentNpc.id);
  }, [currentNpc, referencePoints]);

  const mapMetadata = useMemo(() => {
    if (!npcLocation || !maps) return null;
    return maps.find((m: any) => m.id === npcLocation.mapId) || maps[0];
  }, [npcLocation, maps]);

  if (dbLoading || dataLoading) {
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
                        src={getPublicUrl(npc.icon)}
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
          variant="compact"
          cardMinWidth={200}
          listHeader={[
            { label: "Loja / NPC", width: "60%" },
            { label: "ID", width: "20%", hidden: isMobile },
            { label: "Status", align: "right" as const, width: "20%" },
          ]}
          emptyMessage="Nenhuma loja cadastrada para este jogo."
          renderCard={(shop, variant) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              npc={entitiesMap.get(shop.npcId)}
              onClick={() => navigate(`/game/${gameId}/shops/list/${shop.id}`)}
              variant={variant}
            />
          )}
          renderListItem={(shop) => {
            const npc = entitiesMap.get(shop.npcId);
            return [
              <Box
                key={`shop_list_${shop.id}`}
                onClick={() => navigate(`/game/${gameId}/shops/list/${shop.id}`)}
                sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}
              >
                <Box sx={{ width: 32, height: 32, borderRadius: 0.5, backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                  {npc?.icon ? (
                    <img src={getPublicUrl(npc.icon)} alt={shop.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                  ) : (
                    <Inventory sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.2)' }} />
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{shop.name}</Typography>
              </Box>,
              <Typography key={`shop_id_${shop.id}`} variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>{shop.id}</Typography>,
              <Box key={`shop_status_${shop.id}`} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Chip label="Ativa" size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
              </Box>
            ];
          }}
          renderIconItem={(shop) => {
            const npc = entitiesMap.get(shop.npcId);
            return (
              <Tooltip key={`shop_icon_${shop.id}`} title={`${shop.name || npc?.name || shop.npcId} (${shop.id})`}>
                <Box 
                  onClick={() => navigate(`/game/${gameId}/shops/list/${shop.id}`)}
                  sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1 }}
                >
                  {npc?.icon ? (
                    <img src={getPublicUrl(npc.icon)} alt={shop.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
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
          <Stack spacing={2} sx={{ width: "300px", flexShrink: 0 }}>
            <Card
              sx={{
                width: "100%",
                borderRadius: 2,
                overflow: "hidden",
                background: "rgba(255, 255, 255, 0.02)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
                <Box
                  onClick={() => currentNpc?.id && navigate(`/game/${gameId}/entity/view/${currentNpc.id}`)}
                  sx={{
                    height: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    "&:hover .view-npc-overlay": {
                      opacity: 1,
                    },
                    background:
                      "linear-gradient(135deg, rgba(255, 68, 0, 0.05), rgba(255, 136, 0, 0.05))",
                    backgroundImage: `url(${getPublicUrl(currentNpc?.icon)})`,
                    backgroundPosition: "top center",
                    backgroundSize: "cover",
                  }}
                >
                  {!currentNpc?.icon && (
                    <Storefront sx={{ fontSize: 80, color: "text.disabled" }} />
                  )}
                  <Box
                    className="view-npc-overlay"
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      bgcolor: "rgba(0,0,0,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity 0.2s",
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    <Typography variant="button" sx={{ color: "white", fontWeight: 700 }}>
                      Ver Perfil
                    </Typography>
                  </Box>
                </Box>
              <CardContent>
                <Typography
                  variant="h5"
                  align="center"
                  onClick={() => currentNpc?.id && navigate(`/game/${gameId}/entity/view/${currentNpc.id}`)}
                  sx={{ 
                    fontWeight: 700, 
                    mb: 1, 
                    cursor: 'pointer',
                    '&:hover': { color: 'primary.main' }
                  }}
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

            {/* Map Location Card */}
            {mapMetadata && npcLocation && (
              <Card
                sx={{
                  width: "100%",
                  borderRadius: 2,
                  overflow: "hidden",
                  background: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <Box sx={{ p: 1.5, pb: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MapIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                  <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                    Localização {mapMetadata.name && `- ${mapMetadata.name}`}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, height: 200 }}>
                  <MiniMap 
                    meta={mapMetadata} 
                    markers={[{ 
                      id: 'npc-location', 
                      position: (() => {
                        if (npcLocation.geom?.type === 'Point' && npcLocation.geom.coordinates) {
                          const wktCoords = parseWKTPoint(npcLocation.geom.coordinates);
                          // GeoJSON is [lng, lat], Leaflet wants [lat, lng]
                          return [wktCoords[1], wktCoords[0]];
                        }
                        return [0, 0];
                      })(),
                      color: '#ff4400'
                    }]}
                    height="100%"
                  />
                </Box>
              </Card>
            )}
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
                  variant="compact"
                  cardMinWidth={200}
                  listHeader={[
                    { label: "Item", width: "60%" },
                    { label: "Preço", align: "right" as const, width: "20%" },
                    { label: "Limite / Qtd", align: "right" as const, width: "20%" },
                  ]}
                  renderCard={(shopItem: ShopItem, variant) => (
                    <ShopItemCard
                      key={shopItem.id}
                      shopItem={shopItem}
                      baseItem={itemsMap.get(shopItem.id)}
                      baseEntity={entitiesMap.get(shopItem.id)}
                      currencyItem={itemsMap.get(shopItem.currency || "ouro")}
                      eventsMap={eventsMap}
                      itemsMap={itemsMap}
                      entitiesMap={entitiesMap}
                      variant={variant}
                    />
                  )}
                  renderListItem={(shopItem: ShopItem) => {
                    const baseItem = itemsMap.get(shopItem.id);
                    const baseEntity = entitiesMap.get(shopItem.id);
                    const currencyItem = itemsMap.get(shopItem.currency || "ouro");
                    const target = baseItem || baseEntity;
                    const displayPrice = shopItem.price ?? (baseItem?.buyPrice || baseItem?.sellPrice);
                    
                    return [
                      <Box key={`shop_item_list_${shopItem.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: 0.5, backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                          <img src={getPublicUrl(target?.icon)} alt={target?.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{target?.name}</Typography>
                      </Box>,

                      <Box key={`shop_item_price_${shopItem.id}`} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {displayPrice !== undefined && (
                          <Box sx={{ 
                            px: 1, py: 0.25, 
                            borderRadius: 1, 
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#ffbb00', fontSize: '0.8rem' }}>
                              {displayPrice.toLocaleString()}
                            </Typography>
                            {currencyItem?.icon && (
                              <img src={getPublicUrl(currencyItem.icon)} alt={currencyItem.name} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                            )}
                          </Box>
                        )}
                      </Box>,

                      <Box key={`shop_item_limit_${shopItem.id}`} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                        {shopItem.amount && (
                          <Chip 
                            label={`x${shopItem.amount}`} 
                            size="small" 
                            variant="outlined"
                            sx={{ 
                              height: 18, 
                              fontSize: '0.65rem', 
                              fontWeight: 800,
                              borderColor: 'rgba(255,255,255,0.1)',
                              color: 'text.secondary'
                            }} 
                          />
                        )}
                      </Box>
                    ];
                  }}
                  renderIconItem={(shopItem: ShopItem) => {
                    const baseItem = itemsMap.get(shopItem.id);
                    const baseEntity = entitiesMap.get(shopItem.id);
                    const target = baseItem || baseEntity;
                    const currencyItem = itemsMap.get(shopItem.currency || "ouro");
                    const displayPrice = shopItem.price ?? (baseItem?.buyPrice || baseItem?.sellPrice);
                    
                    return (
                      <Tooltip key={`shop_item_icon_${shopItem.id}`} title={`${target?.name} - ${displayPrice} ${currencyItem?.name || 'ouro'}`}>
                        <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1, position: 'relative' }}>
                          <img src={getPublicUrl(target?.icon)} alt={target?.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          
                          {/* Top-Right: Purchase Limit / Quantity */}
                          {shopItem.amount && (
                            <Box sx={{ 
                              position: 'absolute', 
                              top: 2, 
                              right: 2, 
                              backgroundColor: 'rgba(0,0,0,0.6)', 
                              backdropFilter: 'blur(2px)',
                              borderRadius: '4px',
                              px: 0.5,
                              py: 0.1,
                              border: '1px solid rgba(255,255,255,0.1)',
                              zIndex: 1
                            }}>
                              <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: '#fff' }}>
                                x{shopItem.amount}
                              </Typography>
                            </Box>
                          )}

                          {/* Bottom-Center: Price */}
                          {displayPrice !== undefined && (
                            <Box sx={{ 
                              position: 'absolute', 
                              bottom: 0, 
                              left: '50%', 
                              transform: 'translateX(-50%)',
                              backgroundColor: 'rgba(0,0,0,0.7)', 
                              backdropFilter: 'blur(4px)',
                              borderRadius: '10px',
                              px: 1,
                              py: 0.2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              whiteSpace: 'nowrap',
                              border: '1px solid rgba(255,255,255,0.1)',
                              zIndex: 1
                            }}>
                              <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#ffbb00' }}>
                                {displayPrice >= 1000 ? `${(displayPrice / 1000).toFixed(1)}k` : displayPrice}
                              </Typography>
                              {currencyItem?.icon && (
                                <img src={getPublicUrl(currencyItem.icon)} alt={currencyItem.name} style={{ width: 10, height: 10, objectFit: 'contain' }} />
                              )}
                            </Box>
                          )}
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
