import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip as TooltipReact,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LaunchIcon from "@mui/icons-material/Launch";
import MapIcon from "@mui/icons-material/Map";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { useTheme } from "@mui/material/styles";
import { divIcon, type LatLngBoundsExpression } from "leaflet";
import {
  CircleMarker,
  ImageOverlay,
  MapContainer,
  Marker,
  Pane,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  MAX_PAGE_SIZE,
  type CategoryDocument,
  type EntityDocument,
  type EventDocument,
  type ItemDocument,
  type LocationDocument,
  type MapDocument,
  type MapMarker,
  type MediaLink,
} from "../../api/content";
import { contentRoute, currentMedia, mediaUrl } from "../../api/references";
import { useContentDocument, useContentList, useGame, useListing, useMapMarkers } from "../../api/useContent";
import { and, rule } from "../../api/query";
import { useEventFilter } from "../../context/EventFilterContext";
import { useStoredState } from "../../hooks/useCollectedMembers";
import { useGameAdmin, useGameEditor } from "../../hooks/useGameAdmin";
import { usePlatform } from "../../hooks/usePlatform";
import { getPublicUrl } from "../../utils/pathUtils";
import { getDailyResetTimes, getWeeklyResetTimes } from "../../utils/timeUtils";
import { formatWKTPoint, formatWKTPolygon, parseWKTAreas, parseWKTPoint, rotateLatLng } from "../../utils/wkt";
import { BoundBoxEditorPanel, type Bounds as BoundBoxBounds } from "./BoundBoxEditorPanel";
import { InfoDrawer } from "./InfoDrawer";
import { MapDashboard } from "./MapDashboard";
import { computeFilterStats, locationTypeOf, MapFilterDrawer, occupantCategory, SPAWN_TYPE } from "./MapFilterDrawer";
import { MapFormDialog } from "./MapFormDialog";
import { MapInfoOverlay } from "./MapInfoOverlay";
import { MapSpawnPopup } from "./MapSpawnPopup";
import { MapToolbox } from "./MapToolbox";
import { MapWeatherPanel } from "./MapWeatherPanel";
import { createMapCRS, leafletBounds, mapImageUrl, type LatLngBounds } from "./mapGeometry";
import markerTemplate from "./marker-icon.html?raw";
import { MapContentDialog, type DrawnGeometry } from "./MapContentDialog";

export interface NavigationItem {
  type: "entity" | "item";
  id: string;
}

const MARKER_SIZE = 32;
const EMPTY_MARKERS: MapMarker[] = [];
const EMPTY_LOCATIONS: LocationDocument[] = [];
const DEFAULT_BOUNDS: LatLngBounds = [
  [0, 0],
  [1000, 1000],
];
/** Locais desenhados com o nome fixo e sem clique; os demais tipos abrem popup. */
const LABELED_LOCATION_TYPES = new Set(["location", "region"]);
const TRANSPARENT_PIXEL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'></svg>";

