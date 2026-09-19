import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { MAX_PAGE_SIZE, type CategoryDocument, type EventDocument, type MapDocument } from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentList } from "../../api/useContent";
import { CodesField, type CodeOption } from "../common/CodesField";
import { numberOf, slugOf, useContentSave } from "../common/contentForm";
import { IconUploadField } from "../common/IconUploadField";
import { StyledDialog } from "../common/StyledDialog";
import { MAP_TYPE_LABELS } from "./mapGeometry";

/** Visões que a tela do mapa sabe mostrar. */
const VIEWS: { value: string; label: string }[] = [
  { value: "map", label: "Mapa" },
  { value: "dashboard", label: "Painel" },
];

const ROTATIONS = [
  { value: 0, label: "Sem rotação" },
  { value: 1, label: "90°" },
  { value: 2, label: "180°" },
  { value: 3, label: "270°" },
];

type Box4 = { minX: string; minY: string; maxX: string; maxY: string };

/** Números ficam como texto enquanto se digita; vazio é "sem valor". */
interface MapForm {
  extId: string;
  name: string;
  summary: string;
  description: string;
  mapType: MapDocument["mapType"];
  imageUrl: string;
  urlPattern: string;
  layers: string;
  bounds: Box4;
  minZoom: string;
  maxZoom: string;
  tiles: Box4 & { z: string; minZoom: string; maxZoom: string };
  gridSize: string;
  rotate: number;
  availableViews: string[];
  defaultView: string;
  filterTypes: string[];
  filterCategories: string[];
  filterEntities: string[];
  weathers: string[];
  events: string[];
}

const text = (value: number | string | null | undefined) => (value === null || value === undefined ? "" : String(value));

function formOf(map: MapDocument | null): MapForm {
  return {
    extId: map?.extId ?? "",
    name: map?.name ?? "",
    summary: map?.summary ?? "",
    description: map?.description ?? "",
    mapType: map?.mapType ?? "single",
    imageUrl: map?.imageUrl ?? "",
    urlPattern: map?.urlPattern ?? "",
    layers: text(map?.layers),
    bounds: {
      minX: text(map?.bounds?.minX),
      minY: text(map?.bounds?.minY),
      maxX: text(map?.bounds?.maxX),
      maxY: text(map?.bounds?.maxY),
    },
    minZoom: text(map?.minZoom),
    maxZoom: text(map?.maxZoom),
    tiles: {
      z: text(map?.tiles?.z),
      minX: text(map?.tiles?.minX),
      minY: text(map?.tiles?.minY),
      maxX: text(map?.tiles?.maxX),
      maxY: text(map?.tiles?.maxY),
      minZoom: text(map?.tiles?.minZoom),
      maxZoom: text(map?.tiles?.maxZoom),
    },
    gridSize: text(map?.gridSize),
    rotate: map?.rotate ?? 0,
    availableViews: map && map.availableViews.length > 0 ? map.availableViews : ["map", "dashboard"],
    defaultView: map?.defaultView ?? "",
    filterTypes: map?.defaultFilters.types ?? [],
    filterCategories: map?.defaultFilters.categories ?? [],
    filterEntities: map?.defaultFilters.entities ?? [],
    weathers: map?.weathers ?? [],
    events: map?.events ?? [],
  };
}

/** Inteiro opcional: vazio é null; o que não é inteiro, undefined (inválido). */
function integerOf(value: string): number | null | undefined {
  const number = numberOf(value);
  return number === undefined || (number !== null && !Number.isInteger(number)) ? undefined : number;
}

/** Retângulo: todo vazio é null; tudo número com mínimo até o máximo, o retângulo; senão, a mensagem de erro. */
function boxOf(box: Box4): { value: { minX: number; minY: number; maxX: number; maxY: number } | null; error?: string } {
  const values = [box.minX, box.minY, box.maxX, box.maxY].map(numberOf);
  if (values.every((value) => value === null)) return { value: null };
  if (values.some((value) => value === null || value === undefined)) return { value: null, error: "Preencha os quatro números, ou nenhum." };
  const [minX, minY, maxX, maxY] = values as number[];
  if (minX > maxX || minY > maxY) return { value: null, error: "O mínimo não pode passar do máximo." };
  return { value: { minX, minY, maxX, maxY } };
}

