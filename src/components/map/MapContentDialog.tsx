import { useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  CircularProgress,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Place, Polyline } from "@mui/icons-material";
import {
  MAX_PAGE_SIZE,
  type EventDocument,
  type LocationDocument,
  type Reference,
  type ResolvedReference,
} from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentList } from "../../api/useContent";
import { ApiContentSelector } from "../common/ApiContentSelector";
import { CodesField, type CodeOption } from "../common/CodesField";
import { numberOf, slugOf, useContentSave } from "../common/contentForm";
import { FormSection, TargetRow } from "../common/formLayout";
import { chanceOut, isChance, isOptionalInteger, move } from "../common/formValues";
import { IconUploadField } from "../common/IconUploadField";
import { StyledDialog } from "../common/StyledDialog";

/** Tipos de local em uso nos jogos; o campo aceita um tipo novo digitado. */
const LOCATION_TYPES = ["poi", "location", "biome", "region", "dungeon", "spawner"];

const LOCATION_TYPE_LABELS: Record<string, string> = {
  poi: "Ponto de interesse",
  location: "Localização",
  biome: "Bioma",
  region: "Região",
  dungeon: "Masmorra",
  spawner: "Gerador",
};

/** Como o ponto volta depois de coletado; o mapa usa isso na contagem de respawn. */
const RESPAWN_MODES = [
  { value: "", label: "Não informado" },
  { value: "respawn", label: "Por tempo" },
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "once", label: "Uma vez só" },
];

interface OccupantRow {
  key: number;
  target: Reference;
  /** Em porcentagem, de 0 a 100; vazio é "sempre aparece". */
  chance: string;
  amount: string;
  maxAmount: string;
}

let nextKey = 1;
const key = () => nextKey++;

/** A geometria desenhada no mapa, já em WKT de coordenadas de jogo. */
export interface DrawnGeometry {
  wkt: string;
  /** Ponto: pode virar ponto de spawn ou local pontual. Polígono: só local. */
  isPoint: boolean;
  /** Quantos vértices o desenho tem, para mostrar no resumo. */
  vertices: number;
}

interface MapContentDialogProps {
  gameId: string;
  mapId: string;
  geometry: DrawnGeometry;
  onClose: () => void;
  /** Depois de gravar: o mapa recarrega e mostra o que entrou. */
  onSaved: (kind: "spawn" | "location") => void;
}

/**
 * Registro do que foi desenhado no mapa: ponto de spawn (o que aparece ali) ou local (bioma, região,
 * POI). A geometria vem pronta do desenho; aqui se escolhe o tipo e se preenchem os dados. Polígono
 * só pode ser local, porque ponto de spawn exige uma posição em ponto.
 */
