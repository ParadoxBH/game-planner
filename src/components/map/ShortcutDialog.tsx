import { useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, Clear, Delete, Place, Shortcut } from "@mui/icons-material";
import {
  MAX_PAGE_SIZE,
  type EventDocument,
  type LevelOperator,
  type MapDocument,
  type Reference,
  type ResolvedReference,
  type ShortcutDocument,
} from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentDocument, useContentList, useContentWrites } from "../../api/useContent";
import { ApiContentSelector, type SelectorKind } from "../common/ApiContentSelector";
import { CodesField, type CodeOption } from "../common/CodesField";
import { ConfirmDeleteDialog } from "../common/ConfirmDeleteDialog";
import { describeError, numberOf, useContentSave } from "../common/contentForm";
import { FormSection, TabLabel, TargetRow } from "../common/formLayout";
import { isLevel, isPositive, levelOut, move } from "../common/formValues";
import { IconUploadField } from "../common/IconUploadField";
import { LevelFields } from "../common/LevelFields";
import { ReferenceName } from "../common/ReferenceName";
import { StyledDialog } from "../common/StyledDialog";
import { SHORTCUT_UNLOCK_LABELS } from "./shortcutLabels";

export type ShortcutEndName = "origin" | "destination";

/** Uma ponta como o formulário a recebe: o mapa e, quando já marcado, o ponto em WKT. */
export interface ShortcutEndDraft {
  map: string;
  position: string | null;
}

interface ShortcutDialogProps {
  gameId: string;
  maps: MapDocument[];
  /** Cadastro novo: as pontas que já se sabe (a origem vem do clique no mapa). */
  initial?: { origin: ShortcutEndDraft; destination: ShortcutEndDraft };
  /** Código do atalho em edição; sem ele, é cadastro novo. */
  editId?: string;
  /** Escondido enquanto se marca um ponto no mapa: o formulário continua montado e não perde nada. */
  hidden?: boolean;
  /** Pede um ponto no mapa dado; `apply` recebe o WKT do clique. */
  onPickPoint: (end: ShortcutEndName, mapId: string, apply: (wkt: string) => void) => void;
  onClose: () => void;
  onSaved: () => void;
  /** Mostra "Apagar" (moderador ou acima). */
  canDelete?: boolean;
}

/** Editando, espera o documento chegar para o formulário nascer preenchido. */
export function ShortcutDialog(props: ShortcutDialogProps) {
  const { gameId, editId, hidden, onClose } = props;
  const document = useContentDocument<ShortcutDocument>(gameId, "shortcuts", editId);
  if (!editId) return <ShortcutForm {...props} />;
  if (document.isPending || !document.data) {
    return (
      <StyledDialog open={!hidden} modal onClose={onClose} title="Abrindo..." maxWidth="sm">
        <Stack alignItems="center" sx={{ py: 6 }}>
          {document.isError ? <Alert severity="error">{describeError(document.error)}</Alert> : <CircularProgress color="primary" />}
        </Stack>
      </StyledDialog>
    );
  }
  return <ShortcutForm {...props} saved={document.data} />;
}

/** Coordenadas de um ponto WKT, com Z quando houver. */
function coordinatesOf(wkt: string | null): string[] {
  const match = wkt?.match(/POINT\s*(?:Z\s*)?\(([^)]+)\)/i);
  return match ? match[1].trim().split(/[\s,]+/) : [];
}

interface EndRow {
  map: string;
  x: string;
  y: string;
  /** Altura do ponto, quando o jogo grava; não aparece no formulário e volta intacta ao salvar. */
  z: string | null;
}

function endRow(end: ShortcutEndDraft | undefined, fallbackMap: string): EndRow {
  const [x = "", y = "", z = null] = coordinatesOf(end?.position ?? null);
  return { map: end?.map ?? fallbackMap, x, y, z };
}

function isNumber(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value));
}

function endInvalid(end: EndRow): boolean {
  return end.map === "" || !isNumber(end.x) || !isNumber(end.y);
}

