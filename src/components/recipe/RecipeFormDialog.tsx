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
  InputAdornment,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, Clear, Delete } from "@mui/icons-material";
import {
  MAX_PAGE_SIZE,
  type EventDocument,
  type RecipeDocument,
  type LevelOperator,
  type Reference,
  type ResolvedReference,
} from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentList, useContentWrites } from "../../api/useContent";
import { ApiContentSelector, type SelectorKind } from "../common/ApiContentSelector";
import { CodesField, type CodeOption } from "../common/CodesField";
import { LevelFields } from "../common/LevelFields";
import { ConfirmDeleteDialog } from "../common/ConfirmDeleteDialog";
import { numberOf, slugOf, useContentSave } from "../common/contentForm";
import { IconUploadField } from "../common/IconUploadField";
import { ReferenceName } from "../common/ReferenceName";
import { FormSection, TabLabel, TargetRow } from "../common/formLayout";
import { chanceIn, chanceOut, isChance, isLevel, isOptionalInteger, isPositive, levelOut, move } from "../common/formValues";
import { StyledDialog } from "../common/StyledDialog";
import { UNLOCK_LABELS } from "./recipeLabels";

/** Linhas das listas: `key` só identifica a linha na tela; números ficam como texto enquanto se digita. */
interface InputRow {
  key: number;
  target: Reference;
  amount: string;
  notConsumed: boolean;
  /** Vazio: qualquer nível serve. */
  level: string;
  levelOperator: LevelOperator;
}

interface OutputRow {
  key: number;
  target: Reference;
  amount: string;
  /** Em porcentagem, de 0 a 100; vazio é "sempre sai". */
  chance: string;
  level: string;
}

interface UnlockRow {
  key: number;
  type: string;
  target: Reference | null;
  value: string;
}

interface StationRow {
  key: number;
  extId: string;
  /** Vazio: serve em qualquer nível. */
  level: string;
}

interface RecipeForm {
  extId: string;
  name: string;
  summary: string;
  description: string;
  craftTime: string;
  stations: StationRow[];
  inputs: InputRow[];
  outputs: OutputRow[];
  unlock: UnlockRow[];
  events: string[];
}

let nextKey = 1;
const key = () => nextKey++;

const text = (value: number | string | null | undefined) => (value === null || value === undefined ? "" : String(value));

function formOf(recipe: RecipeDocument | null): RecipeForm {
  return {
    extId: recipe?.extId ?? "",
    name: recipe?.name ?? "",
    summary: recipe?.summary ?? "",
    description: recipe?.description ?? "",
    craftTime: text(recipe?.craftTimeSeconds),
    stations: (recipe?.stations ?? []).map((station) => ({
      key: key(),
      extId: station.extId,
      level: station.level === null ? "" : String(station.level),
    })),
    inputs: (recipe?.inputs ?? []).map((input) => ({
      key: key(),
      target: input.target,
      amount: String(input.amount),
      notConsumed: input.notConsumed,
      level: input.level === null ? "" : String(input.level),
      levelOperator: input.levelOperator ?? "exact",
    })),
    outputs: (recipe?.outputs ?? []).map((output) => ({
      key: key(),
      target: output.target,
      amount: String(output.amount),
      chance: chanceIn(output.chance),
      level: text(output.level),
    })),
    unlock: (recipe?.unlock ?? []).map((unlock) => ({
      key: key(),
      type: unlock.type,
      target: unlock.target,
      value: unlock.value ?? "",
    })),
    events: recipe?.events ?? [],
  };
}

type RecipeTab = "data" | "inputs" | "outputs";

type Picking = { list: "inputs" | "outputs" | "unlock"; index: number | null } | null;

const PICK_KINDS: Record<"inputs" | "outputs" | "unlock", SelectorKind[]> = {
  // Ingrediente pode ser "qualquer item da categoria": a árvore de crafting pede a escolha do membro.
  inputs: ["items", "categories", "entities"],
  outputs: ["items", "entities"],
  unlock: ["items", "entities"],
};

