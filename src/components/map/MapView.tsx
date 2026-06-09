import {
  Box,
  Typography,
  Stack,
  Snackbar,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from "@mui/material";
import { CRS, type LatLngBoundsExpression, Transformation } from "leaflet";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Popup,
  ImageOverlay,
  TileLayer,
  useMapEvents,
  Polygon,
  Polyline,
  CircleMarker,
  Tooltip,
  Pane,
} from "react-leaflet";
import { divIcon } from "leaflet";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import { SimplifiedEntity } from "../entity/SimplifiedEntity";
import { InfoDrawer } from "./InfoDrawer";
import { loadGamesList } from "../../services/dataLoader";
import { useApi } from "../../hooks/useApi";
import type {
  Entity,
  ReferencePoints,
  GameInfo,
  MapMetadata,
  Item,
  Shop,
  GameEvent,
} from "../../types/gameModels";
import { eventRepository } from "../../repositories/EventRepository";
import { MapWeatherPanel } from "./MapWeatherPanel";
import {
  parseWKTPoint,
  parseWKTPolygon,
  formatWKTPoint,
  formatWKTPolygon,
} from "../../utils/wkt";
import { rotateLatLng } from "../../utils/wkt";
import { MapToolbox } from "./MapToolbox";
import { MapDashboard } from "./MapDashboard";
import { BoundBoxEditorPanel, type Bounds as BoundBoxBounds } from "./BoundBoxEditorPanel";
import MapIcon from "@mui/icons-material/Map";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { mapRepository } from "../../repositories/MapRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { referencePointRepository } from "../../repositories/ReferencePointRepository";
import { shopRepository } from "../../repositories/ShopRepository";
import { categoryRepository } from "../../repositories/CategoryRepository";
import { PointMarkerPanel } from "./PointMarkerPanel";
import { MapFilterDrawer } from "./MapFilterDrawer";
import markerTemplate from "./marker-icon.html?raw";
import { useEventFilter } from "../../context/EventFilterContext";

export interface NavigationItem {
  type: "entity" | "item";
  id: string;
}

interface CursorTrackerProps {
  onMouseMove: (coords: [number, number]) => void;
}