function positionOf(end: EndRow): string {
  const z = end.z === null ? "" : ` ${end.z}`;
  return `${end.z === null ? "POINT" : "POINT Z"} (${Number(end.x)} ${Number(end.y)}${z})`;
}

interface RequirementRow {
  key: number;
  target: Reference;
  amount: string;
  notConsumed: boolean;
  level: string;
  levelOperator: LevelOperator;
}

interface UnlockRow {
  key: number;
  type: string;
  target: Reference | null;
  value: string;
}

type ShortcutTab = "data" | "requirements" | "unlock";
type Picking = { list: "requirements" | "unlock"; index: number | null } | null;

const PICK_KINDS: Record<"requirements" | "unlock", SelectorKind[]> = {
  requirements: ["items", "entities"],
  // Desbloqueio costuma ser um chefe derrotado (entidade) ou um item encontrado.
  unlock: ["entities", "items"],
};

let nextKey = 1;
const key = () => nextKey++;

interface EndFieldsProps {
  label: string;
  end: EndRow;
  maps: MapDocument[];
  onChange: (changes: Partial<EndRow>) => void;
  onPick: () => void;
}

/** Mapa e coordenadas de uma ponta, com o botão de marcar no mapa. */
function EndFields({ label, end, maps, onChange, onPick }: EndFieldsProps) {
  return (
    <Stack spacing={1} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2" fontWeight={700}>
          {label}
        </Typography>
        <Button size="small" startIcon={<Place />} onClick={onPick} disabled={end.map === ""} sx={{ textTransform: "none" }}>
          Marcar no mapa
        </Button>
      </Stack>
      <Grid container spacing={1}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField select label="Mapa" size="small" value={end.map} onChange={(event) => onChange({ map: event.target.value })} required fullWidth>
            {maps.map((map) => (
              <MenuItem key={map.extId} value={map.extId}>
                {map.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            label="X"
            size="small"
            value={end.x}
            onChange={(event) => onChange({ x: event.target.value })}
            error={end.x !== "" && !isNumber(end.x)}
            fullWidth
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            label="Y"
            size="small"
            value={end.y}
            onChange={(event) => onChange({ y: event.target.value })}
            error={end.y !== "" && !isNumber(end.y)}
            fullWidth
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        </Grid>
      </Grid>
      {(end.x === "" || end.y === "") && (
        <Typography variant="caption" color="text.secondary">
          Marque no mapa ou digite as coordenadas.
        </Typography>
      )}
    </Stack>
  );
}

/**
 * Cadastro do atalho: as duas pontas (mapa e ponto), se vale nos dois sentidos, o que se precisa ter para usar
 * e o que o libera. A ponta pode ser marcada no mapa, inclusive em outro mapa: a janela some, o mapa muda e o
 * clique volta para cá.
 */
function ShortcutForm({
  gameId,
  maps,
  initial,
  editId,
  hidden = false,
  onPickPoint,
  onClose,
  onSaved,
  canDelete = false,
  saved,
}: ShortcutDialogProps & { saved?: ShortcutDocument }) {
  const firstMap = maps[0]?.extId ?? "";
  const [tab, setTab] = useState<ShortcutTab>("data");
  const [extId, setExtId] = useState(saved?.extId ?? "");
  const [name, setName] = useState(saved?.name ?? "");
  const [summary, setSummary] = useState(saved?.summary ?? "");
  const [description, setDescription] = useState(saved?.description ?? "");
  const [icon, setIcon] = useState<File | null>(null);
  const [origin, setOrigin] = useState(() => endRow(saved?.origin ?? initial?.origin, firstMap));
  const [destination, setDestination] = useState(() => endRow(saved?.destination ?? initial?.destination, firstMap));
  const [bidirectional, setBidirectional] = useState(saved?.bidirectional ?? true);
  const [events, setEvents] = useState<string[]>(saved?.events ?? []);
  const [requirements, setRequirements] = useState<RequirementRow[]>(
    (saved?.requirements ?? []).map((requirement) => ({
      key: key(),
      target: requirement.target,
      amount: String(requirement.amount),
      notConsumed: requirement.notConsumed,
      level: requirement.level === null ? "" : String(requirement.level),
      levelOperator: requirement.levelOperator ?? "exact",
    })),
  );
  const [unlock, setUnlock] = useState<UnlockRow[]>(
    (saved?.unlock ?? []).map((row) => ({ key: key(), type: row.type, target: row.target, value: row.value ?? "" })),
  );
  const [picking, setPicking] = useState<Picking>(null);
  const [deleting, setDeleting] = useState(false);
  // Código de quem deixa o campo vazio; fixado na abertura para que tentar salvar de novo substitua o mesmo registro.
  const [randomId] = useState(() => crypto.randomUUID());

  const { save, saving, error } = useContentSave(gameId, "shortcuts", !editId);
  const { remove } = useContentWrites(gameId, "shortcuts");
  const eventList = useContentList<EventDocument>(gameId, "events", { size: MAX_PAGE_SIZE, sort: "name" });
  const eventOptions = useMemo<CodeOption[]>(
    () =>
      (eventList.data?.content ?? []).map((event) => ({
        extId: event.extId,
        name: event.name ?? event.extId,
        iconMediaId: currentMedia(event.media, "icon"),
      })),
    [eventList.data],
  );

  const updateRequirement = (index: number, changes: Partial<RequirementRow>) =>
    setRequirements((current) => current.map((row, position) => (position === index ? { ...row, ...changes } : row)));
  const updateUnlock = (index: number, changes: Partial<UnlockRow>) =>
    setUnlock((current) => current.map((row, position) => (position === index ? { ...row, ...changes } : row)));

  const pickPoint = (end: ShortcutEndName) => {
    const row = end === "origin" ? origin : destination;
    const set = end === "origin" ? setOrigin : setDestination;
    onPickPoint(end, row.map, (wkt) => {
      const [x = "", y = "", z = null] = coordinatesOf(wkt);
      // O clique é 2D: a altura gravada antes não vale mais para o ponto novo.
      set((current) => ({ ...current, x, y, z }));
    });
  };

  const endsInvalid = endInvalid(origin) || endInvalid(destination);
  const samePlace =
    !endsInvalid && origin.map === destination.map && Number(origin.x) === Number(destination.x) && Number(origin.y) === Number(destination.y);
  const requirementsInvalid = requirements.some((row) => !isPositive(row.amount) || !isLevel(row.level));
  const unlockInvalid = unlock.some((row) => !row.type.trim() || (!row.target && !row.value.trim()));
  const dataInvalid = endsInvalid || samePlace;
  const valid = !dataInvalid && !requirementsInvalid && !unlockInvalid;

  const submit = async () => {
    if (!valid) return;
    const id = extId.trim() || randomId;
    const document = {
      extId: id,
      name: name.trim() || null,
      summary: summary.trim() || null,
      description: description.trim() || null,
      origin: { map: origin.map, position: positionOf(origin) },
      destination: { map: destination.map, position: positionOf(destination) },
      bidirectional,
      requirements: requirements.map((row) => ({
        target: row.target,
        amount: numberOf(row.amount),
        notConsumed: row.notConsumed,
        level: levelOut(row.level),
        levelOperator: levelOut(row.level) === null ? null : row.levelOperator,
      })),
      unlock: unlock.map((row) => ({ type: row.type.trim(), target: row.target, value: row.value.trim() || null })),
      events,
    };
    const ok = await save(id, document, [{ file: icon, usage: "icon" }]);
    if (ok) onSaved();
  };

  const tabs = (
    <Tabs value={tab} onChange={(_, value: ShortcutTab) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
      <Tab value="data" label={<TabLabel label="Dados" invalid={dataInvalid} />} />
      <Tab value="requirements" label={<TabLabel label="Requisitos" count={requirements.length} invalid={requirementsInvalid} />} />
      <Tab value="unlock" label={<TabLabel label="Desbloqueio" count={unlock.length} invalid={unlockInvalid} />} />
    </Tabs>
  );

  return (
    <StyledDialog
      open={!hidden}
      modal
      subHeader={tabs}
      onClose={saving ? () => undefined : onClose}
      title={editId ? "Editar atalho" : "Novo atalho"}
      startIcon={<Shortcut />}
      maxWidth="md"
      actions={
        <>
          {editId && canDelete && (
            <Button color="error" startIcon={<Delete />} onClick={() => setDeleting(true)} disabled={saving} sx={{ textTransform: "none", mr: "auto" }}>
              Apagar
            </Button>
          )}
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
            {editId ? "Salvar" : "Salvar no mapa"}
          </Button>
        </>
      }
    >
      <Stack spacing={1}>
        {tab === "data" && (
          <>
            <IconUploadField currentMediaId={saved ? currentMedia(saved.media, "icon") : null} kind="shortcut" file={icon} onChange={setIcon} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Nome"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoFocus
                  helperText="Opcional: sem nome, vale “Atalho para” o mapa do destino."
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Código"
                  value={extId}
                  onChange={(event) => setExtId(event.target.value)}
                  disabled={Boolean(editId)}
                  helperText={editId ? "O código não muda depois de criado." : "Opcional: vazio, é gerado um código aleatório."}
                  fullWidth
                  slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
                />
              </Grid>
            </Grid>

            <FormSection title="Trajeto" />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <EndFields
                  label="Origem"
                  end={origin}
                  maps={maps}
                  onChange={(changes) => setOrigin((current) => ({ ...current, ...changes }))}
                  onPick={() => pickPoint("origin")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <EndFields
                  label="Destino"
                  end={destination}
                  maps={maps}
                  onChange={(changes) => setDestination((current) => ({ ...current, ...changes }))}
                  onPick={() => pickPoint("destination")}
                />
              </Grid>
            </Grid>
            {samePlace && <Alert severity="warning">Origem e destino estão no mesmo lugar.</Alert>}
            <FormControlLabel
              control={<Switch checked={bidirectional} onChange={(event) => setBidirectional(event.target.checked)} />}
              label={
                <Stack>
                  <Typography variant="body2">{bidirectional ? "Ida e volta" : "Só ida"}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {bidirectional ? "Também leva do destino de volta à origem." : "Leva só da origem para o destino."}
                  </Typography>
                </Stack>
              }
            />

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
          </>
        )}

        {tab === "requirements" && (
          <>
            <FormSection
              title="Requisitos"
              action={
                <Button size="small" startIcon={<Add />} onClick={() => setPicking({ list: "requirements", index: null })} sx={{ textTransform: "none" }}>
                  Adicionar
                </Button>
              }
            />
            <Typography variant="body2" color="text.secondary">
              O que é preciso ter a cada uso: a passagem do barco é gasta, a chave não.
            </Typography>
            {requirements.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Sem requisitos.
              </Typography>
            )}
            {requirements.map((row, index) => (
              <TargetRow
                key={row.key}
                gameId={gameId}
                target={row.target}
                onPick={() => setPicking({ list: "requirements", index })}
                onUp={index > 0 ? () => setRequirements(move(requirements, index, -1)) : undefined}
                onDown={index < requirements.length - 1 ? () => setRequirements(move(requirements, index, 1)) : undefined}
                onRemove={() => setRequirements(requirements.filter((_, position) => position !== index))}
              >
                <TextField
                  label="Quantidade"
                  size="small"
                  value={row.amount}
                  onChange={(event) => updateRequirement(index, { amount: event.target.value })}
                  error={!isPositive(row.amount)}
                  sx={{ width: 120 }}
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
                <LevelFields level={row.level} operator={row.levelOperator} onChange={(changes) => updateRequirement(index, changes)} />
                <Tooltip title="Exigido, mas não gasto (ex.: chave)">
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={row.notConsumed}
                        onChange={(event) => updateRequirement(index, { notConsumed: event.target.checked })}
                      />
                    }
                    label={<Typography variant="body2">Não consome</Typography>}
                  />
                </Tooltip>
              </TargetRow>
            ))}
          </>
        )}

        {tab === "unlock" && (
          <>
            <FormSection
              title="Desbloqueio"
              action={
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setUnlock((current) => [...current, { key: key(), type: "", target: null, value: "" }])}
                  sx={{ textTransform: "none" }}
                >
                  Adicionar
                </Button>
              }
            />
            <Typography variant="body2" color="text.secondary">
              O que libera o atalho uma vez: quest concluída, chefe derrotado, nível do jogador.
            </Typography>
            {unlock.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Disponível desde o início.
              </Typography>
            )}
            {unlock.map((row, index) => (
              <Stack
                key={row.key}
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ sm: "center" }}
                sx={{ p: 1, border: 1, borderColor: "divider", borderRadius: 1 }}
              >
                <Autocomplete
                  freeSolo
                  size="small"
                  options={Object.keys(SHORTCUT_UNLOCK_LABELS)}
                  getOptionLabel={(option) => SHORTCUT_UNLOCK_LABELS[option] ?? option}
                  value={row.type || null}
                  onChange={(_, value) => updateUnlock(index, { type: value ?? "" })}
                  onInputChange={(_, value, reason) => {
                    // Digitado: grava o texto; escolhido na lista, o onChange já gravou o código.
                    if (reason === "input") updateUnlock(index, { type: value });
                  }}
                  sx={{ width: { sm: 190 } }}
                  renderInput={(params) => <TextField {...params} label="Tipo" error={!row.type.trim()} />}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {row.target ? (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Button
                        onClick={() => setPicking({ list: "unlock", index })}
                        color="inherit"
                        sx={{ textTransform: "none", minWidth: 0, justifyContent: "flex-start" }}
                      >
                        <ReferenceName gameId={gameId} target={row.target} />
                      </Button>
                      <Tooltip title="Tirar o alvo">
                        <IconButton size="small" onClick={() => updateUnlock(index, { target: null })}>
                          <Clear fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ) : (
                    <Button size="small" onClick={() => setPicking({ list: "unlock", index })} sx={{ textTransform: "none" }}>
                      Escolher alvo
                    </Button>
                  )}
                </Box>
                <TextField
                  label="Valor"
                  size="small"
                  value={row.value}
                  onChange={(event) => updateUnlock(index, { value: event.target.value })}
                  error={!row.target && !row.value.trim()}
                  helperText={!row.target && !row.value.trim() ? "Alvo ou valor." : undefined}
                  sx={{ width: { sm: 160 } }}
                />
                <Tooltip title="Remover">
                  <IconButton size="small" color="error" onClick={() => setUnlock(unlock.filter((_, position) => position !== index))}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </>
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>

      {deleting && editId && (
        <ConfirmDeleteDialog
          title="Apagar atalho"
          message={
            <>
              Apagar <strong>{name || extId}</strong> (<code>{extId}</code>)? O último estado fica guardado como revisão.
            </>
          }
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(false)}
          onConfirm={() => remove.mutate(extId, { onSuccess: onSaved })}
        />
      )}

      {picking && (
        <ApiContentSelector
          open
          modal
          gameId={gameId}
          kinds={PICK_KINDS[picking.list]}
          title={picking.list === "requirements" ? "Selecionar requisito" : "Selecionar alvo do desbloqueio"}
          onClose={() => setPicking(null)}
          onConfirm={(selection: ResolvedReference) => {
            const target: Reference = { kind: selection.kind, extId: selection.extId };
            if (picking.list === "requirements") {
              if (picking.index !== null) updateRequirement(picking.index, { target });
              else
                setRequirements((current) => [
                  ...current,
                  { key: key(), target, amount: "1", notConsumed: false, level: "", levelOperator: "exact" },
                ]);
            } else if (picking.index !== null) {
              updateUnlock(picking.index, { target });
            }
            setPicking(null);
          }}
        />
      )}
    </StyledDialog>
  );
}
