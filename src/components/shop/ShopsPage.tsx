import { getPublicUrl } from "../../utils/pathUtils";
import {
  Box,
  Typography,
  Chip,
  Stack,
  CircularProgress,
} from "@mui/material";
import {
  Storefront,
  Inventory,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { useMemo, useState, useEffect } from "react";
import { StyledContainer } from "../common/StyledContainer";
import { ShopCard } from "./ShopCard";
import type {
  Shop,
  Entity,
  Item,
  GameEvent,
  ReferencePoints,
  MapMetadata,
} from "../../types/gameModels";
import type { ShopDetails } from "../../types/apiModels";
import { ListingDataView } from "../common/ListingDataView";
import { Tooltip } from "@mui/material";
import { ViewModeSelector } from "../common/ViewModeSelector";
import { useViewMode } from "../../hooks/useViewMode";
import { shopRepository } from "../../repositories/ShopRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { eventRepository } from "../../repositories/EventRepository";
import { referencePointRepository } from "../../repositories/ReferencePointRepository";
import { mapRepository } from "../../repositories/MapRepository";
import { usePlatform } from "../../hooks/usePlatform";
import { ShopsDetailsPage } from "./ShopsDetailsPage";
import { PickSelector } from "../common/PickSelector";

export function ShopsPage() {
  const { gameId, category: urlShopId } = useParams<{
    gameId: string;
    category?: string;
  }>();
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
      mapRepository.getAll(),
    ];

    if (urlShopId) {
      promises.push(getShopDetails(urlShopId));
    }

    Promise.all(promises)
      .then(
        ([
          allShops,
          allItems,
          allEntities,
          allEvents,
          allRefPoints,
          allMaps,
          details,
        ]) => {
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
        },
      )
      .catch((err) => {
        console.error("Error fetching shops data:", err);
        if (isMounted) setDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
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

  const currentShop = shopDetails?.shop;

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

  const isOverview = !urlShopId;

  return (
    <StyledContainer
      title={`Lojas de ${gameId}`}
      label="Visite os NPCs locais para comprar suprimentos e trocar recursos."
      sx={{ container: { overflowY: isOverview ? "auto" : "hidden" } }}
      actionsStart={
        <Stack
          direction={"row"}
          spacing={1}
          justifyContent={"space-between"}
          flex={1}
        >
          <PickSelector
            label={"Loja"}
            value={urlShopId || ""}
            options={shops.map((shop) => {
              const npc = entitiesMap.get(shop.npcId);
              return {
                value: shop.id,
                label: shop.name || npc?.name || shop.npcId,
                icon: npc.icon,
              };
            })}
            onChange={(value: string | null) => {
              if (!!value) navigate(`/game/${gameId}/shops/list/${value}`);
              else navigate(`/game/${gameId}/shops/list`);
            }}
          />
          {isOverview ? (
            <ViewModeSelector mode={viewMode} onChange={setViewMode} />
          ) : (
            <ViewModeSelector
              mode={itemsViewMode}
              onChange={setItemsViewMode}
            />
          )}
        </Stack>
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
                onClick={() =>
                  navigate(`/game/${gameId}/shops/list/${shop.id}`)
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  cursor: "pointer",
                }}
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
                  {npc?.icon ? (
                    <img
                      src={getPublicUrl(npc.icon)}
                      alt={shop.name}
                      style={{
                        width: "80%",
                        height: "80%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Inventory
                      sx={{ fontSize: 16, color: "rgba(255, 255, 255, 0.2)" }}
                    />
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {shop.name}
                </Typography>
              </Box>,
              <Typography
                key={`shop_id_${shop.id}`}
                variant="caption"
                sx={{ color: "text.secondary", fontFamily: "monospace" }}
              >
                {shop.id}
              </Typography>,
              <Box
                key={`shop_status_${shop.id}`}
                sx={{ display: "flex", justifyContent: "flex-end" }}
              >
                <Chip
                  label="Ativa"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ height: 18, fontSize: "0.6rem" }}
                />
              </Box>,
            ];
          }}
          renderIconItem={(shop) => {
            const npc = entitiesMap.get(shop.npcId);
            return (
              <Tooltip
                key={`shop_icon_${shop.id}`}
                title={`${shop.name || npc?.name || shop.npcId} (${shop.id})`}
              >
                <Box
                  onClick={() =>
                    navigate(`/game/${gameId}/shops/list/${shop.id}`)
                  }
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    p: 1,
                  }}
                >
                  {npc?.icon ? (
                    <img
                      src={getPublicUrl(npc.icon)}
                      alt={shop.name}
                      style={{
                        width: "80%",
                        height: "80%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Storefront
                      sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.2)" }}
                    />
                  )}
                </Box>
              </Tooltip>
            );
          }}
        />
      ) : (
        currentShop && (
          <ShopsDetailsPage
            gameId={gameId || ""}
            shopDetails={shopDetails}
            itemsMap={itemsMap}
            entitiesMap={entitiesMap}
            eventsMap={eventsMap}
            referencePoints={referencePoints}
            maps={maps}
            itemsViewMode={itemsViewMode}
          />
        )
      )}
    </StyledContainer>
  );
}
