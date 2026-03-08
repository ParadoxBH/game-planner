import { Box, Typography, Paper, Stack, Collapse } from "@mui/material";
import { CRS, type LatLngBoundsExpression, Transformation } from "leaflet";
import { useParams } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Popup,
  ImageOverlay,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import { divIcon } from "leaflet";
import { useGameData } from "../hooks/useGameData";
import { useState, useEffect, useMemo, useRef } from "react";
import { SimplifiedEntity } from "./SimplifiedEntity";
import { EntityDrawer } from "./EntityDrawer";
import { loadGamesList } from "../services/dataLoader";

interface MapMetadata {
  id: string;
  name: string;
  type: "single" | "layered" | "tile";
  url?: string;
  urlPattern?: string;
  layers?: number;
  bounds: [[number, number], [number, number]];
  minZoom: number;
  maxZoom: number;
  tileMinZoom?: number;
  tileMaxZoom?: number;
  tileRange?: {
    z: number;
    min: [number, number];
    max: [number, number];
  };
  thumbnail?: string;
}

interface GameInfo {
  id: string;
  name: string;
  description: string;
  maps: MapMetadata[];
}

interface Spawn {
  id: string;
  entityId: string;
  type: string;
  position: [number, number];
  mapId?: string;
}

interface GameEntity {
  id: string;
  name: string;
  category: string;
  icon?: string;
  drops?: {
    itemId: string;
    chance: number;
    quant: number;
  }[];
}

interface GameItem {
  id: string;
  name: string;
  type: string;
  description: string;
  icon?: string;
}

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

interface MapInfoOverlayProps {
  gameName?: string;
  coords: [number, number];
  region?: string;
  maps: MapMetadata[];
  selectedMapId: string;
  onSelectMap: (id: string) => void;
}

const MapInfoOverlay = ({
  gameName,
  coords,
  region = "Desconhecido",
  maps,
  selectedMapId,
  onSelectMap,
}: MapInfoOverlayProps) => {
  const [expanded, setExpanded] = useState(false);
  const currentMap = maps.find(m => m.id === selectedMapId);

  return (
    <Paper
      elevation={0}
      sx={{
        position: "absolute",
        bottom: 12,
        left: 12,
        zIndex: 1000,
        backgroundColor: "rgba(11, 11, 11, 0.8)",
        backdropFilter: "blur(16px)",
        borderRadius: "4px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        width: "400px",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Stack m={2.5} spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack alignItems={"start"}>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255, 255, 255, 0.5)", fontWeight: 600 }}
            >
              Explorando
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, letterSpacing: "-0.5px" }}
            >
              
              {currentMap?.name || gameName}
            </Typography>
          </Stack>

          {/* Google-style Map Selector Button/Preview */}
          <Box
            onClick={() => setExpanded(!expanded)}
            sx={{
              width: 56,
              height: 56,
              borderRadius: "4px",
              border: "2px solid white",
              overflow: "hidden",
              cursor: "pointer",
              position: "relative",
              transition: "transform 0.2s",
              "&:hover": { transform: "scale(1.05)" },
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            <img 
              src={currentMap?.thumbnail || "https://placehold.co/100x100/333/fff?text=Map"} 
              alt="Map Preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <Box sx={{ 
              position: "absolute", 
              bottom: 0, 
              width: "100%", 
              bgcolor: "rgba(0,0,0,0.6)", 
              textAlign: "center" 
            }}>
              <Typography variant="caption" sx={{ fontSize: "9px", fontWeight: "bold" }}>MAPAS</Typography>
            </Box>
          </Box>
        </Stack>

        <Collapse in={expanded}>
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", mb: 1, display: "block" }}>
              SELECIONAR MAPA
            </Typography>
            <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
              {maps.map((map) => (
                <Box
                  key={map.id}
                  onClick={() => {
                    onSelectMap(map.id);
                    setExpanded(false);
                  }}
                  sx={{
                    minWidth: 80,
                    height: 80,
                    borderRadius: "8px",
                    border: selectedMapId === map.id ? "2px solid #ff4400" : "1px solid rgba(255, 255, 255, 0.2)",
                    overflow: "hidden",
                    cursor: "pointer",
                    position: "relative",
                    opacity: selectedMapId === map.id ? 1 : 0.7,
                    transition: "all 0.2s",
                    "&:hover": { opacity: 1, borderColor: "rgba(255,255,255,0.5)" }
                  }}
                >
                  <img src={map.thumbnail || "https://placehold.co/100x100/333/fff?text=Map"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <Typography variant="caption" sx={{ 
                    position: "absolute", 
                    bottom: 0, 
                    width: "100%", 
                    bgcolor: "rgba(0,0,0,0.7)", 
                    fontSize: "10px", 
                    textAlign: "center",
                    p: 0.5
                  }}>
                    {map.name}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Collapse>

        <Stack direction={"row"}>
          <Stack flex={1}>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255, 255, 255, 0.5)", fontWeight: 600 }}
            >
              Região
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {region}
            </Typography>
          </Stack>
          <Stack flex={1}>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255, 255, 255, 0.5)", fontWeight: 600 }}
            >
              Coordenadas
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: "monospace" }}>
              {coords[1].toFixed(1)}x, {coords[0].toFixed(1)}y
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
};

