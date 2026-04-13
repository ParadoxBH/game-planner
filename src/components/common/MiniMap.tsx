import { Box } from "@mui/material";
import { 
  MapContainer, 
  TileLayer, 
  ImageOverlay, 
  Marker, 
  useMap
} from "react-leaflet";
import L, { CRS, Transformation } from "leaflet";
import { useEffect, useMemo } from "react";
import type { MapMetadata } from "../../types/gameModels";
import { getPublicUrl } from "../../utils/pathUtils";

interface MiniMapProps {
  meta: MapMetadata;
  markers: Array<{
    id: string;
    position: [number, number];
    icon?: string;
    color?: string;
  }>;
  onClick?: () => void;
  height?: number | string;
}

// Internal component to handle auto-zoom
const SetBounds = ({ markers, bounds }: { markers: any[], bounds: [[number, number], [number, number]] }) => {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const latlngs = markers.map(m => L.latLng(m.position));
      const markerBounds = L.latLngBounds(latlngs);
      
      if (markerBounds.isValid()) {
        // Se houver apenas um ponto, padroniza o zoom
        if (markers.length === 1) {
          map.setView(latlngs[0], Math.max(map.getZoom(), 2), { animate: false });
        } else {
          map.fitBounds(markerBounds.pad(0.5), { animate: false });
        }
      }
    } else {
      map.fitBounds(bounds as any, { animate: false });
    }
  }, [markers, bounds, map]);

  return null;
};

export const MiniMap = ({ meta, markers, onClick, height = 200 }: MiniMapProps) => {
  const crs = useMemo(() => {
    const [min, max] = meta.bounds;
    const width = Math.abs(max[1] - min[1]);
    const height = Math.abs(max[0] - min[0]);
    
    if (meta.tileRange) {
      const scale = 256 / Math.pow(2, meta.tileRange.z);
      const pixelMinX = meta.tileRange.min[0] * scale;
      const pixelMaxX = meta.tileRange.max[0] * scale;
      const pixelMinY = meta.tileRange.min[1] * scale;
      const pixelMaxY = meta.tileRange.max[1] * scale;

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
    
    return Object.assign({}, CRS.Simple, {
      transformation: new Transformation(
        scaleX, 
        -min[1] * scaleX, 
        scaleY, 
        -max[0] * scaleY
      ),
    });
  }, [meta]);

  const center = useMemo(() => {
    return [(meta.bounds[0][0] + meta.bounds[1][0]) / 2, (meta.bounds[0][1] + meta.bounds[1][1]) / 2] as [number, number];
  }, [meta]);

  return (
    <Box 
      sx={{ 
        height, 
        width: '100%', 
        borderRadius: 1, 
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick}
    >
      <style>
        {`
          @keyframes pulse-marker {
            0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255, 68, 0, 0.7); }
            70% { transform: scale(1.2); opacity: 0.8; box-shadow: 0 0 0 10px rgba(255, 68, 0, 0); }
            100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255, 68, 0, 0); }
          }
          .mini-marker-inner {
            width: 12px;
            height: 12px;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(0,0,0,0.5);
            animation: pulse-marker 2s infinite;
          }
        `}
      </style>
      <MapContainer
        crs={crs}
        bounds={meta.bounds as any}
        center={center}
        zoom={meta.minZoom}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", background: '#000' }}
      >
        {meta.type === "layered" && meta.urlPattern && (
            Array.from({ length: meta.layers || 1 }, (_, i) => i).map((l) => (
                <ImageOverlay
                    key={`layer_${l}`}
                    zIndex={l}
                    url={getPublicUrl(meta.urlPattern!.replace("{layer}", l.toString()))}
                    bounds={meta.bounds as any}
                />
            ))
        )}
        {meta.type === "single" && meta.url && (
            <ImageOverlay
                url={getPublicUrl(meta.url)}
                bounds={meta.bounds as any}
            />
        )}
        {meta.type === "tile" && meta.url && (
            <TileLayer
                url={getPublicUrl(meta.url)}
                minZoom={meta.minZoom}
                maxZoom={meta.maxZoom}
                noWrap={true}
            />
        )}
        {markers.filter(m => m.position && m.position.length === 2).map((m) => {
            if (isNaN(m.position[0]) || isNaN(m.position[1])) return null;
            return (
              <Marker 
                  key={m.id} 
                  position={m.position}
                  icon={L.divIcon({
                      html: `<div class="mini-marker-inner" style="background: ${m.color || '#ff4400'};"></div>`,
                      className: 'mini-marker',
                      iconSize: [12, 12],
                      iconAnchor: [6, 6]
                  })}
              />
            );
        })}
        <SetBounds markers={markers.filter(m => m.position && m.position.length === 2 && !isNaN(m.position[0]) && !isNaN(m.position[1]))} bounds={meta.bounds as any} />
      </MapContainer>
    </Box>
  );
};
