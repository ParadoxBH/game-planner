import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  Divider,
  Grid,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Map as MapIcon,
  Launch as LaunchIcon,
  Place as PlaceIcon,
  ArrowBack as ArrowBackIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { MapContainer, ImageOverlay, TileLayer, CircleMarker, Tooltip, Rectangle, useMapEvents } from "react-leaflet";
import { useNavigate, useParams } from "react-router-dom";
import { MAX_PAGE_SIZE, type MapDocument, type SpawnPointDocument, type Reference } from "../../api/content";
import type { ReferenceIndex } from "../../api/references";
import { useContentList } from "../../api/useContent";
import { usePlatform } from "../../hooks/usePlatform";
import { formatChance, formatRange } from "../../utils/format";
import { getPublicUrl } from "../../utils/pathUtils";
import { ContentReferences } from "./ContentLabel";
import { DataCard } from "./DataCard";
import { DataChip } from "./DataChip";
import { DetainItem } from "./DetainItem";
import { createMapCRS, leafletBounds, mapImageUrl, pointLatLng } from "../map/mapGeometry";
import { respawnLabel } from "../map/MapSpawnPopup";
import { SpawnConditionList } from "../map/SpawnConditions";

interface SpawnPointsByMapProps {
  points: SpawnPointDocument[];
  /** Filtro aplicado ao abrir o mapa: ?item=codigo ou ?entity=codigo. Sem ele, abre o mapa sem filtro. */
  filter?: { param: "item" | "entity"; value: string };
  references: ReferenceIndex;
  label?: string;
  startIcon?: ReactNode;
  count?: number;
  size?: any;
}

interface MapGroup {
  id: string;
  mapId: string | null;
  name: string;
  points: SpawnPointDocument[];
}