const CursorTracker = ({ onMouseMove }: { onMouseMove: (coords: [number, number]) => void }) => {
  useMapEvents({
    mousemove(event) {
      onMouseMove([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
};

/** Enter fecha a zona desenhada; Esc desiste dela. O mesmo que os botões da caixa de ferramentas. */
const DrawKeyboard = ({ onFinish, onCancel }: { onFinish: () => void; onCancel: () => void }) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") onFinish();
      else if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFinish, onCancel]);
  return null;
};

const MapEventsHandler = ({ onClick, onDoubleClick }: { onClick: (coords: [number, number]) => void; onDoubleClick: () => void }) => {
  useMapEvents({
    click(event) {
      if (!event.originalEvent.shiftKey) onClick([event.latlng.lat, event.latlng.lng]);
    },
    dblclick() {
      onDoubleClick();
    },
  });
  return null;
};

interface StableMarkerProps {
  position: [number, number];
  iconHtml: string;
  size: number;
  className: string;
  interactive: boolean;
  children?: React.ReactNode;
}

const StableMarker = ({ position, iconHtml, size, className, interactive, children }: StableMarkerProps) => {
  const icon = useMemo(() => divIcon({ html: iconHtml, iconAnchor: [size / 2, size / 2], className }), [iconHtml, size, className]);
  return (
    <Marker position={position} icon={icon} interactive={interactive}>
      {children}
    </Marker>
  );
};

interface MarkerStyle {
  background: string;
  inner: string;
  border: number;
  image: string;
}

function markerIconHtml(iconUrl: string | null, style: MarkerStyle, size: number, className: string): string {
  return markerTemplate
    .replaceAll("{{ICON_URL}}", iconUrl ?? TRANSPARENT_PIXEL)
    .replaceAll("{{CLASS_NAME}}", className)
    .replaceAll("{{BACKGROUND_STYLE}}", style.background)
    .replaceAll("{{INNER_COLOR}}", style.inner)
    .replaceAll("{{BORDER_WIDTH}}", String(style.border))
    .replaceAll("{{SIZE}}", String(size))
    .replaceAll("{{IMAGE_STYLE}}", style.image);
}

interface CollectedState {
  collected: boolean;
  /** Quanto do tempo até reaparecer já passou, de 0 a 100; nulo quando não há contagem. */
  percent: number | null;
}

/** Situação de um ponto marcado como coletado, pelo modo de respawn e pelos horários de reset do jogo. */
function collectedState(marker: MapMarker, collectedAt: number | undefined, now: number, resetTime?: string, resetDay?: number): CollectedState {
  if (!collectedAt) return { collected: false, percent: null };
  const mode = marker.respawnMode ?? "respawn";
  if (mode === "respawn") {
    if (!marker.respawnDelayMinutes) return { collected: true, percent: null };
    const total = marker.respawnDelayMinutes * 60_000;
    const elapsed = now - collectedAt;
    return elapsed >= total ? { collected: false, percent: null } : { collected: true, percent: (elapsed / total) * 100 };
  }
  if (mode === "daily" || mode === "weekly") {
    const { lastReset, nextReset } =
      mode === "daily" ? getDailyResetTimes(now, resetTime) : getWeeklyResetTimes(now, resetTime, resetDay);
    if (collectedAt < lastReset) return { collected: false, percent: null };
    return { collected: true, percent: ((now - lastReset) / (nextReset - lastReset)) * 100 };
  }
  return { collected: true, percent: null };
}

interface FilterBannerProps {
  label: string;
  document: { name: string; media: MediaLink[] } | undefined;
  onOpen: () => void;
  onClear: () => void;
}

/** Aviso de filtro vindo da URL (?item= ou ?entity=), com atalho para a página e para remover. */
function FilterBanner({ label, document, onOpen, onClear }: FilterBannerProps) {
  const theme = useTheme() as any;
  const { isMobile } = usePlatform();
  const iconId = document ? currentMedia(document.media, "icon") ?? currentMedia(document.media, "screenshot") : null;
  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: theme.designTokens.colors.glassBg,
        backdropFilter: theme.designTokens.colors.glassFilter,
        borderRadius: 1,
        border: 1,
        borderColor: "primary.main",
        color: "text.primary",
        p: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: isMobile ? "auto" : "400px",
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar
          src={iconId ? mediaUrl(iconId) : undefined}
          variant="rounded"
          sx={{ width: 40, height: 40, bgcolor: "rgba(0,0,0,0.3)", border: 1, borderColor: "divider" }}
        />
        <Stack>
          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 800 }}>
            {label}
          </Typography>
          <Typography variant="subtitle2" fontWeight={700}>
            {document?.name ?? "..."}
          </Typography>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={0.5}>
        <TooltipReact title="Detalhar" disableInteractive placement="top">
          <IconButton onClick={onOpen} size="small" sx={{ color: "text.secondary" }}>
            <LaunchIcon fontSize="small" />
          </IconButton>
        </TooltipReact>
        <TooltipReact title="Remover filtro" disableInteractive placement="top">
          <IconButton onClick={onClear} size="small" sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </TooltipReact>
      </Stack>
    </Paper>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", width: "100%", gap: 2 }}>
      <CircularProgress color="primary" />
      <Typography>{text}</Typography>
    </Box>
  );
}