function BoxFields({ value, onChange, error }: { value: Box4; onChange: (value: Box4) => void; error?: string }) {
  return (
    <>
      <Grid container spacing={1}>
        {(["minX", "minY", "maxX", "maxY"] as const).map((key) => (
          <Grid key={key} size={{ xs: 6, sm: 3 }}>
            <TextField
              label={key}
              size="small"
              value={value[key]}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
              error={Boolean(error) || numberOf(value[key]) === undefined}
              fullWidth
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
            />
          </Grid>
        ))}
      </Grid>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </>
  );
}

function Section({ title }: { title: string }) {
  return (
    <Divider textAlign="left">
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
    </Divider>
  );
}

interface MapFormDialogProps {
  gameId: string;
  /** O mapa a editar; null, criando. Montado só enquanto aberto, então o formulário nasce dele. */
  map: MapDocument | null;
  onClose: () => void;
}

/**
 * Cria ou edita um mapa. A escrita substitui o documento inteiro. As imagens são anexadas depois de
 * salvar: a miniatura (uso "thumbnail", 1920 px no máximo) e, em mapa de imagem única, o fundo (uso "map",
 * enviado com a variante large, de até 8192 px). Um endereço em imageUrl tem precedência sobre o fundo enviado.
 */
export function MapFormDialog({ gameId, map, onClose }: MapFormDialogProps) {
  const [form, setForm] = useState<MapForm>(() => formOf(map));
  const [extIdTouched, setExtIdTouched] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [background, setBackground] = useState<File | null>(null);
  const { save, saving, error, creating } = useContentSave(gameId, "maps", map === null);

  const categories = useContentList<CategoryDocument>(gameId, "categories", { size: MAX_PAGE_SIZE, sort: "name" });
  const events = useContentList<EventDocument>(gameId, "events", { size: MAX_PAGE_SIZE, sort: "name" });

  const categoryOptions = useMemo<CodeOption[]>(
    () =>
      (categories.data?.content ?? [])
        .filter((category) => category.appliesTo !== "item")
        .map((category) => ({
          extId: category.extId,
          name: category.name ?? category.extId,
          iconMediaId: currentMedia(category.media, "icon"),
        })),
    [categories.data],
  );
  const eventOptions = useMemo(
    () =>
      (events.data?.content ?? []).map((event) => ({
        extId: event.extId,
        name: event.name ?? event.extId,
        iconMediaId: currentMedia(event.media, "icon"),
        type: event.eventType,
      })),
    [events.data],
  );
  const weatherOptions = useMemo(() => eventOptions.filter((event) => event.type === "clima"), [eventOptions]);

  const set = <K extends keyof MapForm>(key: K, value: MapForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const changeName = (name: string) =>
    setForm((current) => ({ ...current, name, extId: !creating || extIdTouched ? current.extId : slugOf(name) }));

  const type = form.mapType;
  const layers = integerOf(form.layers);
  const bounds = boxOf(form.bounds);
  const minZoom = integerOf(form.minZoom);
  const maxZoom = integerOf(form.maxZoom);
  const zoomError =
    minZoom === undefined || maxZoom === undefined
      ? "Zoom é número inteiro."
      : minZoom !== null && maxZoom !== null && minZoom > maxZoom
        ? "O zoom mínimo não pode passar do máximo."
        : undefined;
  const tileBox = boxOf(form.tiles);
  const tileZ = integerOf(form.tiles.z);
  const tileMinZoom = integerOf(form.tiles.minZoom);
  const tileMaxZoom = integerOf(form.tiles.maxZoom);
  const tilesEmpty = tileZ === null && !tileBox.value && !tileBox.error && tileMinZoom === null && tileMaxZoom === null;
  const tilesError =
    type !== "tile" || tilesEmpty
      ? undefined
      : tileBox.error ??
        (tileZ === null || tileZ === undefined || !tileBox.value
          ? "Tiles precisam do zoom z e dos quatro limites."
          : tileMinZoom === undefined || tileMaxZoom === undefined
            ? "Zoom é número inteiro."
            : tileMinZoom !== null && tileMaxZoom !== null && tileMinZoom > tileMaxZoom
              ? "O zoom mínimo não pode passar do máximo."
              : undefined);
  const gridSize = numberOf(form.gridSize);
  const gridError = gridSize === undefined || (gridSize !== null && gridSize <= 0) ? "Número maior que zero." : undefined;
  const layersError = type === "layered" && (layers === undefined || (layers !== null && layers < 1)) ? "Inteiro maior que zero." : undefined;

  const valid =
    form.name.trim() !== "" &&
    form.extId.trim() !== "" &&
    !bounds.error &&
    !zoomError &&
    !tilesError &&
    !gridError &&
    !layersError &&
    form.availableViews.length > 0;

  const submit = async () => {
    if (!valid) return;
    const extId = form.extId.trim();
    const saved = await save(
      extId,
      {
        extId,
        name: form.name.trim(),
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        mapType: type,
        imageUrl: type === "single" ? form.imageUrl.trim() || null : null,
        urlPattern: type === "layered" || type === "tile" ? form.urlPattern.trim() || null : null,
        layers: type === "layered" ? layers : null,
        bounds: bounds.value,
        minZoom,
        maxZoom,
        tiles:
          type === "tile" && !tilesEmpty
            ? { z: tileZ, ...tileBox.value, minZoom: tileMinZoom, maxZoom: tileMaxZoom }
            : null,
        gridSize,
        rotate: form.rotate || null,
        availableViews: form.availableViews,
        defaultView: form.defaultView && form.availableViews.includes(form.defaultView) ? form.defaultView : null,
        defaultFilters: { types: form.filterTypes, categories: form.filterCategories, entities: form.filterEntities },
        weathers: form.weathers,
        events: form.events,
      },
      [
        { file: thumbnail, usage: "thumbnail" },
        { file: type === "single" ? background : null, usage: "map", large: true },
      ],
    );
    if (saved) onClose();
  };

  const toggleView = (view: string, on: boolean) =>
    set("availableViews", on ? VIEWS.map((option) => option.value).filter((value) => value === view || form.availableViews.includes(value)) : form.availableViews.filter((value) => value !== view));

  return (
    <StyledDialog
      open
      modal
      onClose={saving ? () => undefined : onClose}
      title={creating ? "Novo mapa" : `Editar ${form.name || form.extId}`}
      maxWidth="md"
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
            {creating ? "Criar" : "Salvar"}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <IconUploadField
          currentMediaId={map ? currentMedia(map.media, "thumbnail") ?? currentMedia(map.media, "icon") : null}
          kind="map"
          file={thumbnail}
          onChange={setThumbnail}
          noun="miniatura"
          wide
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: "-8px !important" }}>
          A miniatura aparece na seleção de mapas.
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Nome" value={form.name} onChange={(event) => changeName(event.target.value)} required autoFocus fullWidth />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Código"
              value={form.extId}
              onChange={(event) => {
                setExtIdTouched(true);
                set("extId", event.target.value);
              }}
              required
              disabled={!creating}
              helperText={creating ? "Identifica o mapa nos locais e pontos de spawn." : "O código não muda depois de criado."}
              fullWidth
              slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
            />
          </Grid>
          <Grid size={12}>
            <TextField label="Resumo" value={form.summary} onChange={(event) => set("summary", event.target.value)} fullWidth />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Descrição"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Grid>
        </Grid>

        <Section title="Imagem" />
        <TextField
          select
          label="Tipo"
          value={type}
          onChange={(event) => set("mapType", event.target.value as MapForm["mapType"])}
          helperText={MAP_TYPE_LABELS[type].hint}
          fullWidth
        >
          {Object.entries(MAP_TYPE_LABELS).map(([value, { label }]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        {type === "single" && (
          <>
            <IconUploadField
              currentMediaId={map ? currentMedia(map.media, "map") : null}
              kind="map"
              file={background}
              onChange={setBackground}
              noun="imagem do mapa"
              wide
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: "-8px !important" }}>
              Até 40 MB e 70 megapixels, sem animação; guardada com até 8192 px no maior lado. É esticada nos
              limites abaixo.
            </Typography>
            <TextField
              label="Endereço da imagem"
              value={form.imageUrl}
              onChange={(event) => set("imageUrl", event.target.value)}
              helperText="Opcional. URL completa (https://...): tem precedência sobre a imagem enviada."
              fullWidth
            />
          </>
        )}
        {(type === "layered" || type === "tile") && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: type === "layered" ? 9 : 12 }}>
              <TextField
                label="Padrão de URL"
                value={form.urlPattern}
                onChange={(event) => set("urlPattern", event.target.value)}
                helperText={type === "tile" ? "Com {z}, {x} e {y}." : "Com {layer}."}
                fullWidth
                slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
              />
            </Grid>
            {type === "layered" && (
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  label="Camadas"
                  value={form.layers}
                  onChange={(event) => set("layers", event.target.value)}
                  error={Boolean(layersError)}
                  helperText={layersError}
                  fullWidth
                  slotProps={{ htmlInput: { inputMode: "numeric" } }}
                />
              </Grid>
            )}
          </Grid>
        )}

        <Section title="Geometria" />
        <Typography variant="body2" color="text.secondary">
          Limites em coordenadas de jogo: o retângulo que a imagem cobre.
        </Typography>
        <BoxFields value={form.bounds} onChange={(value) => set("bounds", value)} error={bounds.error} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Zoom mínimo"
              value={form.minZoom}
              onChange={(event) => set("minZoom", event.target.value)}
              error={Boolean(zoomError)}
              fullWidth
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Zoom máximo"
              value={form.maxZoom}
              onChange={(event) => set("maxZoom", event.target.value)}
              error={Boolean(zoomError)}
              fullWidth
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Tamanho da grade"
              value={form.gridSize}
              onChange={(event) => set("gridSize", event.target.value)}
              error={Boolean(gridError)}
              helperText={gridError}
              fullWidth
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              label="Rotação do norte"
              value={form.rotate}
              onChange={(event) => set("rotate", Number(event.target.value))}
              fullWidth
            >
              {ROTATIONS.map((rotation) => (
                <MenuItem key={rotation.value} value={rotation.value}>
                  {rotation.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
        {zoomError && (
          <Typography variant="caption" color="error">
            {zoomError}
          </Typography>
        )}

        {type === "tile" && (
          <>
            <Section title="Tiles" />
            <Typography variant="body2" color="text.secondary">
              Faixa de tiles que cobre o mapa no zoom z, e os zooms em que há tile.
            </Typography>
            <Grid container spacing={1}>
              {(["z", "minZoom", "maxZoom"] as const).map((key) => (
                <Grid key={key} size={4}>
                  <TextField
                    label={key === "z" ? "z" : key === "minZoom" ? "Zoom mínimo" : "Zoom máximo"}
                    size="small"
                    value={form.tiles[key]}
                    onChange={(event) => set("tiles", { ...form.tiles, [key]: event.target.value })}
                    error={integerOf(form.tiles[key]) === undefined}
                    fullWidth
                    slotProps={{ htmlInput: { inputMode: "numeric" } }}
                  />
                </Grid>
              ))}
            </Grid>
            <BoxFields value={form.tiles} onChange={(value) => set("tiles", { ...form.tiles, ...value })} error={tilesError} />
          </>
        )}

        <Section title="Exibição" />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <FormGroup row>
            {VIEWS.map((view) => (
              <FormControlLabel
                key={view.value}
                control={
                  <Checkbox
                    checked={form.availableViews.includes(view.value)}
                    onChange={(event) => toggleView(view.value, event.target.checked)}
                  />
                }
                label={view.label}
              />
            ))}
          </FormGroup>
          <TextField
            select
            label="Visão inicial"
            value={form.availableViews.includes(form.defaultView) ? form.defaultView : ""}
            onChange={(event) => set("defaultView", event.target.value)}
            sx={{ minWidth: 200 }}
            size="small"
          >
            <MenuItem value="">
              <em>A primeira marcada</em>
            </MenuItem>
            {VIEWS.filter((view) => form.availableViews.includes(view.value)).map((view) => (
              <MenuItem key={view.value} value={view.value}>
                {view.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        {form.availableViews.length === 0 && (
          <Typography variant="caption" color="error">
            Marque ao menos uma visão.
          </Typography>
        )}

        <Section title="Filtros ao abrir" />
        <Typography variant="body2" color="text.secondary">
          O que já vem ligado ao abrir o mapa. Vazio: tudo que há no mapa.
        </Typography>
        <CodesField
          label="Tipos de ponto"
          options={[]}
          value={form.filterTypes}
          onChange={(value) => set("filterTypes", value)}
          loading={false}
          freeSolo
          helperText="Digite o tipo e aperte Enter."
        />
        <CodesField
          label="Categorias"
          options={categoryOptions}
          value={form.filterCategories}
          onChange={(value) => set("filterCategories", value)}
          loading={categories.isPending}
        />
        <CodesField
          label="Entidades"
          options={[]}
          value={form.filterEntities}
          onChange={(value) => set("filterEntities", value)}
          loading={false}
          freeSolo
          helperText="Códigos de entidade: digite e aperte Enter."
        />

        <Section title="Eventos" />
        <CodesField
          label="Climas"
          options={weatherOptions}
          value={form.weathers}
          onChange={(value) => set("weathers", value)}
          loading={events.isPending}
          helperText="Eventos de clima que acontecem no mapa."
        />
        <CodesField
          label="Eventos"
          options={eventOptions}
          value={form.events}
          onChange={(value) => set("events", value)}
          loading={events.isPending}
          helperText="Eventos a que o mapa pertence."
        />

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </StyledDialog>
  );
}
