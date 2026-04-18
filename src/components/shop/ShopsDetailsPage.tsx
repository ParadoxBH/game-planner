import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Tooltip,
} from "@mui/material";
import { Storefront, Lock, Refresh, Map as MapIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { getPublicUrl } from "../../utils/pathUtils";
import { parseWKTPoint } from "../../utils/wkt";
import { MiniMap } from "../common/MiniMap";
import { ListingDataView } from "../common/ListingDataView";
import { ShopItemCard } from "./ShopItemCard";
import type {
  ShopItem,
  Item,
  Entity,
  GameEvent,
  ReferencePoints,
  MapMetadata,
} from "../../types/gameModels";
import type { ShopDetails } from "../../types/apiModels";
import { DetainItem } from "../common/DetainItem";
import { DetainContainer } from "../common/DetainContainer";

interface ShopsDetailsPageProps {
  gameId: string;
  shopDetails: ShopDetails;
  itemsMap: Map<string, Item>;
  entitiesMap: Map<string, Entity>;
  eventsMap: Map<string, GameEvent>;
  referencePoints: ReferencePoints[];
  maps: MapMetadata[];
  itemsViewMode: string;
}

export function ShopsDetailsPage({
  gameId,
  shopDetails,
  itemsMap,
  entitiesMap,
  eventsMap,
  referencePoints,
  maps,
  itemsViewMode,
}: ShopsDetailsPageProps) {
  const navigate = useNavigate();

  const currentShop = shopDetails.shop;
  const currentNpc = shopDetails.npc;

  const npcLocation = useMemo(() => {
    if (!currentNpc || !referencePoints) return null;
    return referencePoints.find((s: any) => s.entityId === currentNpc.id);
  }, [currentNpc, referencePoints]);

  const mapMetadata = useMemo(() => {
    if (!npcLocation || !maps) return null;
    return maps.find((m: any) => m.id === npcLocation.mapId) || maps[0];
  }, [npcLocation, maps]);

  return (
    <DetainContainer>
      {/* NPC Info & Reset */}
      <>
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
            onClick={() =>
              currentNpc?.id &&
              navigate(`/game/${gameId}/entity/view/${currentNpc.id}`)
            }
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
              <Typography
                variant="button"
                sx={{ color: "white", fontWeight: 700 }}
              >
                Ver Perfil
              </Typography>
            </Box>
          </Box>
          <CardContent>
            <Typography
              variant="h5"
              align="center"
              onClick={() =>
                currentNpc?.id &&
                navigate(`/game/${gameId}/entity/view/${currentNpc.id}`)
              }
              sx={{
                fontWeight: 700,
                mb: 1,
                cursor: "pointer",
                "&:hover": { color: "primary.main" },
              }}
            >
              {currentShop.name || currentNpc?.name || currentShop.npcId}
            </Typography>

            {currentShop.conditional && currentShop.conditional.length > 0 && (
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
                    cond.type === "event" ? eventsMap.get(cond.id)?.name : null;
                  return (
                    <Typography
                      key={i}
                      variant="body2"
                      sx={{ fontSize: "0.85rem" }}
                    >
                      • {eventName ? `Evento: ${eventName}` : cond.description}
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
          <DetainItem
            label={`Localização ${mapMetadata.name ? `- ${mapMetadata.name}` : ""}`}
            sx={{ label: { fontSize: 12 } }}
            startIcon={
              <MapIcon sx={{ fontSize: "1rem", color: "primary.main" }} />
            }
          >
            <Box sx={{ height: 200 }}>
              <MiniMap
                meta={mapMetadata}
                markers={[
                  {
                    id: "npc-location",
                    position: (() => {
                      if (
                        npcLocation.geom?.type === "Point" &&
                        npcLocation.geom.coordinates
                      ) {
                        const wktCoords = parseWKTPoint(
                          npcLocation.geom.coordinates,
                        );
                        // GeoJSON is [lng, lat], Leaflet wants [lat, lng]
                        return [wktCoords[1], wktCoords[0]];
                      }
                      return [0, 0];
                    })(),
                    color: "#ff4400",
                  },
                ]}
                height="100%"
              />
            </Box>
          </DetainItem>
        )}
      </>
      {/* Groups and Items List */}
      <>
        {currentShop.groups.map((group, idx) => (
          <DetainItem
            key={`group-${idx}`}
            label={group.name}
            actions={
              group.resetType && (
                <Chip
                  size="small"
                  icon={<Refresh sx={{ fontSize: "0.9rem" }} />}
                  label={
                    group.resetType === "diario"
                      ? "Diário"
                      : group.resetType === "semanal"
                        ? "Semanal"
                        : "Único"
                  }
                  sx={{
                    backgroundColor: "rgba(255, 68, 0, 0.08)",
                    color: "#ff4400",
                    height: 24,
                    "& .MuiChip-label": {
                      px: 1,
                      fontWeight: 700,
                      fontSize: "0.7rem",
                    },
                  }}
                />
              )
            }
          >
            <ListingDataView
              data={group.items}
              viewMode={itemsViewMode}
              variant="compact"
              cardMinWidth={200}
              listHeader={[
                { label: "Item", width: "60%" },
                { label: "Preço", align: "right" as const, width: "20%" },
                {
                  label: "Limite / Qtd",
                  align: "right" as const,
                  width: "20%",
                },
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
                const displayPrice =
                  shopItem.price ?? (baseItem?.buyPrice || baseItem?.sellPrice);

                return [
                  <Box
                    key={`shop_item_list_${shopItem.id}`}
                    sx={{ display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 0.5,
                        backgroundColor: "rgba(0,0,0,0.2)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={getPublicUrl(target?.icon)}
                        alt={target?.name}
                        style={{
                          width: "80%",
                          height: "80%",
                          objectFit: "contain",
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {target?.name}
                    </Typography>
                  </Box>,

                  <Box
                    key={`shop_item_price_${shopItem.id}`}
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                    }}
                  >
                    {displayPrice !== undefined && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 800,
                            color: "#ffbb00",
                            fontSize: "0.8rem",
                          }}
                        >
                          {displayPrice.toLocaleString()}
                        </Typography>
                        {currencyItem?.icon && (
                          <img
                            src={getPublicUrl(currencyItem.icon)}
                            alt={currencyItem.name}
                            style={{
                              width: 16,
                              height: 16,
                              objectFit: "contain",
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>,

                  <Box
                    key={`shop_item_limit_${shopItem.id}`}
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Chip
                      label={!!shopItem.amount ? `x${shopItem.amount}` : "Ilimitado"}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 18,
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "text.secondary",
                      }}
                    />
                  </Box>,
                ];
              }}
              renderIconItem={(shopItem: ShopItem) => {
                const baseItem = itemsMap.get(shopItem.id);
                const baseEntity = entitiesMap.get(shopItem.id);
                const target = baseItem || baseEntity;
                const currencyItem = itemsMap.get(shopItem.currency || "ouro");
                const displayPrice =
                  shopItem.price ?? (baseItem?.buyPrice || baseItem?.sellPrice);

                return (
                  <Tooltip
                    key={`shop_item_icon_${shopItem.id}`}
                    title={`${target?.name} - ${displayPrice} ${currencyItem?.name || "ouro"}`}
                  >
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        p: 1,
                        position: "relative",
                      }}
                    >
                      <img
                        src={getPublicUrl(target?.icon)}
                        alt={target?.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />

                      {/* Top-Right: Purchase Limit / Quantity */}
                      {shopItem.amount && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            backgroundColor: "rgba(0,0,0,0.6)",
                            backdropFilter: "blur(2px)",
                            borderRadius: "4px",
                            px: 0.5,
                            py: 0.1,
                            border: "1px solid rgba(255,255,255,0.1)",
                            zIndex: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.6rem",
                              fontWeight: 900,
                              color: "#fff",
                            }}
                          >
                            x{shopItem.amount}
                          </Typography>
                        </Box>
                      )}

                      {/* Bottom-Center: Price */}
                      {displayPrice !== undefined && (
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 0,
                            left: "50%",
                            transform: "translateX(-50%)",
                            backgroundColor: "rgba(0,0,0,0.7)",
                            backdropFilter: "blur(4px)",
                            borderRadius: "10px",
                            px: 1,
                            py: 0.2,
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            whiteSpace: "nowrap",
                            border: "1px solid rgba(255,255,255,0.1)",
                            zIndex: 1,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              color: "#ffbb00",
                            }}
                          >
                            {displayPrice >= 1000
                              ? `${(displayPrice / 1000).toFixed(1)}k`
                              : displayPrice}
                          </Typography>
                          {currencyItem?.icon && (
                            <img
                              src={getPublicUrl(currencyItem.icon)}
                              alt={currencyItem.name}
                              style={{
                                width: 10,
                                height: 10,
                                objectFit: "contain",
                              }}
                            />
                          )}
                        </Box>
                      )}
                    </Box>
                  </Tooltip>
                );
              }}
            />
          </DetainItem>
        ))}
      </>
    </DetainContainer>
  );
}