const CursorTracker = ({ onMouseMove }: CursorTrackerProps) => {
  useMapEvents({
    mousemove(e) {
      onMouseMove([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

interface MapEventsHandlerProps {
  onClick: (coords: [number, number]) => void;
}

const MapEventsHandler = ({ onClick }: MapEventsHandlerProps) => {
  useMapEvents({
    click(e) {
      if (!e.originalEvent.shiftKey) {
        onClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
};

interface StableMarkerProps {
  point: ReferencePoints;
  entity: any;
  entities?: any[];
  iconHtml: string;
  size: number;
  onExpand?: (id?: string) => void;
  categoriesMap?: Record<string, string>;
  interactive?: boolean;
  isCollected?: boolean;
  onToggleCollected?: () => void;
  mapBounds: [[number, number], [number, number]];
  rotate: number;
}

const StableMarker = React.memo(
  ({
    point,
    entity,
    entities,
    iconHtml,
    size,
    onExpand,
    categoriesMap,
    interactive = true,
    isCollected,
    onToggleCollected,
    mapBounds,
    rotate,
  }: StableMarkerProps) => {
    const cp = parseWKTPoint(point.geom.coordinates);
    const rawPos: [number, number] = [cp[1], cp[0]];
    const pos: [number, number] = rotate ? rotateLatLng(rawPos, mapBounds, rotate) : rawPos;

    const icon = useMemo(
      () =>
        divIcon({
          html: iconHtml,
          iconAnchor: [size / 2, size / 2],
          className: point.id.startsWith("point_")
            ? "session-point-icon"
            : "custom-entity-icon",
        }),
      [iconHtml, point.id, size],
    );

    return (
      <Marker position={pos} icon={icon} interactive={interactive}>
        <Popup
          sx={{
            backgroundColor: theme.designTokens.colors.glassBg,
            backdropFilter: theme.designTokens.colors.glassFilter,
          }}
        >
          <SimplifiedEntity
              entity={
                entity || {
                  id: point.entityId,
                  name: point.name || point.entityId,
                  category: point.type || "resource",
                  icon: point.icon,
                }
              }
              entities={entities}
              position={rawPos}
              mode={point.mode}
              respawnDelay={point.respawnDelay ?? entity?.respawnDelay}
              onExpand={(id) => onExpand ? onExpand(id) : undefined}
              categoriesMap={categoriesMap}
              pointImage={point.image}
              isCollected={isCollected}
              onToggleCollected={onToggleCollected}
              customDrops={point.customDrops}
            />
        </Popup>
      </Marker>
    );
  },
);

import { MapInfoOverlay } from "./MapInfoOverlay";
import { theme } from "../../theme/theme";
import { getPublicUrl } from "../../utils/pathUtils";
import { getDailyResetTimes, getWeeklyResetTimes } from "../../utils/timeUtils";

const createCustomCRS = (
  bounds: [[number, number], [number, number]],
  tileRange?: MapMetadata["tileRange"],
) => {
  const [min, max] = bounds;
  const width = Math.abs(max[1] - min[1]);
  const height = Math.abs(max[0] - min[0]);
  if (tileRange) {
    const scale = 256 / Math.pow(2, tileRange.z);
    const scaleX =
      (tileRange.max[0] * scale - tileRange.min[0] * scale) / width;
    const offsetX = tileRange.min[0] * scale - min[1] * scaleX;
    const scaleY =
      (tileRange.min[1] * scale - tileRange.max[1] * scale) / height;
    const offsetY = tileRange.min[1] * scale - max[0] * scaleY;
    return Object.assign({}, CRS.Simple, {
      transformation: new Transformation(scaleX, offsetX, scaleY, offsetY),
    });
  }
  const scaleX = 256 / width;
  const scaleY = -256 / height;
  return Object.assign({}, CRS.Simple, {
    transformation: new Transformation(
      scaleX,
      -min[1] * scaleX,
      scaleY,
      -max[0] * scaleY,
    ),
  });
};

export const MapView = () => {
  const theme = useTheme() as any;
  const { gameId, mapId: urlMapId, view: urlView } = useParams();
  const navigate = useNavigate();
  const { activeEventIds, toggleEvent } = useEventFilter();
  const sizeMarker = 32;

  const [cursorCoords, setCursorCoords] = useState<[number, number]>([0, 0]);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [loadingGame, setLoadingGame] = useState(true);
  const [navigationStack, setNavigationStack] = useState<NavigationItem[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [activeTool, setActiveTool] = useState<"point" | "polygon" | null>(
    null,
  );
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const mapRef = useRef<any>(null);
  const [isBoundBoxEditorOpen, setIsBoundBoxEditorOpen] = useState(false);
  const [previewBounds, setPreviewBounds] = useState<BoundBoxBounds | null>(null);

  // Improved Point Marker States
  const [sessionPoints, setSessionPoints] = useState<ReferencePoints[]>([]);
  const [pointConfig, setPointConfig] = useState({
    type: "spawn",
    entityId: "TODO",
  });
  const [isMarkerPanelOpen, setIsMarkerPanelOpen] = useState(false);
  const handleSelectTool = (tool: "point" | "polygon" | null) => {
    setActiveTool(tool);
    if (tool !== null) {
      setIsMarkerPanelOpen(true);
    }
  };

  // Filter States
  const [visibleTypes, setVisibleTypes] = useState<string[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [visibleEntities, setVisibleEntities] = useState<string[]>([]);
  const [hasInitializedFilters, setHasInitializedFilters] = useState(false);
  
  const [hideCollected, setHideCollected] = useState(false);
  const [collectedPoints, setCollectedPoints] = useState<Record<string, number>>({});

  const [entities, setEntities] = useState<Entity[]>([]);
  const [referencePoints, setReferencePoints] = useState<ReferencePoints[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [maps, setMaps] = useState<MapMetadata[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const selectedMapId = urlMapId || "";

  // Reset filters initialization when map changes
  useEffect(() => {
    setHasInitializedFilters(false);
    setPreviewBounds(null); // reset preview when switching maps
  }, [selectedMapId]);

  const { loading: dbLoading } = useApi(gameId);

  // Fetch all data
  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    Promise.all([
      entityRepository.getAll(),
      referencePointRepository.getAll(),
      shopRepository.getAll(),
      mapRepository.getAll(),
      itemRepository.getAll(),
      categoryRepository.getAll(),
      eventRepository.getAll(),
      loadGamesList(),
    ])
      .then(
        ([
          allEntities,
          allRefPoints,
          allShops,
          allMaps,
          allItems,
          allCategories,
          allEvents,
          allGames,
        ]) => {
          if (!isMounted) return;

          setEntities(allEntities);
          setReferencePoints(allRefPoints);
          setShops(allShops);
          setMaps(allMaps);
          setItems(allItems);
          setEvents(allEvents);

          const catMap: Record<string, string> = {};
          allCategories.forEach((c) => (catMap[c.id] = c.name));
          setCategoriesMap(catMap);

          const game = allGames.find((g) => g.id === gameId);
          if (game) {
            setGameInfo(game);
          }

          setDataLoading(false);
          setLoadingGame(false);

          // Se não houver mapId na URL, redireciona para o primeiro mapa
          if (!urlMapId && allMaps.length > 0) {
            const firstMap = allMaps[0];
            const initialView =
              firstMap.defaultView || firstMap.availableViews?.[0] || "map";
            navigate(`/game/${gameId}/map/${firstMap.id}/${initialView}`, {
              replace: true,
            });
          }
        },
      )
      .catch((err) => {
        console.error("Error fetching map view data:", err);
        if (isMounted) setDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dbLoading, gameId, urlMapId, navigate]);

  // Map-specific points
  const pointsOnCurrentMap = useMemo(
    () => referencePoints.filter((s) => !s.mapId || s.mapId === selectedMapId),
    [referencePoints, selectedMapId],
  );

  const entityLookup = useMemo(() => {
    const lookup: Record<string, Entity | Item> = {};
    entities.forEach((e) => {
      lookup[e.id] = e as Entity;
    });
    console.log("xabu", entities);
    items.forEach((i) => {
      lookup[i.id] = i as Item;
    });
    return lookup;
  }, [entities, items]);

  const selectedMap = useMemo(
    () => maps.find((m) => m.id === selectedMapId),
    [maps, selectedMapId],
  );

  const availableViews = useMemo(
    () => selectedMap?.availableViews || ["map", "dashboard"],
    [selectedMap],
  );
  const defaultView = selectedMap?.defaultView || availableViews[0] || "map";
  const viewMode = (urlView as "map" | "dashboard") || defaultView;

  // Rotation: each unit = 90°, 0 = north up, 1 = east up, etc.
  const mapRotate = selectedMap?.rotate ?? 0;

  // Initialize filters once data is loaded
  useEffect(() => {
    if (dataLoading || hasInitializedFilters || pointsOnCurrentMap.length === 0)
      return;

    let initialTypes: string[] = [];
    let initialCategories: string[] = [];
    let initialEntities: string[] = [];

    if (!selectedMap?.defaultFilters) {
      const typesSet = new Set<string>();
      const categoriesSet = new Set<string>();
      const entitiesSet = new Set<string>();

      pointsOnCurrentMap.forEach((p) => {
        typesSet.add(p.type);
        const entityIds = new Set<string>();
        if (p.entityId) entityIds.add(p.entityId);
        if (p.spawns) p.spawns.forEach(s => entityIds.add(s.entityId));

        entityIds.forEach((eId) => {
          entitiesSet.add(eId);
          const entity = entityLookup[eId] || items.find((i) => i.id === eId);
          const categories = entity?.category
            ? Array.isArray(entity.category)
              ? entity.category
              : [entity.category]
            : ["desconhecido"];
          categories.forEach((cat) => categoriesSet.add(cat));
        });
      });

      initialTypes = Array.from(typesSet);
      initialCategories = Array.from(categoriesSet);
      initialEntities = Array.from(entitiesSet);
    } else {
      initialTypes = selectedMap.defaultFilters.types || [];
      initialCategories = selectedMap.defaultFilters.categories || [];
      initialEntities = [...(selectedMap.defaultFilters.entities || [])];

      // Se houver categorias padrão, ativa automaticamente as entidades pertencentes a elas
      if (initialCategories.length > 0) {
        pointsOnCurrentMap.forEach((p) => {
          const entityIds = new Set<string>();
          if (p.entityId) entityIds.add(p.entityId);
          if (p.spawns) p.spawns.forEach(s => entityIds.add(s.entityId));

          entityIds.forEach(eId => {
            const entity = entityLookup[eId] || items.find((i) => i.id === eId);
            const categories = entity?.category
              ? Array.isArray(entity.category)
                ? entity.category
                : [entity.category]
              : ["desconhecido"];

            const matchesInitialCategory = categories.some(cat => initialCategories.includes(cat));
            if (matchesInitialCategory) {
              if (!initialEntities.includes(eId)) {
                initialEntities.push(eId);
              }
            }
          });
        });
      }
    }

    setVisibleTypes(initialTypes);
    setVisibleCategories(initialCategories);
    setVisibleEntities(initialEntities);
    setHasInitializedFilters(true);
  }, [
    dataLoading,
    pointsOnCurrentMap,
    entityLookup,
    items,
    hasInitializedFilters,
    selectedMap,
  ]);

  // Load/Save session points
  useEffect(() => {
    const saved = localStorage.getItem(`session_points_${gameId}`);
    if (saved) {
      try {
        setSessionPoints(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading session points", e);
      }
    }
  }, [gameId]);

  useEffect(() => {
    if (sessionPoints.length > 0) {
      localStorage.setItem(
        `session_points_${gameId}`,
        JSON.stringify(sessionPoints),
      );
    } else {
      localStorage.removeItem(`session_points_${gameId}`);
    }
  }, [sessionPoints, gameId]);

  useEffect(() => {
    const saved = localStorage.getItem(`collected_points_${gameId}`);
    if (saved) {
      try {
        setCollectedPoints(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading collected points", e);
      }
    }
  }, [gameId]);

  const handleToggleCollected = (pointId: string, isCollected: boolean) => {
    setCollectedPoints(prev => {
      const next = { ...prev };
      if (isCollected) {
        delete next[pointId];
      } else {
        next[pointId] = Date.now();
      }
      localStorage.setItem(`collected_points_${gameId}`, JSON.stringify(next));
      return next;
    });
  };


  // Redirecionar se a view atual não estiver disponível para o mapa selecionado
  useEffect(() => {
    if (selectedMap && !availableViews.includes(viewMode)) {
      navigate(`/game/${gameId}/map/${selectedMapId}/${defaultView}`, {
        replace: true,
      });
    }
  }, [
    selectedMap,
    viewMode,
    availableViews,
    gameId,
    selectedMapId,
    defaultView,
    navigate,
  ]);

  const setViewMode = (mode: "map" | "dashboard") => {
    navigate(`/game/${gameId}/map/${selectedMapId}/${mode}`);
  };

  const setSelectedMapId = (id: string) => {
    navigate(`/game/${gameId}/map/${id}/${viewMode}`);
  };

  const customCRS = useMemo(
    () =>
      selectedMap
        ? createCustomCRS(
            selectedMap.bounds as [[number, number], [number, number]],
            selectedMap.tileRange,
          )
        : CRS.Simple,
    [selectedMap],
  );
  const mapCenter = useMemo(() => {
    if (selectedMap) {
      const [min, max] = selectedMap.bounds;
      return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2] as [number, number];
    }
    return [0, 0] as [number, number];
  }, [selectedMap]);

  if (loadingGame || dbLoading || dataLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          width: "100%",
          gap: 2,
        }}
      >
        <CircularProgress color="primary" />
        <Typography>Carregando mapa...</Typography>
      </Box>
    );
  }

  if (!gameInfo)
    return (
      <Stack sx={{ p: 4 }}>
        <Typography>Jogo não encontrado.</Typography>
      </Stack>
    );
  if (!selectedMap)
    return (
      <Stack sx={{ p: 4 }}>
        <Typography>Mapa não encontrado.</Typography>
      </Stack>
    );

  const handlePush = (item: NavigationItem) =>
    setNavigationStack((prev) => [...prev, item]);

  // Coords to display: always in original game space (inverse-rotate cursor position)
  const displayCoords: [number, number] = mapRotate
    ? rotateLatLng(
        cursorCoords,
        selectedMap.bounds as [[number, number], [number, number]],
        -mapRotate,
      )
    : cursorCoords;
  const handleMapClick = (latlng: [number, number]) => {
    if (activeTool === "polygon") setCurrentPoints((prev) => [...prev, latlng]);
    else if (activeTool === "point") {
      const newPoint: ReferencePoints = {
        id: `point_${Date.now()}`,
        type: pointConfig.type as any,
        entityId: pointConfig.entityId,
        geom: {
          type: "Point",
          coordinates: formatWKTPoint([latlng[1], latlng[0]]),
        },
        mapId: selectedMapId,
      };
      setSessionPoints((prev) => [...prev, newPoint]);
      setSnackbarMessage("Ponto adicionado à lista!");
      setSnackbarOpen(true);
      if (!isMarkerPanelOpen) setIsMarkerPanelOpen(true);
    }
  };

  const handleDeleteSessionPoint = (id: string) =>
    setSessionPoints((prev) => prev.filter((p) => p.id !== id));
  const handleClearSessionPoints = () => setSessionPoints([]);
  const handleCopySessionPoints = () => {
    navigator.clipboard
      .writeText(JSON.stringify(sessionPoints, null, 2))
      .then(() => {
        setSnackbarMessage("Toda a lista foi copiada!");
        setSnackbarOpen(true);
      });
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0b0b0b",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          position: "relative",
          height: "100%",
          "& .leaflet-top": {
            top: "39px",
            transition: "top 0.3s ease-in-out",
          },
        }}
      >
        {viewMode === "map" ? (
          <>
            {availableViews.length > 1 && (
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 1100,
                  bgcolor: "designTokens.colors.glassBg",
                  backdropFilter: "blur(12px)",
                  borderRadius: 2,
                  p: 0.5,
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, v) => v && setViewMode(v)}
                  size="small"
                >
                  {availableViews.includes("map") && (
                    <ToggleButton value="map" sx={{ px: 2 }}>
                      <MapIcon sx={{ mr: 1, fontSize: 18 }} /> MAPA
                    </ToggleButton>
                  )}
                  {availableViews.includes("dashboard") && (
                    <ToggleButton value="dashboard" sx={{ px: 2 }}>
                      <DashboardIcon sx={{ mr: 1, fontSize: 18 }} /> DASHBOARD
                    </ToggleButton>
                  )}
                </ToggleButtonGroup>
              </Box>
            )}
            <MapContainer
              key={`${gameId}-${selectedMapId}`}
              ref={mapRef}
              crs={customCRS}
              bounds={selectedMap.bounds as LatLngBoundsExpression}
              center={mapCenter}
              zoom={selectedMap.minZoom}
              maxZoom={selectedMap.maxZoom}
              style={{
                height: "100%",
                width: "100%",
                cursor: activeTool ? "crosshair" : "grab",
              }}
            >
              <Pane name="locationLabels" style={{ zIndex: 500 }} />
              <CursorTracker onMouseMove={setCursorCoords} />
              <MapEventsHandler onClick={handleMapClick} />
              {activeTool && (
                <CircleMarker
                  center={cursorCoords}
                  radius={activeTool === "point" ? 6 : 4}
                  pathOptions={{
                    color: "white",
                    fillColor:
                      activeTool === "point"
                        ? theme.palette.success.main
                        : theme.palette.primary.main,
                    fillOpacity: 1,
                    weight: 2,
                  }}
                  interactive={false}
                />
              )}
              {activeTool === "polygon" && currentPoints.length > 0 && (
                <>
                  <Polygon
                    positions={currentPoints}
                    pathOptions={{
                      color: theme.palette.primary.main,
                      fillColor: theme.palette.primary.main,
                      fillOpacity: 0.1,
                      weight: 2,
                      dashArray: "5, 5",
                    }}
                  />
                  <Polyline
                    positions={[
                      currentPoints[currentPoints.length - 1],
                      cursorCoords,
                    ]}
                    pathOptions={{
                      color: theme.palette.primary.main,
                      weight: 2,
                      dashArray: "5, 5",
                      opacity: 0.8,
                    }}
                    interactive={false}
                  />
                </>
              )}
              {selectedMap.type === "layered" &&
                selectedMap.urlPattern &&
                Array.from(
                  { length: selectedMap.layers || 1 },
                  (_, i) => i,
                ).map((l) => (
                  <ImageOverlay
                    key={l}
                    zIndex={l}
                    url={getPublicUrl(
                      selectedMap.urlPattern!.replace("{layer}", l.toString()),
                    )}
                    bounds={(previewBounds ?? selectedMap.bounds) as LatLngBoundsExpression}
                  />
                ))}
              {selectedMap.type === "single" && selectedMap.url && (
                <ImageOverlay
                  url={getPublicUrl(selectedMap.url)}
                  bounds={(previewBounds ?? selectedMap.bounds) as LatLngBoundsExpression}
                />
              )}
              {selectedMap.type === "tile" && selectedMap.url && (
                <TileLayer
                  url={getPublicUrl(selectedMap.url)}
                  minZoom={selectedMap.minZoom}
                  maxZoom={selectedMap.maxZoom}
                  minNativeZoom={selectedMap.tileMinZoom ?? 4}
                  maxNativeZoom={selectedMap.tileMaxZoom ?? 4}
                  noWrap={true}
                />
              )}

              {pointsOnCurrentMap
                .filter((point) => {
                  const pointEntityIds = new Set<string>();
                  if (point.entityId) pointEntityIds.add(point.entityId);
                  if (point.spawns) point.spawns.forEach(s => pointEntityIds.add(s.entityId));

                  const pointEntities = Array.from(pointEntityIds).map(id => entityLookup[id] || items.find(i => i.id === id)).filter(Boolean);

                  if (hideCollected && collectedPoints[point.id]) {
                    const firstEntity = pointEntities[0];
                    const respawnDelay = point.respawnDelay ?? (firstEntity && 'respawnDelay' in firstEntity ? (firstEntity as Entity).respawnDelay : undefined);
                    const mode = point.mode || "respawn";
                    const collectionTime = collectedPoints[point.id];

                    if (point.type === "spawn") {
                      if (mode === "respawn" && respawnDelay) {
                        const elapsedMs = now - collectionTime;
                        const totalMs = respawnDelay * 60 * 1000;
                        if (elapsedMs < totalMs) return false;
                      } else if (mode === "daily") {
                        const { lastReset } = getDailyResetTimes(now, gameInfo?.dailyResetTime);
                        if (collectionTime >= lastReset) return false;
                      } else if (mode === "weekly") {
                        const { lastReset } = getWeeklyResetTimes(now, gameInfo?.dailyResetTime, gameInfo?.weeklyResetDay);
                        if (collectionTime >= lastReset) return false;
                      } else {
                        return false;
                      }
                    } else {
                      return false;
                    }
                  }

                  if (!visibleTypes.includes(point.type)) return false;
                  
                  // Locations are only filtered by type, skipping entity/category checks
                  if (point.type !== "location") {
                    const hasVisible = Array.from(pointEntityIds).some(eId => {
                      if (!visibleEntities.includes(eId)) return false;
                      const entity = entityLookup[eId];
                      const categories = entity?.category
                        ? Array.isArray(entity.category)
                          ? entity.category
                          : [entity.category]
                        : ["desconhecido"];
                      
                      const hasVisibleCategory = categories.some(cat => visibleCategories.includes(cat));
                      if (!hasVisibleCategory) return false;
                      return true;
                    });
                    
                    if (!hasVisible) return false;
                  }

                  // 3. Event Filter
                  const pointEvent = point.event;
                  if (pointEvent && (!Array.isArray(pointEvent) || pointEvent.length > 0)) {
                    const eventArray = Array.isArray(pointEvent) ? pointEvent : [pointEvent];
                    const isAnyEventActive = eventArray.some(e => activeEventIds.includes(e));
                    if (!isAnyEventActive) return false;
                  }

                  return true;
                })
                .map((point) => {
                  if (point.geom.type === "Polygon") {
                    const coords = parseWKTPolygon(point.geom.coordinates);
                    const leafletCoords = coords.map((c): [number, number] => {
                      const raw: [number, number] = [c[1], c[0]];
                      return mapRotate ? rotateLatLng(raw, selectedMap.bounds as [[number,number],[number,number]], mapRotate) : raw;
                    });
                    return (
                      <Polygon
                        key={point.id}
                        positions={leafletCoords}
                        pathOptions={{
                          color:
                            point.type === "biome"
                              ? theme.palette.success.main
                              : theme.palette.primary.main,
                          fillOpacity: 0.1,
                          weight: 2,
                        }}
                        interactive={!activeTool && point.type !== "location"}
                      >
                        <Popup>
                          <Typography variant="subtitle2">
                            {point.name || point.id}
                          </Typography>
                          {point.description && (
                            <Typography variant="caption">
                              {point.description}
                            </Typography>
                          )}
                        </Popup>
                        {point.type === "location" && (
                          <Tooltip
                            permanent
                            direction="center"
                            className="location-label"
                            pane="locationLabels"
                          >
                            {point.name || point.id}
                          </Tooltip>
                        )}
                      </Polygon>
                    );
                  }

                  const pointEntityIds = new Set<string>();
                  if (point.entityId) pointEntityIds.add(point.entityId);
                  if (point.spawns) point.spawns.forEach(s => pointEntityIds.add(s.entityId));

                  const pointEntities = Array.from(pointEntityIds)
                  .map(id => id in entityLookup ? entityLookup[id] : items.find(i => i.id === id))
                  .filter(Boolean) as (Entity | Item)[];
                  
                  const visiblePointEntities = pointEntities.filter(ent => {
                    if (!visibleEntities.includes(ent.id)) return false;
                    const categories = ent.category
                      ? Array.isArray(ent.category)
                        ? ent.category
                        : [ent.category]
                      : ["desconhecido"];
                    return categories.some(cat => visibleCategories.includes(cat));
                  });

                  const entity = visiblePointEntities.length > 0 ? visiblePointEntities[0] : (pointEntities.length > 0 ? pointEntities[0] : undefined);
                  console.log("xabu", pointEntities);
                  const isCollectedInState = !!collectedPoints[point.id];
                  const collectionTime = collectedPoints[point.id];
                  const respawnDelay = point.respawnDelay ?? (entity && 'respawnDelay' in entity ? (entity as Entity).respawnDelay : undefined);
                  
                  let isCollected = isCollectedInState;
                  let backgroundStyle = `background: white;`;
                  let innerColor = `white`;
                  let borderWidth = 0;

                  if (isCollectedInState && point.type === "spawn") {
                    const mode = point.mode || "respawn";
                    
                    if (mode === "respawn" && respawnDelay) {
                      const elapsedMs = now - collectionTime;
                      const totalMs = respawnDelay * 60 * 1000;
                      
                      if (elapsedMs >= totalMs) {
                        isCollected = false;
                      } else {
                        const percentage = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
                        backgroundStyle = `background: conic-gradient(#4caf50 ${percentage}%, #e0e0e0 ${percentage}%);`;
                        innerColor = "white"; 
                        borderWidth = 6; 
                      }
                    } else if (mode === "daily") {
                      const { lastReset, nextReset } = getDailyResetTimes(now, gameInfo?.dailyResetTime);
                      if (collectionTime < lastReset) {
                        isCollected = false;
                      } else {
                        const totalMs = nextReset - lastReset;
                        const elapsedMs = now - lastReset;
                        const percentage = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
                        backgroundStyle = `background: conic-gradient(#4caf50 ${percentage}%, #e0e0e0 ${percentage}%);`;
                        innerColor = "white"; 
                        borderWidth = 6; 
                      }
                    } else if (mode === "weekly") {
                      const { lastReset, nextReset } = getWeeklyResetTimes(now, gameInfo?.dailyResetTime, gameInfo?.weeklyResetDay);
                      if (collectionTime < lastReset) {
                        isCollected = false;
                      } else {
                        const totalMs = nextReset - lastReset;
                        const elapsedMs = now - lastReset;
                        const percentage = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
                        backgroundStyle = `background: conic-gradient(#4caf50 ${percentage}%, #e0e0e0 ${percentage}%);`;
                        innerColor = "white"; 
                        borderWidth = 6; 
                      }
                    }
                  }

                  const hasIcon = !!point.icon || !!entity?.icon;
                  let finalBackgroundStyle = backgroundStyle;
                  let finalInnerColor = innerColor;
                  let finalBorderWidth = borderWidth;
                  if (!hasIcon) {
                    finalInnerColor = "#2196f3";
                    if (borderWidth === 0) {
                      finalBackgroundStyle = "background: #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.4);";
                      finalBorderWidth = 3; // leaves a 1px white border on each side
                    }
                  }

                  let imageStyle = "";
                  if (!hasIcon) {
                    imageStyle = "display: none;";
                  } else if (isCollected) {
                    imageStyle = "opacity: 0.4; filter: grayscale(100%);";
                  }

                  const currentMarkerSize = hasIcon ? sizeMarker : 14;

                  return (
                    <StableMarker
                      key={point.id}
                      point={point}
                      size={currentMarkerSize}
                      entity={entity}
                      mapBounds={selectedMap.bounds as [[number,number],[number,number]]}
                      rotate={mapRotate}
                      iconHtml={markerTemplate
                        .replaceAll(
                          "{{ICON_URL}}",
                          hasIcon
                            ? getPublicUrl(point.icon || entity?.icon || "")
                            : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'></svg>",
                        )
                        .replaceAll("{{CLASS_NAME}}", "custom-entity-icon")
                        .replaceAll("{{BACKGROUND_STYLE}}", finalBackgroundStyle)
                        .replaceAll("{{INNER_COLOR}}", finalInnerColor)
                        .replaceAll("{{BORDER_WIDTH}}", finalBorderWidth.toString())
                        .replaceAll("{{SIZE}}", currentMarkerSize.toString())
                        .replaceAll("{{IMAGE_STYLE}}", imageStyle)}
                      onExpand={() => {
                        const targetId = point.entityId || (point.spawns && point.spawns.length > 0 ? point.spawns[0].entityId : undefined);
                        if (targetId) {
                          handlePush({ type: "entity", id: targetId });
                        }
                      }}
                      categoriesMap={categoriesMap}
                      interactive={!activeTool && point.type !== "location"}
                      isCollected={isCollected}
                      onToggleCollected={() => handleToggleCollected(point.id, isCollected)}
                    />
                  );
                })}

              {/* Session Points */}
              {sessionPoints
                .filter((p) => p.mapId === selectedMapId)
                .map((point) => {
                  return (
                    <StableMarker
                      key={point.id}
                      point={point}
                      size={sizeMarker}
                      mapBounds={selectedMap.bounds as [[number,number],[number,number]]}
                      rotate={mapRotate}
                      entity={
                        point.entityId ? (entityLookup[point.entityId] || items.find((i) => i.id === point.entityId)) : undefined
                      }
                      iconHtml={markerTemplate
                        .replaceAll(
                          "{{ICON_URL}}",
                          getPublicUrl("/img/add.png"),
                        )
                        .replaceAll("{{CLASS_NAME}}", "session-point-icon")
                        .replaceAll("{{BACKGROUND_STYLE}}", `background: ${theme.palette.primary.main};`)
                        .replaceAll("{{INNER_COLOR}}", theme.palette.primary.main)
                        .replaceAll("{{BORDER_WIDTH}}", "0")
                        .replaceAll("{{SIZE}}", sizeMarker.toString())
                        .replaceAll("{{IMAGE_STYLE}}", "opacity: 0.8;")}
                      categoriesMap={categoriesMap}
                      interactive={!activeTool}
                    />
                  );
                })}
            </MapContainer>
            <MapFilterDrawer
              referencePoints={pointsOnCurrentMap}
              entities={entities}
              items={items}
              visibleTypes={visibleTypes}
              setVisibleTypes={setVisibleTypes}
              visibleCategories={visibleCategories}
              setVisibleCategories={setVisibleCategories}
              visibleEntities={visibleEntities}
              setVisibleEntities={setVisibleEntities}
              hideCollected={hideCollected}
              setHideCollected={setHideCollected}
            />
          </>
        ) : (
          <MapDashboard
            gameId={gameId!}
            selectedMapId={selectedMapId}
            availableViews={availableViews}
            onSelectEntity={(id) => handlePush({ type: "entity", id })}
            onSwitchToMap={() => setViewMode("map")}
          />
        )}
        {viewMode === "map" && (
          <MapInfoOverlay
            gameName={gameInfo?.name || ""}
            coords={displayCoords}
            maps={maps}
            selectedMapId={selectedMapId}
            onSelectMap={setSelectedMapId}
          />
        )}
      </Box>

      {navigationStack.length > 0 && (
        <InfoDrawer
          stack={navigationStack}
          entities={entities}
          items={items}
          referencePoints={referencePoints}
          shops={shops}
          maps={maps}
          onSelectMap={setSelectedMapId}
          onPush={handlePush}
          onPop={() => setNavigationStack((s) => s.slice(0, -1))}
          onClose={() => setNavigationStack([])}
          categoriesMap={categoriesMap}
        />
      )}
      {viewMode === "map" && (
        <Box sx={{ position: "absolute", top: 12, right: 12, zIndex: 1100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <MapWeatherPanel
            availableWeathers={events.filter(e => e.type === "clima" && (!selectedMap?.availableWeathers || selectedMap.availableWeathers.includes(e.id)))}
            activeWeatherIds={activeEventIds.filter(id => {
              const event = events.find(e => e.id === id);
              return event?.type === "clima" && (!selectedMap?.availableWeathers || selectedMap.availableWeathers.includes(id));
            })}
            onToggleWeather={(weatherId) => {
              toggleEvent(weatherId);
            }}
            onClearWeathers={() => {
              // Deactivate all clima events that are available for this map and currently active
              const mapWeatherIds = selectedMap?.availableWeathers || events.filter(e => e.type === "clima").map(e => e.id);
              const activeMapWeathers = mapWeatherIds.filter(id => activeEventIds.includes(id));
              
              activeMapWeathers.forEach(id => {
                toggleEvent(id);
              });
            }}
          />

          <Box sx={{ position: "relative" }}>
            {isBoundBoxEditorOpen && (
              <BoundBoxEditorPanel
                selectedMap={selectedMap}
                open={isBoundBoxEditorOpen}
                onClose={() => setIsBoundBoxEditorOpen(false)}
                onApply={(b) => setPreviewBounds(b)}
                appliedBounds={previewBounds}
              />
            )}
            <MapToolbox
              activeTool={activeTool}
              hasPoints={currentPoints.length > 0}
              onSelectTool={handleSelectTool}
              onConfirm={() => {
                const newZone: ReferencePoints = {
                  id: `zone_${Date.now()}`,
                  type: (pointConfig.type as any) || "biome",
                  entityId: pointConfig.entityId,
                  geom: {
                    type: "Polygon",
                    coordinates: formatWKTPolygon(
                      currentPoints.map((p) => [p[1], p[0]]),
                    ),
                  },
                  mapId: selectedMapId,
                };
                setSessionPoints((prev) => [...prev, newZone]);
                setSnackbarMessage("Zona adicionada à lista!");
                setSnackbarOpen(true);
                setActiveTool(null);
                setCurrentPoints([]);
              }}
              onClear={() => setCurrentPoints([])}
              onCancel={() => {
                setActiveTool(null);
                setCurrentPoints([]);
              }}
              sessionCount={sessionPoints.length}
              isPanelOpen={isMarkerPanelOpen}
              onTogglePanel={() => setIsMarkerPanelOpen(!isMarkerPanelOpen)}
              isBoundBoxEditorOpen={isBoundBoxEditorOpen}
              onToggleBoundBoxEditor={() => setIsBoundBoxEditorOpen(v => !v)}
            />
          </Box>
        </Box>
      )}


      <PointMarkerPanel
        open={isMarkerPanelOpen}
        onClose={() => setIsMarkerPanelOpen(false)}
        sessionPoints={sessionPoints}
        onDeletePoint={handleDeleteSessionPoint}
        onClearPoints={handleClearSessionPoints}
        onCopyAll={handleCopySessionPoints}
        pointConfig={pointConfig}
        onConfigChange={setPointConfig}
        entities={entities}
        items={items}
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="info"
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
