import { Box, Typography } from "@mui/material";
import { CRS, type LatLngBoundsExpression } from "leaflet";
import { useParams } from "react-router-dom";
import {
  MapContainer,
  Marker,
  Popup,
  ImageOverlay,
} from "react-leaflet";
import { useGameData } from "../hooks/useGameData";

interface Spawn {
  id: string;
  entityId: string;
  type: string;
  position: [number, number];
}

export const MapView = () => {
  const { gameId } = useParams();
  
  // Custom Apogea logic (preserva a lógica original)
  if (gameId === "apogea") {
    const apogeaBounds: LatLngBoundsExpression = [
      [0, 0],
      [1000, 1000],
    ];

    return (
      <Box sx={{ width: "100%", height: "100%", backgroundColor: "#0b0b0b" }}>
        <MapContainer
          crs={CRS.Simple}
          bounds={apogeaBounds}
          maxZoom={2}
          minZoom={-2}
          style={{ height: "100%", width: "100%" }}
        >
          {Array.from({ length: 16 }, (_, i) => i).map((l, index) => (
            <ImageOverlay
              key={`layer_${index}`}
              zIndex={l}
              url={`https://paszqa.github.io/quickapogean/Map/Levels/combined_y${l}_minimap.png`}
              bounds={apogeaBounds}
            />
          ))}

          <Marker position={[500, 500]}>
            <Popup>
              Centro do Mapa Apogea <br /> Coordenadas: 500, 500
            </Popup>
          </Marker>
        </MapContainer>
      </Box>
    );
  }

  // Heartopia specific logic
  if (gameId === "heartopia") {
    // 2.5km² => Side = sqrt(2,500,000) ~= 1581.14m
    // Centered at 0,0 => bounds from -790.57 to 790.57
    const heartopiaBounds: LatLngBoundsExpression = [
      [-790.57, -790.57],
      [790.57, 790.57],
    ];

    const { data: spawns, loading, error } = useGameData<Spawn[]>(gameId, "spawns");

    return (
      <Box sx={{ width: "100%", height: "100%", backgroundColor: "#0b0b0b", position: 'relative' }}>
        <MapContainer
          crs={CRS.Simple}
          center={[0, 0]}
          zoom={0}
          bounds={heartopiaBounds}
          maxZoom={4}
          minZoom={-2}
          style={{ height: "100%", width: "100%" }}
        >
          <ImageOverlay
            url="/data/heartopia/map.png"
            bounds={heartopiaBounds}
          />
          
          {error && (
            <Box sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'rgba(255,0,0,0.8)', color: 'white', p: 1, zIndex: 1000 }}>
              <Typography>Erro ao carregar spawns: {error}</Typography>
            </Box>
          )}

          {!loading && spawns && spawns.map((spawn) => (
            <Marker key={spawn.id} position={spawn.position}>
              <Popup>
                Entity: {spawn.entityId} <br/>
                Type: {spawn.type} <br/>
                [{spawn.position[0]}, {spawn.position[1]}]
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Box>
    );
  }

  // Generic Map logic (outros)
  const { data: spawns, loading, error } = useGameData<Spawn[]>(gameId, "spawns");

  const bounds: LatLngBoundsExpression = [
    [0, 0],
    [500, 500],
  ];

  return (
    <Box sx={{ width: "100%", height: "100%", backgroundColor: "#0b0b0b", position: 'relative' }}>
        <MapContainer
          crs={CRS.Simple}
          bounds={bounds}
          maxZoom={2}
          minZoom={0}
          style={{ height: "100%", width: "100%" }}
        >
          {/* Fundo genérico provisório para outros jogos usando ImageOverlay */}
          <ImageOverlay
              url={`https://placehold.co/1000x1000/2a2a2a/555555?text=Mapa+${gameId?.toUpperCase()}`}
              bounds={bounds}
          />
          
          {error && (
            <Box sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'rgba(255,0,0,0.8)', color: 'white', p: 1, zIndex: 1000 }}>
              <Typography>Erro ao carregar spawns: {error}</Typography>
            </Box>
          )}

          {!loading && spawns && spawns.map((spawn) => (
             <Marker key={spawn.id} position={spawn.position}>
                 <Popup>
                     Entity: {spawn.entityId} <br/>
                     Type: {spawn.type} <br/>
                     [{spawn.position[0]}, {spawn.position[1]}]
                 </Popup>
             </Marker>
          ))}
        </MapContainer>
    </Box>
  );
};