export function MapContentDialog({ gameId, mapId, geometry, onClose, onSaved }: MapContentDialogProps) {
  const [kind, setKind] = useState<"spawn" | "location">(geometry.isPoint ? "spawn" : "location");
  const [extId, setExtId] = useState("");
  const [extIdTouched, setExtIdTouched] = useState(false);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<File | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  // Ponto de spawn
  const [occupants, setOccupants] = useState<OccupantRow[]>([]);
  const [respawnMode, setRespawnMode] = useState("");
  const [respawnDelay, setRespawnDelay] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  // Local
  const [locationType, setLocationType] = useState(geometry.isPoint ? "poi" : "region");
  const [parent, setParent] = useState<string | null>(null);
  const [picking, setPicking] = useState<{ index: number | null } | null>(null);
  // Fixado na abertura: o código sugerido não pode mudar a cada render.
  const [stamp] = useState(() => Date.now());

  const resource = kind === "spawn" ? "spawn-points" : "locations";
  const { save, saving, error } = useContentSave(gameId, resource, true);
  const eventList = useContentList<EventDocument>(gameId, "events", { size: MAX_PAGE_SIZE, sort: "name" });
  const locations = useContentList<LocationDocument>(gameId, "locations", { size: MAX_PAGE_SIZE, sort: "name" });

  const eventOptions = useMemo<CodeOption[]>(
    () =>
      (eventList.data?.content ?? []).map((event) => ({
        extId: event.extId,
        name: event.name ?? event.extId,
        iconMediaId: currentMedia(event.media, "icon"),
      })),
    [eventList.data],
  );
  const locationOptions = useMemo(
    () => (locations.data?.content ?? []).filter((candidate) => candidate.map === null || candidate.map === mapId),
    [locations.data, mapId],
  );

  /** Código sugerido: pelo nome, pelo primeiro ocupante ou, sem os dois, pelo tipo e a hora. */
  const suggestedExtId = () => {
    if (name.trim()) return slugOf(name);
    if (kind === "spawn" && occupants[0]) return `ponto_${slugOf(occupants[0].target.extId)}`;
    return `${kind === "spawn" ? "ponto" : locationType}_${stamp}`;
  };
  const code = extIdTouched || extId ? extId : suggestedExtId();

  const updateOccupant = (index: number, changes: Partial<OccupantRow>) =>
    setOccupants((current) => current.map((row, position) => (position === index ? { ...row, ...changes } : row)));

  const occupantsInvalid = occupants.some(
    (row) =>
      !isChance(row.chance) ||
      !isOptionalInteger(row.amount) ||
      !isOptionalInteger(row.maxAmount) ||
      (numberOf(row.maxAmount) !== null && (numberOf(row.maxAmount) ?? 0) < (numberOf(row.amount) ?? 0)),
  );
  const delayInvalid = !isOptionalInteger(respawnDelay) || (numberOf(respawnDelay) ?? 0) < 0;
  const valid =
    code.trim() !== "" && (kind === "spawn" ? !occupantsInvalid && !delayInvalid : name.trim() !== "" && locationType.trim() !== "");

  const submit = async () => {
    if (!valid) return;
    const id = code.trim();
    const document =
      kind === "spawn"
        ? {
            extId: id,
            name: name.trim() || null,
            summary: summary.trim() || null,
            description: description.trim() || null,
            map: mapId,
            location,
            position: geometry.wkt,
            respawnMode: respawnMode || null,
            respawnDelayMinutes: numberOf(respawnDelay),
            occupants: occupants.map((row) => ({
              target: row.target,
              chance: chanceOut(row.chance),
              amount: numberOf(row.amount),
              maxAmount: numberOf(row.maxAmount),
            })),
            drops: [],
            events,
          }
        : {
            extId: id,
            name: name.trim(),
            summary: summary.trim() || null,
            description: description.trim() || null,
            locationType,
            parent,
            map: mapId,
            area: geometry.wkt,
            events,
          };
    const saved = await save(id, document, [{ file: icon, usage: "icon" }]);
    if (saved) onSaved(kind);
  };

  return (
    <StyledDialog
      open
      modal
      onClose={saving ? () => undefined : onClose}
      title={kind === "spawn" ? "Novo ponto de spawn" : "Novo local"}
      maxWidth="sm"
      actions={
        <>
          <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={!valid || saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none" }}
          >
            Salvar no mapa
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            icon={geometry.isPoint ? <Place /> : <Polyline />}
            label={geometry.isPoint ? "Ponto desenhado" : `Área com ${geometry.vertices} vértices`}
            color="primary"
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>
            {geometry.wkt.length > 60 ? `${geometry.wkt.slice(0, 60)}…` : geometry.wkt}
          </Typography>
        </Stack>

        <TextField
          select
          label="O que é"
          value={kind}
          onChange={(event) => setKind(event.target.value as "spawn" | "location")}
          helperText={geometry.isPoint ? undefined : "Área só pode ser local: ponto de spawn precisa de uma posição."}
          fullWidth
        >
          <MenuItem value="spawn" disabled={!geometry.isPoint}>
            Ponto de spawn — o que aparece aqui
          </MenuItem>
          <MenuItem value="location">Local — bioma, região, ponto de interesse</MenuItem>
        </TextField>

        <IconUploadField currentMediaId={null} kind={kind === "spawn" ? "spawn_point" : "location"} file={icon} onChange={setIcon} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required={kind === "location"}
              autoFocus
              helperText={kind === "spawn" ? "Opcional: sem nome, vale o do primeiro ocupante." : undefined}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Código"
              value={code}
              onChange={(event) => {
                setExtIdTouched(true);
                setExtId(event.target.value);
              }}
              required
              helperText="Identifica o registro; sugerido pelo nome."
              fullWidth
              slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
            />
          </Grid>
        </Grid>

        {kind === "spawn" ? (
          <>
            <FormSection
              title="Ocupantes"
              action={
                <Button size="small" startIcon={<Add />} onClick={() => setPicking({ index: null })} sx={{ textTransform: "none" }}>
                  Adicionar
                </Button>
              }
            />
            {occupants.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Sem ocupante, o ponto entra no mapa só com o nome.
              </Typography>
            )}
            {occupants.map((row, index) => (
              <TargetRow
                key={row.key}
                gameId={gameId}
                target={row.target}
                onPick={() => setPicking({ index })}
                onUp={index > 0 ? () => setOccupants(move(occupants, index, -1)) : undefined}
                onDown={index < occupants.length - 1 ? () => setOccupants(move(occupants, index, 1)) : undefined}
                onRemove={() => setOccupants(occupants.filter((_, position) => position !== index))}
              >
                <TextField
                  label="De"
                  size="small"
                  value={row.amount}
                  onChange={(event) => updateOccupant(index, { amount: event.target.value })}
                  error={!isOptionalInteger(row.amount)}
                  sx={{ width: 80 }}
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
                <TextField
                  label="Até"
                  size="small"
                  value={row.maxAmount}
                  onChange={(event) => updateOccupant(index, { maxAmount: event.target.value })}
                  error={!isOptionalInteger(row.maxAmount)}
                  sx={{ width: 80 }}
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
                <TextField
                  label="Chance"
                  size="small"
                  value={row.chance}
                  onChange={(event) => updateOccupant(index, { chance: event.target.value })}
                  error={!isChance(row.chance)}
                  placeholder="100"
                  sx={{ width: 110 }}
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                    htmlInput: { inputMode: "decimal" },
                  }}
                />
              </TargetRow>
            ))}

            <FormSection title="Respawn e local" />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Modo" value={respawnMode} onChange={(event) => setRespawnMode(event.target.value)} fullWidth>
                  {RESPAWN_MODES.map((mode) => (
                    <MenuItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Tempo"
                  value={respawnDelay}
                  onChange={(event) => setRespawnDelay(event.target.value)}
                  error={delayInvalid}
                  disabled={respawnMode !== "respawn"}
                  helperText={respawnMode === "respawn" ? "Minutos até voltar." : undefined}
                  fullWidth
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">min</InputAdornment> },
                    htmlInput: { inputMode: "numeric" },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  label="Dentro do local"
                  value={location ?? ""}
                  onChange={(event) => setLocation(event.target.value || null)}
                  fullWidth
                >
                  <MenuItem value="">
                    <em>Nenhum</em>
                  </MenuItem>
                  {locationOptions.map((option) => (
                    <MenuItem key={option.extId} value={option.extId}>
                      {option.name ?? option.extId}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </>
        ) : (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                freeSolo
                options={LOCATION_TYPES}
                getOptionLabel={(option) => LOCATION_TYPE_LABELS[option] ?? option}
                value={locationType}
                onChange={(_, value) => setLocationType(value ?? "")}
                onInputChange={(_, value, reason) => {
                  if (reason === "input") setLocationType(value);
                }}
                renderInput={(params) => <TextField {...params} label="Tipo do local" required error={locationType.trim() === ""} />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Dentro de"
                value={parent ?? ""}
                onChange={(event) => setParent(event.target.value || null)}
                helperText="Local que contém este, ex.: a região do bioma."
                fullWidth
              >
                <MenuItem value="">
                  <em>Nenhum</em>
                </MenuItem>
                {locationOptions.map((option) => (
                  <MenuItem key={option.extId} value={option.extId}>
                    {option.name ?? option.extId}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        )}

        <FormSection title="Descrição e eventos" />
        <TextField label="Resumo" value={summary} onChange={(event) => setSummary(event.target.value)} fullWidth />
        <TextField
          label="Descrição"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
        <CodesField
          label="Eventos"
          options={eventOptions}
          value={events}
          onChange={setEvents}
          loading={eventList.isPending}
          helperText="Com eventos, só aparece no mapa quando algum deles está ativo."
        />

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>

      {picking && (
        <ApiContentSelector
          open
          modal
          gameId={gameId}
          kinds={["entities", "items"]}
          title="Selecionar ocupante"
          onClose={() => setPicking(null)}
          onConfirm={(selection: ResolvedReference) => {
            const target: Reference = { kind: selection.kind, extId: selection.extId };
            if (picking.index !== null) updateOccupant(picking.index, { target });
            else setOccupants((current) => [...current, { key: key(), target, chance: "", amount: "", maxAmount: "" }]);
            setPicking(null);
          }}
        />
      )}
    </StyledDialog>
  );
}
