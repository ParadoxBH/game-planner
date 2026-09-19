import { useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, ArrowDownward, ArrowUpward, Clear, Delete, SwapHoriz } from "@mui/icons-material";
import {
  MAX_PAGE_SIZE,
  type EventDocument,
  type RecipeDocument,
  type Reference,
  type ResolvedReference,
} from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentList, useContentWrites, useRecipeStations } from "../../api/useContent";
import { ApiContentSelector, type SelectorKind } from "../common/ApiContentSelector";
import { CodesField, type CodeOption } from "../common/CodesField";
import { ConfirmDeleteDialog } from "../common/ConfirmDeleteDialog";
import { numberOf, slugOf, useContentSave } from "../common/contentForm";
import { IconUploadField } from "../common/IconUploadField";
import { ReferenceName } from "../common/ReferenceName";
import { StyledDialog } from "../common/StyledDialog";
import { UNLOCK_LABELS } from "./recipeLabels";

/** Linhas das listas: `key` só identifica a linha na tela; números ficam como texto enquanto se digita. */
interface InputRow {
  key: number;
  target: Reference;
  amount: string;
  notConsumed: boolean;
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

interface RecipeForm {
  extId: string;
  name: string;
  summary: string;
  description: string;
  craftTime: string;
  stations: string[];
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
    stations: recipe?.stations ?? [],
    inputs: (recipe?.inputs ?? []).map((input) => ({
      key: key(),
      target: input.target,
      amount: String(input.amount),
      notConsumed: input.notConsumed,
    })),
    outputs: (recipe?.outputs ?? []).map((output) => ({
      key: key(),
      target: output.target,
      amount: String(output.amount),
      // O documento guarda a chance de 0 a 1; a tela, em porcentagem.
      chance: output.chance === null ? "" : String(+(output.chance * 100).toFixed(4)),
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

const isPositive = (value: string) => {
  const number = numberOf(value);
  return number !== null && number !== undefined && number > 0;
};

const isOptionalInteger = (value: string) => {
  const number = numberOf(value);
  return number === null || (number !== undefined && Number.isInteger(number));
};

const isChance = (value: string) => {
  const number = numberOf(value);
  return number === null || (number !== undefined && number > 0 && number <= 100);
};

function Section({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Divider textAlign="left" sx={{ flex: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
      </Divider>
      {action}
    </Stack>
  );
}

/** Linha de uma lista, com o alvo à esquerda, os campos no meio e as ações à direita. */
function Row({
  gameId,
  target,
  onPick,
  children,
  onUp,
  onDown,
  onRemove,
}: {
  gameId: string;
  target: Reference | null;
  onPick: () => void;
  children?: React.ReactNode;
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      alignItems={{ sm: "center" }}
      sx={{ p: 1, border: 1, borderColor: "divider", borderRadius: 1 }}
    >
      <Button
        onClick={onPick}
        color="inherit"
        endIcon={<SwapHoriz fontSize="small" />}
        sx={{ textTransform: "none", justifyContent: "space-between", minWidth: 0, flex: { sm: "0 0 38%" } }}
      >
        {target ? (
          <ReferenceName gameId={gameId} target={target} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Sem alvo
          </Typography>
        )}
      </Button>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
        {children}
      </Stack>
      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        {onUp && (
          <Tooltip title="Subir">
            <IconButton size="small" onClick={onUp}>
              <ArrowUpward fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onDown && (
          <Tooltip title="Descer">
            <IconButton size="small" onClick={onDown}>
              <ArrowDownward fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Remover">
          <IconButton size="small" color="error" onClick={onRemove}>
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

/** O que o seletor está escolhendo: o alvo de uma linha de uma lista, ou (index null) uma linha nova. */
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

function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const next = [...list];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
}

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
 * Cria ou edita uma receita. A escrita substitui o documento inteiro. Ingredientes são posicionais
 * (em jogo de slots, cada linha é um slot), então a ordem da tela é a gravada. O ícone é anexado
 * depois de salvar.
 */
export function RecipeFormDialog({ gameId, recipe, onClose, onSaved, canDelete = false, onDeleted = onClose }: RecipeFormDialogProps) {
  const [form, setForm] = useState<RecipeForm>(() => formOf(recipe));
  const [extIdTouched, setExtIdTouched] = useState(false);
  const [icon, setIcon] = useState<File | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [deleting, setDeleting] = useState(false);
  const { save, saving, error, creating } = useContentSave(gameId, "recipes", recipe === null);
  const { remove } = useContentWrites(gameId, "recipes");

  const stations = useRecipeStations(gameId);
  const events = useContentList<EventDocument>(gameId, "events", { size: MAX_PAGE_SIZE, sort: "name" });

  const stationOptions = useMemo<CodeOption[]>(
    () =>
      (stations.data ?? []).map((station) => ({
        extId: station.extId,
        name: station.name ?? station.extId,
        iconMediaId: station.iconMediaId,
      })),
    [stations.data],
  );
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
      if (list === "inputs") return { ...current, inputs: [...current.inputs, { key: key(), target, amount: "1", notConsumed: false }] };
      if (list === "outputs") {
        return suggestExtId({ ...current, outputs: [...current.outputs, { key: key(), target, amount: "1", chance: "", level: "" }] });
      }
      return { ...current, unlock: [...current.unlock, { key: key(), type: "", target, value: "" }] };
    });
  };

  const craftTime = numberOf(form.craftTime);
  const craftTimeInvalid = craftTime === undefined || (craftTime !== null && craftTime < 0) || !isOptionalInteger(form.craftTime);
  const inputsInvalid = form.inputs.some((row) => !isPositive(row.amount));
  const outputsInvalid = form.outputs.some((row) => !isPositive(row.amount) || !isChance(row.chance) || !isOptionalInteger(row.level));
  const unlockInvalid = form.unlock.some((row) => !row.type.trim() || (!row.target && !row.value.trim()));
  const valid = form.extId.trim() !== "" && !craftTimeInvalid && !inputsInvalid && !outputsInvalid && !unlockInvalid;

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
        stations: form.stations,
        inputs: form.inputs.map((row) => ({ target: row.target, amount: numberOf(row.amount), notConsumed: row.notConsumed })),
        outputs: form.outputs.map((row) => {
          const chance = numberOf(row.chance);
          return {
            target: row.target,
            amount: numberOf(row.amount),
            chance: chance === null || chance === undefined ? null : chance / 100,
            level: numberOf(row.level),
          };
        }),
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
      maxWidth="md"
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
      <Stack spacing={2}>
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
            <CodesField
              label="Bancadas"
              options={stationOptions}
              value={form.stations}
              onChange={(value) => set("stations", value)}
              loading={stations.isPending}
              freeSolo
              helperText="Códigos de entidade. Bancada nova: digite o código e aperte Enter."
            />
          </Grid>
        </Grid>

        <Section
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
          <Row
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
            <Tooltip title="Exigido, mas não gasto (ex.: ferramenta)">
              <FormControlLabel
                control={
                  <Switch size="small" checked={row.notConsumed} onChange={(event) => updateRow("inputs", index, { notConsumed: event.target.checked })} />
                }
                label={<Typography variant="body2">Não consome</Typography>}
              />
            </Tooltip>
          </Row>
        ))}

        <Section
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
          <Row
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
          </Row>
        ))}

        <Section
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

        <Section title="Descrição e eventos" />
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
