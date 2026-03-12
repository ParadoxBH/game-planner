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
import { Storefront, AccessTime, Refresh, Lock } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useGameData } from "../hooks/useGameData";
import { useState, useMemo } from "react";
import { StyledContainer } from "./common/StyledContainer";
import {
  ShopItemCard,
  type ShopItem,
  type ShopCondition,
} from "./shops/ShopItemCard";

interface GameShop {
  id: string;
  npcId: string;
  resetType?: "diario" | "semanal";
  resetTime?: string;
  conditions?: ShopCondition[];
  items: ShopItem[];
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
}

interface GameEvent {
  id: string;
  name: string;
}

interface GameConfig {
  id: string;
  resetes?: {
    diario?: { horario: number };
    semanal?: {
      horario: number;
      dia:
        | "domingo"
        | "segunda"
        | "terca"
        | "quarta"
        | "quinta"
        | "sexta"
        | "sabado";
    };
  };
}

export function ShopsPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: gameConfig } = useGameData<GameConfig>(gameId, "game");
  const { data: shops, loading: loadingShops } = useGameData<GameShop[]>(
    gameId,
    "shops",
  );
  const { data: items } = useGameData<GameItem[]>(gameId, "items");
  const { data: entities } = useGameData<GameEntity[]>(gameId, "entity");
  const { data: events } = useGameData<GameEvent[]>(gameId, "events");
  const [selectedShopIndex, setSelectedShopIndex] = useState(0);

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

  const currentShop = shops?.[selectedShopIndex];
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

  return (
    <StyledContainer
      title={`Lojas de ${gameId}`}
      label="Visite os NPCs locais para comprar suprimentos e trocar recursos."
      sx={{ container: { overflowY: "hidden" } }}
      actionsStart={
        <Tabs
          value={selectedShopIndex}
          onChange={(_, newValue) => setSelectedShopIndex(newValue)}
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
                label={npc?.name || shop.npcId}
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
      }
    >
      {currentShop && (
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
                  {currentNpc?.name || currentShop.npcId}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="center"
                  sx={{ mb: 2 }}
                >
                  {currentShop.resetType && (
                    <Chip
                      size="small"
                      icon={<Refresh sx={{ fontSize: "1rem" }} />}
                      label={`Reseta: ${currentShop.resetType === "diario" ? "Diário" : "Semanal"}`}
                      sx={{
                        backgroundColor: "rgba(255, 68, 0, 0.1)",
                        color: "#ff4400",
                      }}
                    />
                  )}
                  {(currentShop.resetTime ||
                    (currentShop.resetType &&
                      gameConfig?.resetes?.[currentShop.resetType])) && (
                    <Chip
                      size="small"
                      icon={<AccessTime sx={{ fontSize: "1rem" }} />}
                      label={
                        currentShop.resetTime ||
                        (() => {
                          if (
                            !currentShop.resetType ||
                            !gameConfig?.resetes?.[currentShop.resetType]
                          )
                            return "";
                          const reset =
                            gameConfig.resetes[currentShop.resetType];
                          if (!reset) return "";

                          const timeStr = `${String(reset.horario).padStart(2, "0")}:00`;
                          if ("dia" in reset && reset.dia) {
                            const diaCapitalized =
                              reset.dia.charAt(0).toUpperCase() +
                              reset.dia.slice(1);
                            return `${diaCapitalized} ${timeStr}`;
                          }
                          return timeStr;
                        })()
                      }
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

          {/* Items List */}
          <Stack flex={1} sx={{ overflowY: "auto" }}>
            <Grid size={{ xs: 12, md: 8, lg: 9 }}>
              <Grid container spacing={2}>
                {currentShop.items.map((shopItem, idx) => (
                  <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={idx}>
                    <ShopItemCard
                      shopItem={shopItem}
                      baseItem={itemsMap.get(shopItem.id)}
                      currencyItem={itemsMap.get(shopItem.currency || "ouro")}
                      eventsMap={eventsMap}
                      itemsMap={itemsMap}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Stack>
        </Stack>
      )}
    </StyledContainer>
  );
}
