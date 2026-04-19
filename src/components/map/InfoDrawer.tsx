import { useTheme } from "@mui/material";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { NavigationItem } from "./MapView";
import { BaseDrawer } from "../BaseDrawer";
import { EntityDrawerContent } from "../entity/EntityDrawerContent";
import { ItemDrawerContent } from "../item/ItemDrawerContent";

import type { Entity, Item, ReferencePoints, MapMetadata, Shop } from "../../types/gameModels";

interface InfoDrawerProps {
  stack: NavigationItem[];
  entities: Entity[];
  items: Item[];
  referencePoints: ReferencePoints[];
  shops: Shop[];
  maps: MapMetadata[];
  onSelectMap: (mapId: string) => void;
  onPush: (item: NavigationItem) => void;
  onPop: () => void;
  onClose: () => void;
}

export const InfoDrawer = ({
  stack,
  entities,
  items,
  referencePoints,
  shops,
  maps,
  onSelectMap,
  onPush,
  onPop,
  onClose,
}: InfoDrawerProps) => {
  const theme = useTheme() as any;
  const navigate = useNavigate();
  const { gameId } = useParams();
  const currentItem = stack[stack.length - 1];

  const currentEntity = useMemo(() => {
    if (currentItem?.type !== "entity") return undefined;
    return entities.find((e) => e.id === currentItem.id);
  }, [currentItem, entities]);

  const currentItemData = useMemo(() => {
    if (currentItem?.type !== "item") return undefined;
    return items.find((i) => i.id === currentItem.id);
  }, [currentItem, items]);

  const currentShop = useMemo(() => {
    if (currentItem?.type !== "entity") return undefined;
    return shops.find((s) => s.npcId === currentItem.id);
  }, [currentItem, shops]);

  const droppedBy = useMemo(() => {
    if (currentItem?.type !== "item") return [];
    return entities.filter((e) =>
      e.drops?.some((d) => d.itemId === currentItem.id),
    );
  }, [currentItem, entities]);

  const handleViewDetails = () => {
    if (currentItem.type === "entity") {
      navigate(`/game/${gameId}/entities/view/${currentItem.id}`);
    } else {
      navigate(`/game/${gameId}/items/view/${currentItem.id}`);
    }
  };

  const mapOccurrences = useMemo(() => {
    if (currentItem?.type !== "entity") return [];

    const relevantPoints = referencePoints.filter((s) => s.entityId === currentItem.id);
    const counts: Record<string, number> = {};

    relevantPoints.forEach((s) => {
      const mapId = s.mapId || (maps.length > 0 ? maps[0].id : "default");
      counts[mapId] = (counts[mapId] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([mapId, count]) => {
        const mapInfo = maps.find((m) => m.id === mapId);
        return {
          id: mapId,
          name:
            mapInfo?.name || (mapId === "default" ? "Mapa Principal" : mapId),
          count,
          thumbnail: mapInfo?.thumbnail,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [currentItem, referencePoints, maps]);

  if (!currentItem) return null;

  return (
    <BaseDrawer
      title={currentItem.type === "entity" ? "Entidade" : "Item"}
      onClose={onClose}
      onPop={onPop}
      onViewDetails={handleViewDetails}
      showBackButton={stack.length > 1}
    >
      {currentItem.type === "entity" ? (
        <EntityDrawerContent
          entityId={currentItem.id}
          currentEntity={currentEntity}
          items={items}
          theme={theme}
          mapOccurrences={mapOccurrences}
          shop={currentShop}
          onPush={onPush}
          onSelectMap={onSelectMap}
        />
      ) : (
        <ItemDrawerContent
          itemId={currentItem.id}
          currentItemData={currentItemData}
          droppedBy={droppedBy}
          theme={theme}
          onPush={onPush}
        />
      )}
    </BaseDrawer>
  );
};
