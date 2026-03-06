import { Box } from "@mui/material";
import { CRS, type LatLngBoundsExpression } from "leaflet";
import type { ReactNode } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ImageOverlay,
} from "react-leaflet";

export const MapView = () => {
  // Coordenadas iniciais (ex: centro de um mapa)
  const position: [number, number] = [51.505, -0.09];
  const bounds: LatLngBoundsExpression = [
    [0, 0],
    [1000, 1000],
  ];

  function MapLayers() {
    var layers: number[] = [];
    for (let i = 0; i < 16; i++)
      layers.push(i);
    return (
      <>
        {layers.map((l, index) => (
          <ImageOverlay
            key={`layer_${index}`}
            zIndex={l}
            url={`https://paszqa.github.io/quickapogean/Map/Levels/combined_y${l}_minimap.png`}
            bounds={bounds}
          />
        ))}
      </>
    );
  }

  return (
    <Box sx={{ width: "100%", height: "100%", backgroundColor: "#0b0b0b" }}>
      <MapContainer
        crs={CRS.Simple} // Define que o mapa é plano (sem curvatura da Terra)
        bounds={bounds}
        maxZoom={2}
        minZoom={-2}
        style={{ height: "100%", width: "100%" }}
      >
        <MapLayers />

        {/* Exemplo de Marker em coordenadas de jogo [Y, X] */}
        <Marker position={[500, 500]}>
          <Popup>
            Centro do Mapa <br /> Coordenadas: 500, 500
          </Popup>
        </Marker>
      </MapContainer>
    </Box>
  );
};