const PICK_TITLES = {
  inputs: "Selecionar ingrediente",
  outputs: "Selecionar produto",
  unlock: "Selecionar alvo do desbloqueio",
};

interface RecipeFormDialogProps {
  gameId: string;
  /** A receita a editar; null, criando. Montado só enquanto aberto, então o formulário nasce dela. */
  recipe: RecipeDocument | null;
  onClose: () => void;
  /** Depois de salvar, com o código da receita. */
  onSaved?: (extId: string) => void;
  /** Mostra "Apagar receita" (quem pode apagar: moderador ou acima). */
  canDelete?: boolean;
  /** Depois de apagar. Padrão: onClose. */
  onDeleted?: () => void;
}

/**
 * Cria ou edita uma receita, em tela cheia e em três abas: Dados (identificação, bancadas, descrição
 * e desbloqueio), Ingredientes e Produto. A escrita substitui o documento inteiro. Ingredientes são
 * posicionais (em jogo de slots, cada linha é um slot), então a ordem da tela é a gravada. O ícone é
 * anexado depois de salvar.
 */
export function RecipeFormDialog({ gameId, recipe, onClose, onSaved, canDelete = false, onDeleted = onClose }: RecipeFormDialogProps) {
  const [form, setForm] = useState<RecipeForm>(() => formOf(recipe));
  const [extIdTouched, setExtIdTouched] = useState(false);
  const [icon, setIcon] = useState<File | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [pickingStation, setPickingStation] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<RecipeTab>("data");
  const { save, saving, error, creating } = useContentSave(gameId, "recipes", recipe === null);
  const { remove } = useContentWrites(gameId, "recipes");

  const events = useContentList<EventDocument>(gameId, "events", { size: MAX_PAGE_SIZE, sort: "name" });

  const eventOptions = useMemo<CodeOption[]>(
    () =>
      (events.data?.content ?? []).map((event) => ({
        extId: event.extId,
        name: event.name ?? event.extId,
        iconMediaId: currentMedia(event.media, "icon"),
      })),
    [events.data],
  );

  const set = <K extends keyof RecipeForm>(field: K, value: RecipeForm[K]) => setForm((current) => ({ ...current, [field]: value }));

  /** Código sugerido: pelo nome ou, sem nome, pelo primeiro produto (recipe_<produto>). */
  const suggestExtId = (next: RecipeForm): RecipeForm => {
    if (!creating || extIdTouched) return next;
    const output = next.outputs[0]?.target.extId;
    const extId = next.name.trim() ? slugOf(next.name) : output ? `recipe_${slugOf(output)}` : "";
    return { ...next, extId };
  };

  const updateRow = <L extends "inputs" | "outputs" | "unlock">(list: L, index: number, changes: Partial<RecipeForm[L][number]>) =>
    setForm((current) => ({
      ...current,
      [list]: (current[list] as RecipeForm[L][number][]).map((row, position) => (position === index ? { ...row, ...changes } : row)),
    }));

  const removeRow = (list: "inputs" | "outputs" | "unlock", index: number) =>
    setForm((current) => suggestExtId({ ...current, [list]: current[list].filter((_, position) => position !== index) }));

  const pick = (selection: ResolvedReference) => {
    if (!picking) return;
    const target: Reference = { kind: selection.kind, extId: selection.extId };
    const { list, index } = picking;
    setPicking(null);
    if (index !== null) {
      updateRow(list, index, { target } as never);
      if (list === "outputs" && index === 0) setForm((current) => suggestExtId(current));
      return;
    }
    setForm((current) => {
      if (list === "inputs") {
        return {
          ...current,
          inputs: [...current.inputs, { key: key(), target, amount: "1", notConsumed: false, level: "", levelOperator: "exact" }],
        };
      }
      if (list === "outputs") {
        return suggestExtId({ ...current, outputs: [...current.outputs, { key: key(), target, amount: "1", chance: "", level: "" }] });
      }
      return { ...current, unlock: [...current.unlock, { key: key(), type: "", target, value: "" }] };
    });
  };

  const craftTime = numberOf(form.craftTime);
  const craftTimeInvalid = craftTime === undefined || (craftTime !== null && craftTime < 0) || !isOptionalInteger(form.craftTime);
  const inputsInvalid = form.inputs.some((row) => !isPositive(row.amount) || !isLevel(row.level));
  const outputsInvalid = form.outputs.some((row) => !isPositive(row.amount) || !isChance(row.chance) || !isOptionalInteger(row.level));
  const unlockInvalid = form.unlock.some((row) => !row.type.trim() || (!row.target && !row.value.trim()));
  const stationsInvalid = form.stations.some((station) => !isLevel(station.level));
  const dataInvalid = form.extId.trim() === "" || craftTimeInvalid || unlockInvalid || stationsInvalid;
  const valid = !dataInvalid && !inputsInvalid && !outputsInvalid;

  const submit = async () => {
    if (!valid) return;
    const extId = form.extId.trim();
    const saved = await save(
      extId,
      {
        extId,
        name: form.name.trim() || null,
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        craftTimeSeconds: craftTime,
        stations: form.stations.map((station) => ({ extId: station.extId, level: levelOut(station.level) })),
        inputs: form.inputs.map((row) => ({
          target: row.target,
          amount: numberOf(row.amount),
          notConsumed: row.notConsumed,
          level: levelOut(row.level),
          levelOperator: levelOut(row.level) === null ? null : row.levelOperator,
        })),
        outputs: form.outputs.map((row) => ({
          target: row.target,
          amount: numberOf(row.amount),
          chance: chanceOut(row.chance),
          level: numberOf(row.level),
        })),
        unlock: form.unlock.map((row) => ({ type: row.type.trim(), target: row.target, value: row.value.trim() || null })),
        events: form.events,
      },
      [{ file: icon, usage: "icon" }],
    );
    if (saved) {
      onClose();
      onSaved?.(extId);
    }
  };

  const title = creating ? "Nova receita" : `Editar ${form.name || recipe?.extId}`;

  return (
    <StyledDialog
      open
      modal
      onClose={saving ? () => undefined : onClose}
      title={title}
      fullScreen
      actions={
        <>
          {!creating && canDelete && (
            <Button
              color="error"
              startIcon={<Delete />}
              onClick={() => setDeleting(true)}
              disabled={saving}
              sx={{ textTransform: "none", mr: "auto" }}
            >
              Apagar receita
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
            {creating ? "Criar" : "Salvar"}
          </Button>
        </>
      }
    >
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          mx: -3,
          mt: -3,
          mb: 3,
          px: 3,
          bgcolor: "background.default",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Tabs value={tab} onChange={(_, value: RecipeTab) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
          <Tab value="data" label={<TabLabel label="Dados" invalid={dataInvalid} />} />
          <Tab value="inputs" label={<TabLabel label="Ingredientes" count={form.inputs.length} invalid={inputsInvalid} />} />
          <Tab value="outputs" label={<TabLabel label="Produto" count={form.outputs.length} invalid={outputsInvalid} />} />
        </Tabs>
      </Box>

      <Stack spacing={2} sx={{ maxWidth: 1100, mx: "auto", width: "100%" }}>
        {tab === "data" && (
          <>
            <IconUploadField currentMediaId={recipe ? currentMedia(recipe.media, "icon") : null} kind="recipe" file={icon} onChange={setIcon} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Nome"
                  value={form.name}
                  onChange={(event) => setForm((current) => suggestExtId({ ...current, name: event.target.value }))}
                  helperText="Opcional: sem nome, a receita aparece com o nome do primeiro produto."
                  autoFocus
                  fullWidth
                />
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
                  helperText={creating ? "Sugerido pelo nome ou pelo primeiro produto." : "O código não muda depois de criado."}
                  fullWidth
                  slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Tempo de produção"
                  value={form.craftTime}
                  onChange={(event) => set("craftTime", event.target.value)}
                  error={craftTimeInvalid}
                  helperText={craftTimeInvalid ? "Segundos, inteiro, zero ou mais." : "Vazio: instantâneo ou desconhecido."}
                  fullWidth
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">s</InputAdornment> },
                    htmlInput: { inputMode: "numeric" },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <FormSection
                  title="Bancadas"
                  action={
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setPickingStation(true)}
                      sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                    >
                      Escolher
                    </Button>
                  }
                />
                {form.stations.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Sem bancada: feito à mão.
                  </Typography>
                )}
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {form.stations.map((station, index) => (
                    <TargetRow
                      key={station.key}
                      gameId={gameId}
                      target={{ kind: "entity", extId: station.extId }}
                      onPick={() => setPickingStation(true)}
                      onRemove={() => set("stations", form.stations.filter((_, position) => position !== index))}
                    >
                      <TextField
                        label="Nível"
                        size="small"
                        value={station.level}
                        onChange={(event) =>
                          set(
                            "stations",
                            form.stations.map((row, position) =>
                              position === index ? { ...row, level: event.target.value } : row,
                            ),
                          )
                        }
                        error={!isLevel(station.level)}
                        helperText={isLevel(station.level) ? "Vazio: qualquer nível." : "Inteiro."}
                        sx={{ width: 150 }}
                        slotProps={{ htmlInput: { inputMode: "numeric" } }}
                      />
                    </TargetRow>
                  ))}
                </Stack>
              </Grid>
            </Grid>

            <FormSection title="Descrição e eventos" />
            <TextField label="Resumo" value={form.summary} onChange={(event) => set("summary", event.target.value)} fullWidth />
            <TextField
              label="Descrição"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <CodesField
              label="Eventos"
              options={eventOptions}
              value={form.events}
              onChange={(value) => set("events", value)}
              loading={events.isPending}
              helperText="Com eventos, a receita só aparece quando algum deles está ativo."
            />
            <FormSection
              title="Desbloqueio"
              action={
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => set("unlock", [...form.unlock, { key: key(), type: "", target: null, value: "" }])}
                  sx={{ textTransform: "none" }}
                >
                  Adicionar
                </Button>
              }
            />
            {form.unlock.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Disponível desde o início.
              </Typography>
            )}
            {form.unlock.map((row, index) => (
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
                  options={Object.keys(UNLOCK_LABELS)}
                  getOptionLabel={(option) => UNLOCK_LABELS[option] ?? option}
                  value={row.type || null}
                  onChange={(_, value) => updateRow("unlock", index, { type: value ?? "" })}
                  onInputChange={(_, value, reason) => {
                    // Digitado: grava o texto; escolhido na lista, o onChange já gravou o código.
                    if (reason === "input") updateRow("unlock", index, { type: value });
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
                        <IconButton size="small" onClick={() => updateRow("unlock", index, { target: null })}>
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
                  onChange={(event) => updateRow("unlock", index, { value: event.target.value })}
                  error={!row.target && !row.value.trim()}
                  helperText={!row.target && !row.value.trim() ? "Alvo ou valor." : undefined}
                  sx={{ width: { sm: 160 } }}
                />
                <Tooltip title="Remover">
                  <IconButton size="small" color="error" onClick={() => removeRow("unlock", index)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </>
        )}

        {tab === "inputs" && (
          <>
            <FormSection
              title="Ingredientes"
              action={
                <Button size="small" startIcon={<Add />} onClick={() => setPicking({ list: "inputs", index: null })} sx={{ textTransform: "none" }}>
                  Adicionar
                </Button>
              }
            />
            {form.inputs.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Sem ingredientes.
              </Typography>
            )}
            {form.inputs.map((row, index) => (
              <TargetRow
                key={row.key}
                gameId={gameId}
                target={row.target}
                onPick={() => setPicking({ list: "inputs", index })}
                onUp={index > 0 ? () => set("inputs", move(form.inputs, index, -1)) : undefined}
                onDown={index < form.inputs.length - 1 ? () => set("inputs", move(form.inputs, index, 1)) : undefined}
                onRemove={() => removeRow("inputs", index)}
              >
                <TextField
                  label="Quantidade"
                  size="small"
                  value={row.amount}
                  onChange={(event) => updateRow("inputs", index, { amount: event.target.value })}
                  error={!isPositive(row.amount)}
                  sx={{ width: 120 }}
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
                <LevelFields
              level={row.level}
              operator={row.levelOperator}
              onChange={(changes) => updateRow("inputs", index, changes)}
            />
            <Tooltip title="Exigido, mas não gasto (ex.: ferramenta)">
                  <FormControlLabel
                    control={
                      <Switch size="small" checked={row.notConsumed} onChange={(event) => updateRow("inputs", index, { notConsumed: event.target.checked })} />
                    }
                    label={<Typography variant="body2">Não consome</Typography>}
                  />
                </Tooltip>
              </TargetRow>
            ))}
          </>
        )}

        {tab === "outputs" && (
          <>
            <FormSection
              title="Produtos"
              action={
                <Button size="small" startIcon={<Add />} onClick={() => setPicking({ list: "outputs", index: null })} sx={{ textTransform: "none" }}>
                  Adicionar
                </Button>
              }
            />
            {form.outputs.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Sem produtos. O primeiro dá o nome da receita quando ela não tem um.
              </Typography>
            )}
            {form.outputs.map((row, index) => (
              <TargetRow
                key={row.key}
                gameId={gameId}
                target={row.target}
                onPick={() => setPicking({ list: "outputs", index })}
                onUp={index > 0 ? () => setForm((current) => suggestExtId({ ...current, outputs: move(current.outputs, index, -1) })) : undefined}
                onDown={
                  index < form.outputs.length - 1
                    ? () => setForm((current) => suggestExtId({ ...current, outputs: move(current.outputs, index, 1) }))
                    : undefined
                }
                onRemove={() => removeRow("outputs", index)}
              >
                <TextField
                  label="Quantidade"
                  size="small"
                  value={row.amount}
                  onChange={(event) => updateRow("outputs", index, { amount: event.target.value })}
                  error={!isPositive(row.amount)}
                  sx={{ width: 110 }}
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
                <TextField
                  label="Chance"
                  size="small"
                  value={row.chance}
                  onChange={(event) => updateRow("outputs", index, { chance: event.target.value })}
                  error={!isChance(row.chance)}
                  placeholder="100"
                  sx={{ width: 110 }}
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                    htmlInput: { inputMode: "decimal" },
                  }}
                />
                <TextField
                  label="Nível"
                  size="small"
                  value={row.level}
                  onChange={(event) => updateRow("outputs", index, { level: event.target.value })}
                  error={!isOptionalInteger(row.level)}
                  sx={{ width: 90 }}
                  slotProps={{ htmlInput: { inputMode: "numeric" } }}
                />
              </TargetRow>
            ))}
          </>
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>

      {/* Montado só enquanto escolhe: cada escolha começa na primeira aba dos tipos daquela lista. */}
      {picking && (
        <ApiContentSelector
          open
          modal
          gameId={gameId}
          kinds={PICK_KINDS[picking.list]}
          title={PICK_TITLES[picking.list]}
          onClose={() => setPicking(null)}
          onConfirm={pick}
        />
      )}

      {pickingStation && (
        <ApiContentSelector
          open
          modal
          gameId={gameId}
          kinds={["entities"]}
          title="Selecionar bancada"
          onClose={() => setPickingStation(false)}
          onConfirm={(selection) => {
            if (!form.stations.some((station) => station.extId === selection.extId)) {
              set("stations", [...form.stations, { key: key(), extId: selection.extId, level: "" }]);
            }
            setPickingStation(false);
          }}
        />
      )}

      {deleting && recipe && (
        <ConfirmDeleteDialog
          title="Apagar receita"
          message={
            <>
              Apagar <strong>{form.name || recipe.extId}</strong> (<code>{recipe.extId}</code>)? O último estado fica guardado
              como revisão.
            </>
          }
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(false)}
          onConfirm={() => remove.mutate(recipe.extId, { onSuccess: onDeleted })}
        />
      )}
    </StyledDialog>
  );
}