/**
 * Creates a custom CRS for Leaflet based on the provided bounds.
 * This ensures that the map's coordinate system matches the "meters" or "units"
 * defined in the bounds, instead of fixed pixel coordinates.
 */
const createCustomCRS = (bounds: [[number, number], [number, number]], tileRange?: MapMetadata['tileRange']) => {
  const [min, max] = bounds;
  const width = Math.abs(max[1] - min[1]);
  const height = Math.abs(max[0] - min[0]);
  
  if (tileRange) {
    const scale = 256 / Math.pow(2, tileRange.z);
    const pixelMinX = tileRange.min[0] * scale;
    const pixelMaxX = tileRange.max[0] * scale;
    const pixelMinY = tileRange.min[1] * scale;
    const pixelMaxY = tileRange.max[1] * scale;

    const scaleX = (pixelMaxX - pixelMinX) / width;
    const offsetX = pixelMinX - min[1] * scaleX;

    const scaleY = (pixelMinY - pixelMaxY) / height;
    const offsetY = pixelMinY - max[0] * scaleY;

    return Object.assign({}, CRS.Simple, {
      transformation: new Transformation(scaleX, offsetX, scaleY, offsetY)
    });
  }

  const scaleX = 256 / width;
  const scaleY = -256 / height;
  
  const transformation = new Transformation(
    scaleX, 
    -min[1] * scaleX, 
    scaleY, 
    -max[0] * scaleY
  );

  return Object.assign({}, CRS.Simple, {
    transformation: transformation,
  });
};

