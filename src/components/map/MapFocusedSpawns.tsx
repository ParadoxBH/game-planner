import { useMemo } from "react";
import { Alert, CircularProgress, Grid, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PlaceIcon from "@mui/icons-material/Place";
import { MAX_PAGE_SIZE, type LocationDocument, type Reference, type SpawnPointDocument } from "../../api/content";
import { ReferenceIndex } from "../../api/references";
import { useContentDocuments, useContentList } from "../../api/useContent";
import { and, rule } from "../../api/query";
import { formatChance, formatRange } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";
import { DetainItem } from "../common/DetainItem";
import { locationTypeOf, typeLabel } from "./MapFilterDrawer";
import { respawnLabel } from "./MapSpawnPopup";
import { SpawnConditionList } from "./SpawnConditions";

export interface MapFocus {
  param: "item" | "entity";
  value: string;
}

interface MapFocusedSpawnsProps {
  gameId: string;
  mapId: string;
  focus: MapFocus;
}

/** Tipos de local na ordem de exibição; os demais vêm depois, em ordem alfabética. */
const TYPE_ORDER = ["biome", "region", "dungeon", "poi", "spawner", "location"];
const NO_LOCATION = "";

interface LocationGroup {
  locationId: string;
  location: LocationDocument | undefined;
  name: string;
  points: SpawnPointDocument[];
}

/**
 * Onde um item ou entidade aparece neste mapa, local por local. Lê /spawn-points pelo ocupante (ou pelo que o
 * ponto rende, para item), então inclui pontos sem posição, que valem para o local inteiro (biomas, masmorras).
 */
export function MapFocusedSpawns({ gameId, mapId, focus }: MapFocusedSpawnsProps) {
  const theme = useTheme();
  const { spacing: dtSpacing, borderRadius: dtRadius } = theme.designTokens;

  const where =
    focus.param === "entity"
      ? and(rule("occupant", "equal", `entity:${focus.value}`))
      : and(rule("yields", "equal", `item:${focus.value}`));
  const spawns = useContentList<SpawnPointDocument>(gameId, "spawn-points", { size: MAX_PAGE_SIZE, where, references: true });
  const references = useMemo(() => new ReferenceIndex(spawns.data?.references), [spawns.data]);

  // Pontos sem mapa (ex.: geradores de criatura) também aparecem: pertencem ao local, não a um mapa.
  const points = useMemo(
    () => (spawns.data?.content ?? []).filter((point) => !point.map || point.map === mapId),
    [spawns.data, mapId],
  );

  // A listagem de locais do mapa é paginada; aqui só interessam os citados e os locais que os contêm.
  const locationIds = useMemo(() => [...new Set(points.map((point) => point.location).filter((id): id is string => Boolean(id)))], [points]);
  const locations = useContentDocuments<LocationDocument>(gameId, "locations", locationIds);
  const parentIds = useMemo(
    () => [...new Set([...locations.values()].map((location) => location.parent).filter((id): id is string => Boolean(id)))],
    [locations],
  );
  const parents = useContentDocuments<LocationDocument>(gameId, "locations", parentIds);

  const sections = useMemo(() => {
    const byLocation = new Map<string, SpawnPointDocument[]>();
    points.forEach((point) => {
      const key = point.location ?? NO_LOCATION;
      byLocation.set(key, [...(byLocation.get(key) ?? []), point]);
    });

    const byType = new Map<string, LocationGroup[]>();
    byLocation.forEach((list, locationId) => {
      const location = locations.get(locationId);
      const type = location ? locationTypeOf(location) : "location";
      const name =
        locationId === NO_LOCATION ? "Sem local definido" : location?.name ?? references.name({ kind: "location", extId: locationId });
      byType.set(type, [...(byType.get(type) ?? []), { locationId, location, name, points: list }]);
    });

    const rank = (type: string) => (TYPE_ORDER.includes(type) ? TYPE_ORDER.indexOf(type) : TYPE_ORDER.length);
    return [...byType.entries()]
      .map(([type, groups]) => ({ type, groups: groups.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => rank(a.type) - rank(b.type) || a.type.localeCompare(b.type));
  }, [points, locations, references]);

  if (spawns.isPending) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (spawns.isError) return <Alert severity="error">{spawns.error.message}</Alert>;
  if (points.length === 0) return <Alert severity="info">Não há ocorrências registradas neste mapa.</Alert>;

  return (
    <Stack spacing={1}>
      {spawns.data.total > spawns.data.content.length && (
        <Alert severity="warning">
          Mostrando {spawns.data.content.length} de {spawns.data.total} ocorrências.
        </Alert>
      )}
      <Grid container spacing={1}>
        {sections.map(({ type, groups }) => (
          <DetainItem key={type} startIcon={<PlaceIcon color="primary" />} label={typeLabel(type)} count={groups.length}>
            <Grid container spacing={dtSpacing.itemGap}>
              {groups.map((group) => {
                const parent = group.location?.parent ? parents.get(group.location.parent) : undefined;
                return (
                  <Grid size={{ xs: 12, md: 6 }} key={group.locationId || "sem-local"}>
                    <DataCard
                      sx={{ height: "100%", p: dtSpacing.cardPadding, flexDirection: "column", alignItems: "stretch", gap: 1, borderRadius: dtRadius }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={900} sx={{ flex: 1, minWidth: 0 }}>
                          {group.name}
                        </Typography>
                        {group.points.length > 1 && <DataChip label={`${group.points.length} ocorrências`} />}
                        {(parent || group.location?.parent) && <DataChip label={parent?.name ?? group.location?.parent} />}
                      </Stack>
                      {group.location?.summary && (
                        <Typography variant="caption" color="text.secondary">
                          {group.location.summary}
                        </Typography>
                      )}
                      {group.points.map((point) => (
                        <SpawnPointDetails key={point.extId} point={point} focus={focus} references={references} />
                      ))}
                    </DataCard>
                  </Grid>
                );
              })}
            </Grid>
          </DetainItem>
        ))}
      </Grid>
    </Stack>
  );
}

interface SpawnPointDetailsProps {
  point: SpawnPointDocument;
  focus: MapFocus;
  references: ReferenceIndex;
}

/** Uma ocorrência: quantidade e chance do alvo, reaparecimento, eventos em que vale e condições. */
function SpawnPointDetails({ point, focus, references }: SpawnPointDetailsProps) {
  const isFocus = (target: Reference) => target.extId === focus.value && (target.kind ?? focus.param) === focus.param;
  const occupant = point.occupants.find((entry) => isFocus(entry.target));
  const drop = point.drops.find((entry) => isFocus(entry.target));
  const shown = occupant ?? drop;
  // Para item, quem rende pode ser a entidade que aparece no ponto: ela é mostrada como origem.
  const others = point.occupants.filter((entry) => !isFocus(entry.target));
  const respawn = respawnLabel(point.respawnMode, point.respawnDelayMinutes);

  return (
    <Stack spacing={0.75} sx={{ borderTop: 1, borderColor: "divider", pt: 1 }}>
      {point.name && (
        <Typography variant="body2" fontWeight={700}>
          {point.name}
        </Typography>
      )}
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
        {shown && shown.amount !== null && <DataChip label={`Quantidade ${formatRange(shown.amount, shown.maxAmount)}`} />}
        {shown && shown.chance !== null && <DataChip label={`Chance ${formatChance(shown.chance)}`} />}
        {respawn && <DataChip label={`Reaparece: ${respawn}`} />}
        {point.events.map((event) => (
          <DataChip key={event} color="info" variant="outlined" label={references.name({ kind: "event", extId: event })} />
        ))}
      </Stack>
      {point.events.length > 1 && (
        <Typography variant="caption" color="text.secondary">
          Vale com qualquer um desses eventos ativo.
        </Typography>
      )}
      {point.summary && <Typography variant="body2">{point.summary}</Typography>}
      {point.conditions.length > 0 && <SpawnConditionList conditions={point.conditions} references={references} />}
      {others.length > 0 && (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {focus.param === "item" && !shown ? "Através de" : "Junto com"}
          </Typography>
          {others.map((entry, index) => (
            <ContentChip
              key={index}
              target={entry.target}
              resolved={references.find(entry.target)}
              amount={entry.amount}
              maxAmount={entry.maxAmount}
              chance={entry.chance}
              size="small"
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