/** Mapa do jogo lido da API: imagem ou tiles, pontos de spawn, áreas dos locais, climas e ferramentas de marcação. */
export const MapView = () => {
  const theme = useTheme() as any;
  const { gameId = "", mapId: urlMapId, view: urlView } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterItemId = searchParams.get("item");
  const filterEntityId = searchParams.get("entity");
  const { isMobile } = usePlatform();
  const { activeEventIds, toggleEvent } = useEventFilter();

  const [cursorCoords, setCursorCoords] = useState<[number, number]>([0, 0]);
  const [navigationStack, setNavigationStack] = useState<NavigationItem[]>([]);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<"point" | "polygon" | null>(null);
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const [isBoundBoxEditorOpen, setIsBoundBoxEditorOpen] = useState(false);
  const { isAdmin } = useGameAdmin(gameId);
  const { canEdit } = useGameEditor(gameId);
  const [isEditingMap, setIsEditingMap] = useState(false);
  const [previewBounds, setPreviewBounds] = useState<BoundBoxBounds | null>(null);
  // O que acabou de ser desenhado e espera o registro; nulo, nada em aberto.
  const [drawn, setDrawn] = useState<DrawnGeometry | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<string[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [visibleEntities, setVisibleEntities] = useState<string[]>([]);
  const [filtersFor, setFiltersFor] = useState<string | null>(null);
  const [hideCollected, setHideCollected] = useState(false);
  const [collectedPoints, setCollectedPoints] = useStoredState<Record<string, number>>(`collected_points_${gameId}`, {});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const maps = useContentList<MapDocument>(gameId, "maps", { size: MAX_PAGE_SIZE, sort: "name" });
  const game = useGame(gameId);
  const mapList = maps.data?.content;
  const selectedMap = mapList?.find((map) => map.extId === urlMapId);
  const selectedMapId = selectedMap?.extId;
  const urlFiltered = Boolean(filterItemId || filterEntityId);

  const markerFilter = useMemo(
    () =>
      and(
        filterItemId && rule("yields", "equal", `item:${filterItemId}`),
        filterEntityId && rule("occupant", "equal", `entity:${filterEntityId}`),
      ),
    [filterItemId, filterEntityId],
  );
  const markers = useMapMarkers(gameId, selectedMapId, markerFilter);
  const locations = useListing<LocationDocument>(
    gameId,
    "locations",
    { size: MAX_PAGE_SIZE, where: and(selectedMapId && rule("map", "equal", selectedMapId)) },
    { enabled: Boolean(selectedMapId) },
  );
  const events = useContentList<EventDocument>(gameId, "events", { size: MAX_PAGE_SIZE, sort: "name" });
  const categories = useContentList<CategoryDocument>(gameId, "categories", { size: MAX_PAGE_SIZE, sort: "name" });
  const filterItem = useContentDocument<ItemDocument>(gameId, "items", filterItemId);
  const filterEntity = useContentDocument<EntityDocument>(gameId, "entities", filterEntityId);

  const markerList = markers.data?.content ?? EMPTY_MARKERS;
  const locationList = locations.data?.content ?? EMPTY_LOCATIONS;
  const stats = useMemo(() => computeFilterStats(markerList, locationList), [markerList, locationList]);
  const categoryNames = useMemo(
    () => new Map((categories.data?.content ?? []).map((category) => [category.extId, category.name])),
    [categories.data],
  );

  const bounds = useMemo<LatLngBounds>(() => (selectedMap ? leafletBounds(selectedMap) : DEFAULT_BOUNDS), [selectedMap]);
  const rotate = selectedMap?.rotate ?? 0;
  const crs = useMemo(() => createMapCRS(bounds, selectedMap?.tiles ?? null), [bounds, selectedMap]);
  const availableViews = selectedMap && selectedMap.availableViews.length > 0 ? selectedMap.availableViews : ["map", "dashboard"];
  const defaultView = selectedMap?.defaultView ?? availableViews[0] ?? "map";
  const viewMode = urlView ?? defaultView;

  /** Coordenadas de jogo (x, y) para a posição desenhada, com a rotação do mapa. */
  const toLatLng = useCallback(
    (x: number, y: number): [number, number] => (rotate ? rotateLatLng([y, x], bounds, rotate) : [y, x]),
    [rotate, bounds],
  );

  // Sem mapa na URL, abre o primeiro na visão padrão dele.
  useEffect(() => {
    if (urlMapId || !mapList || mapList.length === 0) return;
    const first = mapList[0];
    navigate(`/game/${gameId}/map/${encodeURIComponent(first.extId)}/${first.defaultView ?? first.availableViews[0] ?? "map"}`, {
      replace: true,
    });
  }, [urlMapId, mapList, gameId, navigate]);

  // Visão que o mapa não oferece volta para a padrão.
  useEffect(() => {
    if (selectedMap && !availableViews.includes(viewMode)) {
      navigate(`/game/${gameId}/map/${encodeURIComponent(selectedMap.extId)}/${defaultView}`, { replace: true });
    }
  }, [selectedMap, viewMode, availableViews.join(","), defaultView, gameId, navigate]);

  useEffect(() => {
    setPreviewBounds(null);
  }, [selectedMapId]);

  // Filtros de partida, uma vez por mapa: os padrões do mapa ou tudo que há nele.
  useEffect(() => {
    if (!selectedMap || !markers.data || !locations.data || urlFiltered || filtersFor === selectedMap.extId) return;
    const defaults = selectedMap.defaultFilters;
    const hasEntityDefaults = defaults.entities.length > 0 || defaults.categories.length > 0;
    const entities = new Set(defaults.entities);
    stats.categories.forEach(([category, data]) => {
      if (!hasEntityDefaults || defaults.categories.includes(category)) {
        Object.keys(data.entities).forEach((id) => entities.add(id));
      }
    });
    setVisibleTypes(defaults.types.length > 0 ? defaults.types : stats.types.map(([type]) => type));
    setVisibleCategories(defaults.categories.length > 0 ? defaults.categories : stats.categories.map(([category]) => category));
    setVisibleEntities([...entities]);
    setFiltersFor(selectedMap.extId);
  }, [selectedMap, markers.data, locations.data, urlFiltered, filtersFor, stats]);

  const pushNavigation = useCallback((item: NavigationItem) => setNavigationStack((stack) => [...stack, item]), []);

  const toggleCollected = useCallback(
    (id: string, wasCollected: boolean) => {
      const next = { ...collectedPoints };
      if (wasCollected) delete next[id];
      else next[id] = Date.now();
      setCollectedPoints(next);
    },
    [collectedPoints, setCollectedPoints],
  );

  const resetTime = game.data?.dailyResetTime ?? undefined;
  const resetDay = game.data?.weeklyResetDay ?? undefined;

  const markerElements = useMemo(
    () =>
      markerList.map((marker) => {
        const state = collectedState(marker, collectedPoints[marker.extId], now, resetTime, resetDay);
        if (hideCollected && state.collected) return null;
        if (!urlFiltered) {
          if (!visibleTypes.includes(SPAWN_TYPE)) return null;
          const anyVisible = marker.occupants.some(
            (occupant) => visibleEntities.includes(occupant.extId) && visibleCategories.includes(occupantCategory(occupant)),
          );
          if (marker.occupants.length > 0 && !anyVisible) return null;
        }

        const shown = marker.occupants.find((occupant) => visibleEntities.includes(occupant.extId)) ?? marker.occupants[0];
        const iconId = marker.iconMediaId ?? shown?.iconMediaId ?? null;
        const style: MarkerStyle = {
          background: "background: white;",
          inner: "white",
          border: 0,
          image: state.collected ? "opacity: 0.4; filter: grayscale(100%);" : "",
        };
        if (state.collected && state.percent !== null) {
          style.background = `background: conic-gradient(#4caf50 ${state.percent}%, #e0e0e0 ${state.percent}%);`;
          style.border = 6;
        }
        let size = MARKER_SIZE;
        if (!iconId) {
          size = 14;
          style.inner = "#2196f3";
          style.image = "display: none;";
          if (style.border === 0) {
            style.background = "background: #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.4);";
            style.border = 3;
          }
        }

        const [x, y] = parseWKTPoint(marker.position);
        return (
          <StableMarker
            key={marker.extId}
            position={toLatLng(x, y)}
            size={size}
            className="custom-entity-icon"
            interactive={!activeTool}
            iconHtml={markerIconHtml(iconId ? mediaUrl(iconId) : null, style, size, "custom-entity-icon")}
          >
            <Popup>
              <MapSpawnPopup
                gameId={gameId}
                marker={marker}
                isCollected={state.collected}
                onToggleCollected={() => toggleCollected(marker.extId, state.collected)}
                onExpand={(type, id) => pushNavigation({ type, id })}
              />
            </Popup>
          </StableMarker>
        );
      }),
    [
      markerList,
      collectedPoints,
      now,
      resetTime,
      resetDay,
      hideCollected,
      urlFiltered,
      visibleTypes,
      visibleEntities,
      visibleCategories,
      toLatLng,
      activeTool,
      gameId,
      toggleCollected,
      pushNavigation,
    ],
  );

  const locationElements = useMemo(
    () =>
      (urlFiltered ? EMPTY_LOCATIONS : locationList).map((location) => {
        const type = locationTypeOf(location);
        if (!visibleTypes.includes(type) || !location.area) return null;
        const name = location.name ?? location.extId;
        const labeled = LABELED_LOCATION_TYPES.has(type);
        const color = type === "biome" ? theme.palette.success.main : theme.palette.primary.main;
        const content = labeled ? (
          <Tooltip permanent direction="center" className="location-label" pane="locationLabels">
            {name}
          </Tooltip>
        ) : (
          <Popup>
            <Typography variant="subtitle2">{name}</Typography>
            {location.summary && <Typography variant="caption">{location.summary}</Typography>}
          </Popup>
        );

        if (location.area.trim().toUpperCase().startsWith("POINT")) {
          const [x, y] = parseWKTPoint(location.area);
          return (
            <CircleMarker
              key={location.extId}
              center={toLatLng(x, y)}
              radius={6}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.6, weight: 2 }}
              interactive={!activeTool && !labeled}
            >
              {content}
            </CircleMarker>
          );
        }
        const positions = parseWKTAreas(location.area).map((polygon) => polygon.map((ring) => ring.map(([x, y]) => toLatLng(x, y))));
        if (positions.length === 0) return null;
        return (
          <Polygon
            key={location.extId}
            positions={positions}
            pathOptions={{ color, fillOpacity: 0.1, weight: 2 }}
            interactive={!activeTool && !labeled}
          >
            {content}
          </Polygon>
        );
      }),
    [urlFiltered, locationList, visibleTypes, toLatLng, activeTool, theme],
  );

  if (maps.isPending) return <Loading text="Carregando mapa..." />;
  if (maps.isError) {
    return (
      <Stack sx={{ p: 4 }}>
        <Typography color="error">{maps.error.message}</Typography>
      </Stack>
    );
  }
  if (maps.data.content.length === 0) {
    return (
      <Stack sx={{ p: 4 }}>
        <Typography>Nenhum mapa cadastrado para este jogo.</Typography>
      </Stack>
    );
  }
  if (!urlMapId) return <Loading text="Abrindo mapa..." />;
  if (!selectedMap) {
    return (
      <Stack sx={{ p: 4 }}>
        <Typography>Mapa não encontrado.</Typography>
      </Stack>
    );
  }

  const mapPath = (mapId: string, view: string) => `/game/${gameId}/map/${encodeURIComponent(mapId)}/${view}`;
  const setViewMode = (mode: string) => navigate(mapPath(selectedMap.extId, mode));
  const selectMap = (mapId: string) => navigate(mapPath(mapId, viewMode));

  const center: [number, number] = [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
  const imageBounds = (previewBounds ?? bounds) as LatLngBoundsExpression;
  const singleImageUrl = mapImageUrl(selectedMap);
  const displayCoords: [number, number] = rotate ? rotateLatLng(cursorCoords, bounds, -rotate) : cursorCoords;

  const weathers = (events.data?.content ?? []).filter((event) =>
    selectedMap.weathers.length > 0 ? selectedMap.weathers.includes(event.extId) : event.eventType === "clima",
  );
  const activeWeatherIds = activeEventIds.filter((id) => weathers.some((weather) => weather.extId === id));

  /** Posição desenhada de volta para coordenadas de jogo (x, y). */
  const toGame = (latlng: [number, number]): [number, number] => {
    const [y, x] = rotate ? rotateLatLng(latlng, bounds, -rotate) : latlng;
    return [x, y];
  };

  const finishDrawing = (geometry: DrawnGeometry) => {
    setDrawn(geometry);
    setActiveTool(null);
    setCurrentPoints([]);
  };

  /** Fecha o polígono do que já foi clicado; precisa de três vértices. */
  const finishPolygon = () => {
    if (currentPoints.length < 3) return;
    finishDrawing({ wkt: formatWKTPolygon(currentPoints.map(toGame)), isPoint: false, vertices: currentPoints.length });
  };

  const handleMapClick = (latlng: [number, number]) => {
    if (activeTool === "polygon") setCurrentPoints((previous) => [...previous, latlng]);
    else if (activeTool === "point") finishDrawing({ wkt: formatWKTPoint(toGame(latlng)), isPoint: true, vertices: 1 });
  };

  const clearUrlFilter = (param: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    setSearchParams(next);
  };

  return (
    <Box sx={{ width: "100%", height: "100%", backgroundColor: "#0b0b0b", position: "relative", overflow: "hidden" }}>
      <Box sx={{ flexGrow: 1, position: "relative", height: "100%", "& .leaflet-top": { top: "39px", transition: "top 0.3s ease-in-out" } }}>
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
                <ToggleButtonGroup value={viewMode} exclusive onChange={(_, value) => value && setViewMode(value)} size="small">
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
              key={`${gameId}-${selectedMap.extId}`}
              crs={crs}
              bounds={bounds as LatLngBoundsExpression}
              center={center}
              zoom={selectedMap.minZoom ?? 0}
              maxZoom={selectedMap.maxZoom ?? undefined}
              // Desenhando, o duplo clique fecha a zona em vez de dar zoom.
              doubleClickZoom={activeTool === null}
              style={{ height: "100%", width: "100%", cursor: activeTool ? "crosshair" : "grab" }}
            >
              <Pane name="locationLabels" style={{ zIndex: 500 }} />
              <CursorTracker onMouseMove={setCursorCoords} />
              <MapEventsHandler onClick={handleMapClick} onDoubleClick={finishPolygon} />
              {activeTool === "polygon" && (
                <DrawKeyboard
                  onFinish={finishPolygon}
                  onCancel={() => {
                    setActiveTool(null);
                    setCurrentPoints([]);
                  }}
                />
              )}
              {activeTool && (
                <CircleMarker
                  center={cursorCoords}
                  radius={activeTool === "point" ? 6 : 4}
                  pathOptions={{
                    color: "white",
                    fillColor: activeTool === "point" ? theme.palette.success.main : theme.palette.primary.main,
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
                    positions={[currentPoints[currentPoints.length - 1], cursorCoords]}
                    pathOptions={{ color: theme.palette.primary.main, weight: 2, dashArray: "5, 5", opacity: 0.8 }}
                    interactive={false}
                  />
                </>
              )}

              {selectedMap.mapType === "layered" &&
                selectedMap.urlPattern &&
                Array.from({ length: selectedMap.layers ?? 1 }, (_, layer) => layer).map((layer) => (
                  <ImageOverlay
                    key={layer}
                    zIndex={layer}
                    url={getPublicUrl(selectedMap.urlPattern!.replace("{layer}", String(layer)))}
                    bounds={imageBounds}
                  />
                ))}
              {selectedMap.mapType === "single" && singleImageUrl && <ImageOverlay url={singleImageUrl} bounds={imageBounds} />}
              {selectedMap.mapType === "tile" && (selectedMap.urlPattern ?? selectedMap.imageUrl) && (
                <TileLayer
                  url={getPublicUrl(selectedMap.urlPattern ?? selectedMap.imageUrl)}
                  minZoom={selectedMap.minZoom ?? undefined}
                  maxZoom={selectedMap.maxZoom ?? undefined}
                  minNativeZoom={selectedMap.tiles?.minZoom ?? 4}
                  maxNativeZoom={selectedMap.tiles?.maxZoom ?? 4}
                  noWrap={true}
                />
              )}

              {locationElements}
              {markerElements}
                          </MapContainer>
            <MapFilterDrawer
              stats={stats}
              categoryNames={categoryNames}
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
            gameId={gameId}
            map={selectedMap}
            markers={markerList}
            locations={locationList}
            categoryNames={categoryNames}
            availableViews={availableViews}
            onSwitchToMap={() => setViewMode("map")}
            focus={
              filterEntityId
                ? {
                    param: "entity",
                    value: filterEntityId,
                    name: filterEntity.data?.name ?? null,
                    onOpen: () => navigate(contentRoute(gameId, "entity", filterEntityId)!),
                    onClear: () => clearUrlFilter("entity"),
                  }
                : filterItemId
                  ? {
                      param: "item",
                      value: filterItemId,
                      name: filterItem.data?.name ?? null,
                      onOpen: () => navigate(contentRoute(gameId, "item", filterItemId)!),
                      onClear: () => clearUrlFilter("item"),
                    }
                  : undefined
            }
          />
        )}

        {viewMode === "map" && (
          <Stack
            spacing={1}
            sx={{ position: "absolute", bottom: isMobile ? 6 : 12, left: isMobile ? 6 : 12, right: isMobile ? 6 : undefined, zIndex: 1000 }}
          >
            {filterItemId && (
              <FilterBanner
                label="VISUALIZANDO ITEM"
                document={filterItem.data}
                onOpen={() => navigate(contentRoute(gameId, "item", filterItemId)!)}
                onClear={() => clearUrlFilter("item")}
              />
            )}
            {filterEntityId && (
              <FilterBanner
                label="VISUALIZANDO ENTIDADE"
                document={filterEntity.data}
                onOpen={() => navigate(contentRoute(gameId, "entity", filterEntityId)!)}
                onClear={() => clearUrlFilter("entity")}
              />
            )}
            {markers.data?.truncated && (
              <Alert severity="warning" variant="filled" sx={{ py: 0 }}>
                Mostrando {markers.data.content.length} de {markers.data.total} pontos.
              </Alert>
            )}
            <MapInfoOverlay
              gameName={game.data?.name ?? ""}
              coords={displayCoords}
              maps={maps.data.content}
              selectedMapId={selectedMap.extId}
              onSelectMap={selectMap}
            />
          </Stack>
        )}
      </Box>

      {navigationStack.length > 0 && (
        <InfoDrawer
          stack={navigationStack}
          onSelectMap={selectMap}
          onPush={pushNavigation}
          onPop={() => setNavigationStack((stack) => stack.slice(0, -1))}
          onClose={() => setNavigationStack([])}
        />
      )}

      {viewMode === "map" && (
        <Box sx={{ position: "absolute", top: 12, right: 12, zIndex: 1100, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
          <MapWeatherPanel
            availableWeathers={weathers}
            activeWeatherIds={activeWeatherIds}
            onToggleWeather={toggleEvent}
            onClearWeathers={() => activeWeatherIds.forEach((id) => toggleEvent(id))}
          />

          <Box sx={{ position: "relative" }}>
            {isBoundBoxEditorOpen && (
              <BoundBoxEditorPanel
                selectedMap={selectedMap}
                open={isBoundBoxEditorOpen}
                onClose={() => setIsBoundBoxEditorOpen(false)}
                onApply={(applied) => setPreviewBounds(applied)}
                appliedBounds={previewBounds}
              />
            )}
            <MapToolbox
              activeTool={activeTool}
              hasPoints={currentPoints.length > 0}
              canDraw={canEdit}
              onSelectTool={setActiveTool}
              onConfirm={finishPolygon}
              onClear={() => setCurrentPoints([])}
              onCancel={() => {
                setActiveTool(null);
                setCurrentPoints([]);
              }}
              isBoundBoxEditorOpen={isBoundBoxEditorOpen}
              onToggleBoundBoxEditor={() => setIsBoundBoxEditorOpen((open) => !open)}
              onEditMap={isAdmin ? () => setIsEditingMap(true) : undefined}
            />
          </Box>
        </Box>
      )}

      {isEditingMap && selectedMap && (
        <MapFormDialog
          gameId={gameId}
          map={selectedMap}
          onClose={() => setIsEditingMap(false)}
          onDeleted={() => navigate(`/game/${gameId}/map`)}
        />
      )}

      {drawn && selectedMap && (
        <MapContentDialog
          gameId={gameId}
          mapId={selectedMap.extId}
          geometry={drawn}
          onClose={() => setDrawn(null)}
          onSaved={(kind) => {
            setDrawn(null);
            setSnackbar(kind === "spawn" ? "Ponto de spawn salvo no mapa!" : "Local salvo no mapa!");
          }}
        />
      )}

      <Snackbar open={snackbar !== null} autoHideDuration={3000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity="info" variant="filled" sx={{ width: "100%", borderRadius: 2 }}>
          {snackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
};