function MapResizeHandler() {
  const map = useMapEvents({});
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MiniMapPreview({
  mapDoc,
  points,
  references,
  filter,
}: {
  mapDoc: MapDocument;
  points: SpawnPointDocument[];
  references: ReferenceIndex;
  filter?: { param: "item" | "entity"; value: string };
}) {
  const theme = useTheme();
  const bounds = useMemo(() => leafletBounds(mapDoc), [mapDoc]);
  const crs = useMemo(() => createMapCRS(bounds, mapDoc.tiles), [bounds, mapDoc.tiles]);
  const singleImageUrl = mapImageUrl(mapDoc);

  const validPoints = useMemo(() => points.filter((p) => Boolean(p.position)), [points]);
  const positions = useMemo(() => validPoints.map((p) => pointLatLng(p.position!)), [validPoints]);

  const center = useMemo(() => {
    if (positions.length > 0) {
      const avgLat = positions.reduce((s, p) => s + p[0], 0) / positions.length;
      const avgLng = positions.reduce((s, p) => s + p[1], 0) / positions.length;
      return [avgLat, avgLng] as [number, number];
    }
    return [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2] as [number, number];
  }, [positions, bounds]);

  if (validPoints.length === 0) {
    return (
      <Box sx={{ p: 2, bgcolor: "rgba(255,255,255,0.03)", borderRadius: 2, border: "1px dashed", borderColor: "divider", textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">
          Ocorrência sem coordenadas geográficas fixas no mapa.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: 260,
        width: "100%",
        borderRadius: theme.designTokens?.borderRadius ?? 2,
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
        position: "relative",
      }}
    >
      <MapContainer
        crs={crs}
        bounds={bounds as any}
        center={center}
        zoom={mapDoc.minZoom ?? 0}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <MapResizeHandler />
        {mapDoc.mapType === "single" && singleImageUrl && (
          <ImageOverlay url={getPublicUrl(singleImageUrl)} bounds={bounds as any} />
        )}
        {mapDoc.mapType === "tile" && (mapDoc.urlPattern ?? mapDoc.imageUrl) && (
          <TileLayer url={getPublicUrl(mapDoc.urlPattern ?? mapDoc.imageUrl)} noWrap={true} />
        )}
        {mapDoc.mapType === "layered" && mapDoc.urlPattern && (
          <ImageOverlay url={getPublicUrl(mapDoc.urlPattern.replace("{layer}", "0"))} bounds={bounds as any} />
        )}
        {mapDoc.mapType === "procedural" && (
          <Rectangle bounds={bounds as any} pathOptions={{ color: "#1a237e", fillColor: "#1a237e", fillOpacity: 1 }} />
        )}

        {validPoints.map((point) => {
          const pos = pointLatLng(point.position!);
          const isFocus = (target: Reference) => filter && target.extId === filter.value && (target.kind ?? filter.param) === filter.param;
          const occupant = point.occupants.find((entry) => isFocus(entry.target));
          const drop = point.drops.find((entry) => isFocus(entry.target));
          const shown = occupant ?? drop;

          return (
            <CircleMarker
              key={point.extId}
              center={pos}
              radius={8}
              pathOptions={{
                color: "#ffffff",
                fillColor: theme.palette.primary.main,
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Tooltip permanent={false}>
                <Stack spacing={0.25} sx={{ p: 0.5 }}>
                  <Typography variant="body2" fontWeight={700}>
                    {point.name || (point.location ? references.name({ kind: "location", extId: point.location }) : "Ponto de Drop")}
                  </Typography>
                  {shown?.amount !== null && shown?.amount !== undefined && (
                    <Typography variant="caption">Quantidade: {formatRange(shown.amount, shown.maxAmount)}</Typography>
                  )}
                  {shown?.chance !== null && shown?.chance !== undefined && (
                    <Typography variant="caption">Chance: {formatChance(shown.chance)}</Typography>
                  )}
                </Stack>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </Box>
  );
}

function DistinctOccurrenceDetails({
  samplePoint,
  count,
  filter,
  references,
}: {
  samplePoint: SpawnPointDocument;
  count: number;
  filter?: { param: "item" | "entity"; value: string };
  references: ReferenceIndex;
}) {
  const isFocus = (target: Reference) => filter && target.extId === filter.value && (target.kind ?? filter.param) === filter.param;
  const occupant = samplePoint.occupants.find((entry) => isFocus(entry.target));
  const drop = samplePoint.drops.find((entry) => isFocus(entry.target));
  const shown = occupant ?? drop;
  const others = samplePoint.occupants.filter((entry) => !isFocus(entry.target));
  const respawn = respawnLabel(samplePoint.respawnMode, samplePoint.respawnDelayMinutes);

  return (
    <Stack spacing={0.75}>
      {samplePoint.name && (
        <Typography variant="body2" fontWeight={700}>
          {samplePoint.name}
        </Typography>
      )}
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
        {count > 1 && <DataChip label={`${count}x`} color="primary" sx={{ fontWeight: 800 }} />}
        {shown && shown.amount !== null && <DataChip label={`Quantidade: ${formatRange(shown.amount, shown.maxAmount)}`} />}
        {shown && shown.chance !== null && <DataChip label={`Chance: ${formatChance(shown.chance)}`} />}
        {respawn && <DataChip label={`Reaparece: ${respawn}`} />}
        {samplePoint.events.map((event) => (
          <DataChip key={event} color="info" variant="outlined" label={references.name({ kind: "event", extId: event })} />
        ))}
      </Stack>
      {samplePoint.summary && <Typography variant="body2">{samplePoint.summary}</Typography>}
      {samplePoint.conditions.length > 0 && <SpawnConditionList conditions={samplePoint.conditions} references={references} />}
      {others.length > 0 && (
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {filter?.param === "item" && !shown ? "Através de" : "Junto com"}
          </Typography>
          <ContentReferences
            variant="outlined"
            entries={others.map((entry) => ({
              target: entry.target,
              resolved: references.find(entry.target),
              amount: entry.amount,
              maxAmount: entry.maxAmount,
              chance: entry.chance,
            }))}
          />
        </Stack>
      )}
    </Stack>
  );
}

/**
 * Pontos de spawn / drop agrupados por mapa/localização com agrupamento inteligente de ocorrências idênticas (ex.: "6x"),
 * cabeçalho Breadcrumb integrado ao DetainItem, botão de Voltar nível e mini-mapa com marcação de pontos.
 */
export function SpawnPointsByMap({
  points,
  filter,
  references,
  label,
  startIcon,
  count,
  size,
}: SpawnPointsByMapProps) {
  const navigate = useNavigate();
  const { gameId = "" } = useParams<{ gameId: string }>();
  const { isMobile } = usePlatform();

  // Busca lista de mapas para renderizar o mini-mapa
  const mapsQuery = useContentList<MapDocument>(gameId, "maps", { size: MAX_PAGE_SIZE });
  const mapsMap = useMemo(
    () => new Map((mapsQuery.data?.content ?? []).map((m) => [m.extId, m])),
    [mapsQuery.data],
  );

  // Agrupa pontos por mapa (ou localização se não houver mapa)
  const groups = useMemo(() => {
    const mapDict = new Map<string, SpawnPointDocument[]>();
    points.forEach((point) => {
      const key = point.map ?? point.location ?? "geral";
      mapDict.set(key, [...(mapDict.get(key) ?? []), point]);
    });

    const result: MapGroup[] = [];
    mapDict.forEach((list, key) => {
      const sample = list[0];
      const mapId = sample.map;
      const name = mapId
        ? references.name({ kind: "map", extId: mapId })
        : sample.location
        ? references.name({ kind: "location", extId: sample.location })
        : "Ocorrência sem mapa";
      result.push({ id: key, mapId, name, points: list });
    });
    return result;
  }, [points, references]);

  const isSingle = groups.length === 1;

  // Se houver apenas 1 grupo, inicia diretamente selecionado. Se houver vários, inicia no Nível 0 (lista).
  const [selectedId, setSelectedId] = useState<string | null>(isSingle ? groups[0]?.id ?? null : null);

  useEffect(() => {
    if (isSingle && groups[0]) {
      setSelectedId(groups[0].id);
    }
  }, [isSingle, groups]);

  if (!points || points.length === 0) return null;

  const activeGroup = selectedId ? groups.find((g) => g.id === selectedId) : null;
  const activeMapDoc = activeGroup?.mapId ? mapsMap.get(activeGroup.mapId) : undefined;
  const rootLabel = label ?? (filter?.param === "entity" ? "Onde aparece" : "Locais de drop");
  const icon = startIcon ?? (filter?.param === "entity" ? <PlaceIcon color="primary" /> : <MapIcon color="primary" />);

  // Agrupa ocorrências idênticas dentro do grupo ativo para não repetir linhas iguais (ex.: "6x")
  const distinctOccurrences = useMemo(() => {
    if (!activeGroup) return [];
    const mapDict = new Map<string, { samplePoint: SpawnPointDocument; count: number }>();

    activeGroup.points.forEach((point) => {
      const isFocus = (target: Reference) => filter && target.extId === filter.value && (target.kind ?? filter.param) === filter.param;
      const occupant = point.occupants.find((entry) => isFocus(entry.target));
      const drop = point.drops.find((entry) => isFocus(entry.target));
      const shown = occupant ?? drop;
      const others = point.occupants.filter((entry) => !isFocus(entry.target));
      const respawn = respawnLabel(point.respawnMode, point.respawnDelayMinutes);

      const sig = JSON.stringify({
        name: point.name ?? "",
        shownAmount: shown?.amount ?? null,
        shownMax: shown?.maxAmount ?? null,
        shownChance: shown?.chance ?? null,
        respawn: respawn ?? "",
        events: [...point.events].sort(),
        summary: point.summary ?? "",
        conditions: point.conditions,
        others: others.map((o) => ({ kind: o.target.kind, extId: o.target.extId, amount: o.amount, chance: o.chance })),
      });

      const existing = mapDict.get(sig);
      if (existing) {
        existing.count += 1;
      } else {
        mapDict.set(sig, { samplePoint: point, count: 1 });
      }
    });

    return Array.from(mapDict.values());
  }, [activeGroup, filter]);

  const handleOpenMap = (mapId: string | null) => {
    if (!mapId) return;
    const search = filter ? `?${filter.param}=${encodeURIComponent(filter.value)}` : "";
    navigate(`/game/${gameId}/map/${encodeURIComponent(mapId)}${search}`);
  };

  const handleBack = () => {
    setSelectedId(null);
  };

  const breadcrumbTitle = (
    <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
      <Typography
        variant="subtitle2"
        fontSize={isMobile ? undefined : 24}
        color={activeGroup && !isSingle ? "primary" : "text.primary"}
        fontWeight={700}
        sx={{ cursor: activeGroup && !isSingle ? "pointer" : "default" }}
        onClick={() => {
          if (activeGroup && !isSingle) setSelectedId(null);
        }}
      >
        {rootLabel}
      </Typography>
      {activeGroup && (
        <Typography
          variant="subtitle2"
          fontSize={isMobile ? undefined : 24}
          color="text.primary"
          fontWeight={700}
        >
          {activeGroup.name}
        </Typography>
      )}
    </Breadcrumbs>
  );

  const actionButtons = (
    <Stack direction="row" spacing={1} alignItems="center">
      {activeGroup && !isSingle && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArrowBackIcon fontSize="small" />}
          onClick={handleBack}
          sx={{ textTransform: "none" }}
        >
          Voltar
        </Button>
      )}
      {activeGroup?.mapId && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<LaunchIcon fontSize="small" />}
          onClick={() => handleOpenMap(activeGroup.mapId)}
          sx={{ textTransform: "none" }}
        >
          Abrir no mapa interativo
        </Button>
      )}
    </Stack>
  );

  return (
    <DetainItem
      startIcon={icon}
      label={breadcrumbTitle}
      count={count ?? points.length}
      actions={actionButtons}
      size={size}
    >
      <Stack spacing={2} sx={{ pt: 0.5 }}>
        {/* Visão Nível 0: Lista de cartões para escolher qual mapa/localização visualizar (quando há múltiplos) */}
        {!activeGroup && (
          <Grid container spacing={1.5}>
            {groups.map((group) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={group.id}>
                <DataCard
                  onClick={() => setSelectedId(group.id)}
                  sx={{
                    p: 1.5,
                    gap: 1.5,
                    cursor: "pointer",
                    border: 1,
                    borderColor: "divider",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "rgba(255, 68, 0, 0.04)",
                    },
                  }}
                >
                  <MapIcon color="primary" />
                  <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {group.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.points.length} {group.points.length === 1 ? "ocorrência" : "ocorrências"}
                    </Typography>
                  </Stack>
                </DataCard>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Visão Nível 1: Detalhes da ocorrência selecionada (deduplicada com "6x") + Mini-mapa com pontinhos */}
        {activeGroup && (
          <Stack spacing={2}>
            <Divider />

            <Stack spacing={1.5}>
              {distinctOccurrences.map((item, idx) => (
                <DistinctOccurrenceDetails
                  key={idx}
                  samplePoint={item.samplePoint}
                  count={item.count}
                  filter={filter}
                  references={references}
                />
              ))}
            </Stack>

            {activeMapDoc && (
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Localização no mapa:
                </Typography>
                <MiniMapPreview mapDoc={activeMapDoc} points={activeGroup.points} references={references} filter={filter} />
              </Stack>
            )}
          </Stack>
        )}
      </Stack>
    </DetainItem>
  );
}