export const MapView = () => {
  const { gameId } = useParams();
  const [cursorCoords, setCursorCoords] = useState<[number, number]>([0, 0]);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string>("");
  const [loadingGame, setLoadingGame] = useState(true);
  const [navigationStack, setNavigationStack] = useState<NavigationItem[]>([]);
  const mapRef = useRef<any>(null);

  const drawerOpen = navigationStack.length > 0;

  const handlePush = (item: NavigationItem) => {
    setNavigationStack(prev => [...prev, item]);
  };

  const handlePop = () => {
    setNavigationStack(prev => prev.slice(0, -1));
  };

  const handleCloseDrawer = () => {
    setNavigationStack([]);
  };

  // Garantir que o mapa redimensione quando o drawer abrir/fechar
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 300); // Aguarda a animação do drawer
    }
  }, [drawerOpen]);

  useEffect(() => {
    loadGamesList().then(games => {
      const game = games.find(g => g.id === gameId);
      if (game) {
        setGameInfo(game);
        if (game.maps && game.maps.length > 0) {
          setSelectedMapId(game.maps[0].id);
        }
      }
      setLoadingGame(false);
    });
  }, [gameId]);

  const selectedMap = useMemo(() => {
    return gameInfo?.maps.find(m => m.id === selectedMapId);
  }, [gameInfo, selectedMapId]);

  const {
    data: spawns,
    loading: loadingSpawns,
    error: spawnError,
  } = useGameData<Spawn[]>(gameId, "spawns");

  const {
    data: entities,
  } = useGameData<GameEntity[]>(gameId, "entity");

  const {
    data: items,
  } = useGameData<GameItem[]>(gameId, "items");

  const entityLookup = useMemo(() => {
    const lookup: Record<string, GameEntity> = {};
    if (entities) {
      entities.forEach(e => {
        lookup[e.id] = e;
      });
    }
    return lookup;
  }, [entities]);

  const customCRS = useMemo(() => {
    if (selectedMap) {
      return createCustomCRS(
        selectedMap.bounds as [[number, number], [number, number]],
        selectedMap.tileRange
      );
    }
    return CRS.Simple;
  }, [selectedMap]);

  const mapCenter = useMemo(() => {
    if (selectedMap) {
      const [min, max] = selectedMap.bounds;
      return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2] as [number, number];
    }
    return [0, 0] as [number, number];
  }, [selectedMap]);

  if (loadingGame) return <Box sx={{ p: 4 }}><Typography>Carregando mapa...</Typography></Box>;
  if (!gameInfo || !selectedMap) return <Box sx={{ p: 4 }}><Typography>Jogo ou mapa não encontrado.</Typography></Box>;

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0b0b0b",
        position: "relative",
        display: "flex", // Adicionado para layout lado a lado
        overflow: "hidden",
      }}
    >
      <Box sx={{ flexGrow: 1, position: "relative", height: "100%" }}>
        <MapContainer
          key={`${gameId}-${selectedMapId}`} // Force re-mount on map change
          ref={mapRef}
          crs={customCRS}
          bounds={selectedMap.bounds as LatLngBoundsExpression}
          center={mapCenter}
        zoom={selectedMap.minZoom}
        maxZoom={selectedMap.maxZoom}
        minZoom={selectedMap.minZoom}
        style={{ height: "100%", width: "100%" }}
      >
        <CursorTracker onMouseMove={setCursorCoords} />
        
        {selectedMap.type === "layered" && selectedMap.urlPattern && (
          Array.from({ length: selectedMap.layers || 1 }, (_, i) => i).map((l) => (
            <ImageOverlay
              key={`layer_${l}`}
              zIndex={l}
              url={selectedMap.urlPattern!.replace("{layer}", l.toString())}
              bounds={selectedMap.bounds as LatLngBoundsExpression}
            />
          ))
        )}

        {selectedMap.type === "single" && selectedMap.url && (
          <ImageOverlay
            url={selectedMap.url}
            bounds={selectedMap.bounds as LatLngBoundsExpression}
          />
        )}
        
        {selectedMap.type === "tile" && selectedMap.url && (
          <TileLayer
            url={selectedMap.url}
            minZoom={selectedMap.minZoom}
            maxZoom={selectedMap.maxZoom}
            minNativeZoom={selectedMap.tileMinZoom ?? 4}
            maxNativeZoom={selectedMap.tileMaxZoom ?? 4}
            noWrap={true}
          />
        )}

        {spawnError && (
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              bgcolor: "rgba(255,0,0,0.8)",
              color: "white",
              p: 1,
              zIndex: 1000,
              borderRadius: "4px",
            }}
          >
            <Typography variant="caption">Erro ao carregar spawns: {spawnError}</Typography>
          </Box>
        )}

        {!loadingSpawns &&
          spawns &&
          spawns
            .filter((spawn: any) => !spawn.mapId || spawn.mapId === selectedMapId)
            .map((spawn) => {
              return (
                  <Marker 
                    key={spawn.id} 
                    position={gameId === 'satisfactory' ? [spawn.position[0], spawn.position[1]] : spawn.position}
                    icon={divIcon({
                      html: `
                        <div style="
                          width: 32px;
                          height: 32px;
                          border: 2px solid #ff4400;
                          border-radius: 4px;
                          background: rgba(0,0,0,0.6);
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          overflow: hidden;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
                          transform: translate(-16px, -16px);
                        ">
                          <img src="${items?.find(i => i.id === spawn.entityId)?.icon || '/img/placeholder.png'}" 
                               style="width: 85%; height: 85%; object-fit: contain;" />
                        </div>
                      `,
                      className: 'custom-entity-icon',
                    })}
                  >
                  <Popup>
                    <SimplifiedEntity 
                      entity={(() => {
                        const entity = entityLookup[spawn.entityId];
                        const icon = items?.find(i => i.id === spawn.entityId)?.icon;
                        return entity 
                          ? { ...entity, icon } 
                          : { id: spawn.entityId, name: spawn.entityId, category: spawn.type, icon };
                      })()} 
                      position={spawn.position as [number, number]}
                      onExpand={() => {
                        handlePush({ type: "entity", id: spawn.entityId });
                      }}
                    />
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>

        <MapInfoOverlay 
          gameName={gameInfo.name} 
          coords={cursorCoords} 
          maps={gameInfo.maps}
          selectedMapId={selectedMapId}
          onSelectMap={setSelectedMapId}
        />
      </Box>

      {/* Side Drawer */}
      {drawerOpen && (
        <EntityDrawer 
          stack={navigationStack}
          entities={entities || []}
          items={items || []}
          spawns={spawns || []}
          maps={gameInfo.maps}
          onSelectMap={setSelectedMapId}
          onPush={handlePush}
          onPop={handlePop}
          onClose={handleCloseDrawer} 
        />
      )}
    </Box>
  );
};
