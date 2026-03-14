import { useTheme } from "@mui/material";
import { useMemo } from "react";
import type { NavigationItem } from "./MapView";
import { BaseDrawer } from "./drawers/BaseDrawer";
import { EntityDrawerContent } from "./drawers/EntityDrawerContent";
import { ItemDrawerContent } from "./drawers/ItemDrawerContent";

import type { Entity, Item, Spawn, MapMetadata } from "../types/gameModels";

interface EntityDrawerProps {
  stack: NavigationItem[];
  entities: Entity[];
  items: Item[];
  spawns: Spawn[];
  maps: MapMetadata[];
  onSelectMap: (mapId: string) => void;
  onPush: (item: NavigationItem) => void;
  onPop: () => void;
  onClose: () => void;
}

export const EntityDrawer = ({
  stack,
  entities,
  items,
  spawns,
  maps,
  onSelectMap,
  onPush,
  onPop,
  onClose,
}: EntityDrawerProps) => {
  const theme = useTheme() as any;
  const currentItem = stack[stack.length - 1];

  const currentEntity = useMemo(() => {
    if (currentItem?.type !== "entity") return null;
    return entities.find((e) => e.id === currentItem.id);
  }, [currentItem, entities]);

  const currentItemData = useMemo(() => {
    if (currentItem?.type !== "item") return null;
    return items.find((i) => i.id === currentItem.id);
  }, [currentItem, items]);

  const droppedBy = useMemo(() => {
    if (currentItem?.type !== "item") return [];
    return entities.filter((e) =>
      e.drops?.some((d) => d.itemId === currentItem.id),
    );
  }, [currentItem, entities]);

  const mapOccurrences = useMemo(() => {
    if (currentItem?.type !== "entity") return [];

    const relevantSpawns = spawns.filter((s) => s.entityId === currentItem.id);
    const counts: Record<string, number> = {};

    relevantSpawns.forEach((s) => {
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
  }, [currentItem, spawns, maps]);

  if (!currentItem) return null;

  return (
    <BaseDrawer
      title={currentItem.type === "entity" ? "Entidade" : "Item"}
      onClose={onClose}
      onPop={onPop}
      showBackButton={stack.length > 1}
    >
      {currentItem.type === "entity" ? (
        <EntityDrawerContent
          entityId={currentItem.id}
          currentEntity={currentEntity}
          items={items}
          theme={theme}
          mapOccurrences={mapOccurrences}
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
