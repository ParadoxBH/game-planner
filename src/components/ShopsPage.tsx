import {
  Box,
  Typography,
  Grid,
  Chip,
  Stack,
  Tabs,
  Tab,
  Avatar,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { Storefront, AccessTime, Lock, Refresh } from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useGameData } from "../hooks/useGameData";
import { useMemo } from "react";
import { StyledContainer } from "./common/StyledContainer";
import { useTheme } from "@mui/material";
import {
  ShopItemCard,
  type ShopItem,
  type ShopCondition,
  type ShopGroup
} from "./shops/ShopItemCard";
import { ShopCard } from "./shops/ShopCard";

interface GameShop {
  id: string;
  name?: string;
  npcId: string;
  resetTime?: string;
  conditions?: ShopCondition[];
  groups: ShopGroup[];
}

interface GameItem {
  id: string;
  name: string;
  category?: string | string[];
  icon?: string;
  sellPrice?: number;
  buyPrice?: number;
}

interface GameEntity {
  id: string;
  name: string;
  category?: string | string[];
  icon?: string;
  buyPrice?: number;
  sellPrice?: number;
}

interface GameEvent {
  id: string;
  name: string;
}


export function ShopsPage() {
  const { gameId, category: urlShopId } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();

  const { data: shops, loading: loadingShops } = useGameData<GameShop[]>(
    gameId,
    "shops",
  );
  const { data: items } = useGameData<GameItem[]>(gameId, "items");
  const { data: entities } = useGameData<GameEntity[]>(gameId, "entity");
  const { data: events } = useGameData<GameEvent[]>(gameId, "events");

  const itemsMap = useMemo(() => {
    const map = new Map<string, GameItem>();
    if (items) items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const entitiesMap = useMemo(() => {
    const map = new Map<string, GameEntity>();
    if (entities) entities.forEach((entity) => map.set(entity.id, entity));
    return map;
  }, [entities]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, GameEvent>();
    if (events) events.forEach((event) => map.set(event.id, event));
    return map;
  }, [events]);

  const currentIndex = useMemo(() => {
    if (!shops || !urlShopId) return -1;
    return shops.findIndex((s) => s.id === urlShopId);
  }, [shops, urlShopId]);

  const currentShop = shops?.[currentIndex];
  const currentNpc = currentShop ? entitiesMap.get(currentShop.npcId) : null;

  if (loadingShops) {
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

  const theme = useTheme();
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
    >
      {isOverview ? (
        <Grid container spacing={3}>
          {shops.map((shop) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={shop.id}>
              <ShopCard
                shop={shop}
                npc={entitiesMap.get(shop.npcId)}
                onClick={() => navigate(`/game/${gameId}/shops/list/${shop.id}`)}
              />
            </Grid>
          ))}
        </Grid>
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

                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="center"
                  sx={{ mb: 2 }}
                >
                  {currentShop.resetTime && (
                    <Chip
                      size="small"
                      icon={<AccessTime sx={{ fontSize: "1rem" }} />}
                      label={currentShop.resetTime}
                      sx={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                    />
                  )}
                </Stack>

                {currentShop.conditions &&
                  currentShop.conditions.length > 0 && (
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
                      {currentShop.conditions.map((cond, i) => {
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
                <Grid container spacing={2}>
                  {group.items.map((shopItem: ShopItem, itemIdx: number) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={`group-item-${itemIdx}`}>
                      <ShopItemCard
                        shopItem={shopItem}
                        baseItem={itemsMap.get(shopItem.id)}
                        baseEntity={entitiesMap.get(shopItem.id)}
                        currencyItem={itemsMap.get(shopItem.currency || "ouro")}
                        eventsMap={eventsMap}
                        itemsMap={itemsMap}
                        entitiesMap={entitiesMap}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </Stack>
        </Stack>
        )
      )}
    </StyledContainer>
  );
}
