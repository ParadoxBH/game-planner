import {
  Box,
  Typography,
  Stack,
  Snackbar,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Button,
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
} from "../../types/gameModels";
import {
  parseWKTPoint,
  parseWKTPolygon,
  formatWKTPoint,
  formatWKTPolygon,
} from "../../utils/wkt";
import { MapToolbox } from "./MapToolbox";
import { MapDashboard } from "./MapDashboard";
import MapIcon from "@mui/icons-material/Map";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { mapRepository } from "../../repositories/MapRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { referencePointRepository } from "../../repositories/ReferencePointRepository";
import { shopRepository } from "../../repositories/ShopRepository";
import { getPublicUrl } from "../../utils/pathUtils";
import { PointMarkerPanel } from "./PointMarkerPanel";
import { MapFilterDrawer } from "./MapFilterDrawer";
import markerTemplate from "./marker-icon.html?raw";

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
  iconHtml: string;
  size: number;
  onExpand?: () => void;
  onDelete?: () => void;
}

const StableMarker = React.memo(
  ({
    point,
    entity,
    iconHtml,
    size,
    onExpand,
    onDelete,
  }: StableMarkerProps) => {
    const cp = parseWKTPoint(point.geom.coordinates);
    const pos: [number, number] = [cp[1], cp[0]];

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
      <Marker position={pos} icon={icon}>
        <Popup
          sx={{
            backgroundColor: theme.designTokens.colors.glassBg,
            backdropFilter: theme.designTokens.colors.glassFilter,
          }}
        >
          {point.id.startsWith("point_") ? (
            <>
              <Typography variant="subtitle2" color="success.main">
                Ponto na Sessão
              </Typography>
              <Typography variant="body2">
                {entity?.name || point.entityId}
              </Typography>
              <Typography variant="caption" display="block">
                {point.type}
              </Typography>
              {onDelete && (
                <Button
                  size="small"
                  color="error"
                  onClick={onDelete}
                  sx={{ mt: 1 }}
                >
                  Remover
                </Button>
              )}
            </>
          ) : (
            <SimplifiedEntity
              entity={
                entity || {
                  id: point.entityId,
                  name: point.name || point.entityId,
                  category: point.type || "resource",
                  icon: point.icon,
                }
              }
              position={pos}
              mode={point.mode}
              respawnDelay={point.respawnDelay}
              onExpand={onExpand || (() => {})}
            />
          )}
        </Popup>
      </Marker>
    );
  },
);

import { MapInfoOverlay } from "./MapInfoOverlay";
import { theme } from "../../theme/theme";

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

  // Improved Point Marker States
  const [sessionPoints, setSessionPoints] = useState<ReferencePoints[]>([]);
  const [pointConfig, setPointConfig] = useState({
    type: "poi",
    entityId: "TODO",
  });
  const [isMarkerPanelOpen, setIsMarkerPanelOpen] = useState(false);

  // Filter States
  const [visibleTypes, setVisibleTypes] = useState<string[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [visibleEntities, setVisibleEntities] = useState<string[]>([]);
  const [hasInitializedFilters, setHasInitializedFilters] = useState(false);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [referencePoints, setReferencePoints] = useState<ReferencePoints[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [maps, setMaps] = useState<MapMetadata[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const selectedMapId = urlMapId || "";

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
      loadGamesList(),
    ])
      .then(
        ([
          allEntities,
          allRefPoints,
          allShops,
          allMaps,
          allItems,
          allGames,
        ]) => {
          if (!isMounted) return;

          setEntities(allEntities);
          setReferencePoints(allRefPoints);
          setShops(allShops);
          setMaps(allMaps);
          setItems(allItems);

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
    const lookup: Record<string, Entity> = {};
    entities.forEach((e) => {
      lookup[e.id] = e;
    });
    return lookup;
  }, [entities]);

  // Initialize filters once data is loaded
  useEffect(() => {
    if (dataLoading || hasInitializedFilters || pointsOnCurrentMap.length === 0)
      return;

    const types = Array.from(new Set(pointsOnCurrentMap.map((p) => p.type)));
    const categories: string[] = [];
    const entityIds: string[] = [];

    pointsOnCurrentMap.forEach((p) => {
      entityIds.push(p.entityId);
      const entity =
        entityLookup[p.entityId] || items.find((i) => i.id === p.entityId);
      const category = entity?.category
        ? Array.isArray(entity.category)
          ? entity.category[0]
          : entity.category
        : "desconhecido";
      categories.push(category);
    });

    setVisibleTypes(types);
    setVisibleCategories(Array.from(new Set(categories)));
    setVisibleEntities(Array.from(new Set(entityIds)));
    setHasInitializedFilters(true);
  }, [
    dataLoading,
    pointsOnCurrentMap,
    entityLookup,
    items,
    hasInitializedFilters,
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
                    bounds={selectedMap.bounds as LatLngBoundsExpression}
                  />
                ))}
              {selectedMap.type === "single" && selectedMap.url && (
                <ImageOverlay
                  url={getPublicUrl(selectedMap.url)}
                  bounds={selectedMap.bounds as LatLngBoundsExpression}
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
                  if (!visibleTypes.includes(point.type)) return false;
                  if (!visibleEntities.includes(point.entityId)) return false;

                  const entity =
                    entityLookup[point.entityId] ||
                    items.find((i) => i.id === point.entityId);
                  const category = entity?.category
                    ? Array.isArray(entity.category)
                      ? entity.category[0]
                      : entity.category
                    : "desconhecido";
                  if (!visibleCategories.includes(category)) return false;

                  return true;
                })
                .map((point) => {
                  if (point.geom.type === "Polygon") {
                    const coords = parseWKTPolygon(point.geom.coordinates);
                    return (
                      <Polygon
                        key={point.id}
                        positions={coords.map((c) => [c[1], c[0]])}
                        pathOptions={{
                          color:
                            point.type === "biome"
                              ? theme.palette.success.main
                              : theme.palette.primary.main,
                          fillOpacity: 0.1,
                          weight: 2,
                        }}
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
                      </Polygon>
                    );
                  }

                  const entity =
                    entityLookup[point.entityId] ||
                    items.find((i) => i.id === point.entityId);
                  return (
                    <StableMarker
                      key={point.id}
                      point={point}
                      size={sizeMarker}
                      entity={
                        entityLookup[point.entityId] ||
                        items.find((i) => i.id === point.entityId)
                      }
                      iconHtml={markerTemplate
                        .replaceAll(
                          "{{ICON_URL}}",
                          getPublicUrl(
                            point.icon ||
                              entity?.icon ||
                              "/img/placeholder.png",
                          ),
                        )
                        .replaceAll("{{CLASS_NAME}}", "custom-entity-icon")
                        .replaceAll("{{COLOR}}", "white")
                        .replaceAll("{{SIZE}}", sizeMarker.toString())
                        .replaceAll("{{IMAGE_STYLE}}", "")}
                      onExpand={() =>
                        handlePush({ type: "entity", id: point.entityId })
                      }
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
                      entity={
                        entityLookup[point.entityId] ||
                        items.find((i) => i.id === point.entityId)
                      }
                      iconHtml={markerTemplate
                        .replaceAll(
                          "{{ICON_URL}}",
                          getPublicUrl("/img/add.png"),
                        )
                        .replaceAll("{{CLASS_NAME}}", "session-point-icon")
                        .replaceAll("{{COLOR}}", theme.palette.primary.main)
                        .replaceAll("{{SIZE}}", sizeMarker.toString())
                        .replaceAll("{{IMAGE_STYLE}}", "opacity: 0.8;")}
                      onDelete={() => handleDeleteSessionPoint(point.id)}
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
            coords={cursorCoords}
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
        />
      )}
      {viewMode === "map" && (
        <MapToolbox
          activeTool={activeTool}
          hasPoints={currentPoints.length > 0}
          onSelectTool={setActiveTool}
          onConfirm={() => {
            navigator.clipboard.writeText(
              JSON.stringify(
                {
                  id: `zone_${Date.now()}`,
                  geom: {
                    type: "Polygon",
                    coordinates: formatWKTPolygon(
                      currentPoints.map((p) => [p[1], p[0]]),
                    ),
                  },
                  mapId: selectedMapId,
                },
                null,
                2,
              ),
            );
            setSnackbarMessage("Zona copiada!");
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
        />
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
