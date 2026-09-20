import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import {
  MAX_PAGE_SIZE,
  type CategoryDocument,
  type EntityDocument,
  type EventDocument,
  type LevelOperator,
  type Reference,
  type ResolvedReference,
} from "../../api/content";
import { currentMedia } from "../../api/references";
import {
  useAttributeDefinitions,
  useContentList,
  useContentWrites,
  useRarities,
} from "../../api/useContent";
import { CategoryFormDialog } from "../category/CategoryFormDialog";
import { ApiContentSelector } from "../common/ApiContentSelector";
import { AttributeFields } from "../common/AttributeFields";
import { attributeFormOf, attributesInvalid, attributesOut, type AttributeForm } from "../common/attributeValues";
import { CodesField, type CodeOption } from "../common/CodesField";
import { LevelFields } from "../common/LevelFields";
import { ConfirmDeleteDialog } from "../common/ConfirmDeleteDialog";
import { numberOf, slugOf, useContentSave } from "../common/contentForm";
import { FormSection, TabLabel, TargetRow } from "../common/formLayout";
import { chanceIn, chanceOut, isChance, isLevel, isOptionalInteger, isPositive, levelOut, move } from "../common/formValues";
import { IconUploadField } from "../common/IconUploadField";
import { ReferenceName } from "../common/ReferenceName";
import { StyledDialog } from "../common/StyledDialog";

type EntityTab = "data" | "requirements" | "drops";

/** Linhas das listas: `key` só identifica a linha na tela; números ficam como texto enquanto se digita. */
interface RequirementRow {
  key: number;
  target: Reference;
  amount: string;
  notConsumed: boolean;
  /** Vazio: qualquer nível serve. */
  level: string;
  levelOperator: LevelOperator;
}

interface DropRow {
  key: number;
  target: Reference;
  /** Em porcentagem, de 0 a 100; vazio é "sempre larga". */
  chance: string;
  amount: string;
  maxAmount: string;
}

interface EntityForm {
  extId: string;
  name: string;
  summary: string;
  description: string;
  rarityCode: string;
  level: string;
  respawnDelayMinutes: string;
  baseBuyPrice: string;
  baseSellPrice: string;
  variantOf: string | null;
  categories: string[];
  events: string[];
  attributes: AttributeForm;
  requirements: RequirementRow[];
  drops: DropRow[];
}

let nextKey = 1;
const key = () => nextKey++;

const text = (value: number | string | null | undefined) => (value === null || value === undefined ? "" : String(value));

function formOf(entity: EntityDocument | null): EntityForm {
  return {
    extId: entity?.extId ?? "",
    name: entity?.name ?? "",
    summary: entity?.summary ?? "",
    description: entity?.description ?? "",
    rarityCode: entity?.rarityCode ?? "",
    level: text(entity?.level),
    respawnDelayMinutes: text(entity?.respawnDelayMinutes),
    baseBuyPrice: text(entity?.baseBuyPrice),
    baseSellPrice: text(entity?.baseSellPrice),
    variantOf: entity?.variantOf ?? null,
    categories: entity?.categories ?? [],
    events: entity?.events ?? [],
    attributes: attributeFormOf(entity?.attributes),
    requirements: (entity?.requirements ?? []).map((requirement) => ({
      key: key(),
      target: requirement.target,
      amount: String(requirement.amount),
      notConsumed: requirement.notConsumed,
      level: requirement.level === null ? "" : String(requirement.level),
      levelOperator: requirement.levelOperator ?? "exact",
    })),
    drops: (entity?.drops ?? []).map((drop) => ({
      key: key(),
      target: drop.target,
      chance: chanceIn(drop.chance),
      amount: String(drop.amount),
      maxAmount: text(drop.maxAmount),
    })),
  };
}

/** O que o seletor está escolhendo: o alvo de uma linha, uma linha nova ou a entidade base. */
type Picking = { list: "requirements" | "drops"; index: number | null } | { list: "variantOf" } | null;

interface EntityFormDialogProps {
  gameId: string;
  /** A entidade a editar; null, criando. Montado só enquanto aberto, então o formulário nasce dela. */
  entity: EntityDocument | null;
  onClose: () => void;
  /** Depois de salvar, com o código da entidade. */
  onSaved?: (extId: string) => void;
  /** Mostra "Apagar entidade" (quem pode apagar: moderador ou acima). */
  canDelete?: boolean;
  /** Depois de apagar. Padrão: onClose. */
  onDeleted?: () => void;
}

/**
 * Cria ou edita uma entidade (criatura, NPC, estrutura, recurso, bancada), em tela cheia e em três
 * abas: Dados, Requisitos (o que ela exige para ser coletada ou derrotada) e Drops (o que ela larga).
 * A escrita substitui o documento inteiro; as duas listas são posicionais e aceitam o mesmo alvo mais
 * de uma vez. O ícone é anexado depois de salvar.
 */
export function EntityFormDialog({
  gameId,
  entity,
  onClose,
  onSaved,
  canDelete = false,
  onDeleted = onClose,
}: EntityFormDialogProps) {
  const [form, setForm] = useState<EntityForm>(() => formOf(entity));
  const [extIdTouched, setExtIdTouched] = useState(false);
  const [icon, setIcon] = useState<File | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [tab, setTab] = useState<EntityTab>("data");
  const { save, saving, error, creating } = useContentSave(gameId, "entities", entity === null);
  const { remove } = useContentWrites(gameId, "entities");

  const rarities = useRarities(gameId);
  const definitions = useAttributeDefinitions(gameId);
  const categories = useContentList<CategoryDocument>(gameId, "categories", { size: MAX_PAGE_SIZE, sort: "name" });
  const events = useContentList<EventDocument>(gameId, "events", { size: MAX_PAGE_SIZE, sort: "name" });

  const categoryOptions = useMemo<CodeOption[]>(
    () =>
      (categories.data?.content ?? [])
        .filter((category) => category.appliesTo !== "item")
        .map((category) => ({
          extId: category.extId,
          name: `${category.name ?? category.extId}${category.primary ? " (principal)" : ""}`,
          iconMediaId: currentMedia(category.media, "icon"),
        })),
    [categories.data],
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
  const sortedDefinitions = useMemo(
    () => [...(definitions.data ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    [definitions.data],
  );

  const set = <K extends keyof EntityForm>(field: K, value: EntityForm[K]) => setForm((current) => ({ ...current, [field]: value }));
  const setAttribute = (attribute: string, value: string | boolean) =>
    setForm((current) => ({ ...current, attributes: { ...current.attributes, [attribute]: value } }));

  const changeName = (name: string) =>
    setForm((current) => ({ ...current, name, extId: !creating || extIdTouched ? current.extId : slugOf(name) }));

  const updateRow = <L extends "requirements" | "drops">(list: L, index: number, changes: Partial<EntityForm[L][number]>) =>
    setForm((current) => ({
      ...current,
      [list]: (current[list] as EntityForm[L][number][]).map((row, position) => (position === index ? { ...row, ...changes } : row)),
    }));

  const removeRow = (list: "requirements" | "drops", index: number) =>
    setForm((current) => ({ ...current, [list]: current[list].filter((_, position) => position !== index) }));

  const pick = (selection: ResolvedReference) => {
    if (!picking) return;
    const target: Reference = { kind: selection.kind, extId: selection.extId };
    setPicking(null);
    if (picking.list === "variantOf") {
      if (selection.kind !== "entity") setPickError("A entidade base precisa ser uma entidade, não um item.");
      else if (selection.extId === form.extId.trim()) setPickError("Uma entidade não pode ser variante de si mesma.");
      else {
        setPickError(null);
        set("variantOf", selection.extId);
      }
      return;
    }
    const { list, index } = picking;
    if (index !== null) {
      updateRow(list, index, { target } as never);
      return;
    }
    setForm((current) =>
      list === "requirements"
        ? {
            ...current,
            requirements: [
              ...current.requirements,
              { key: key(), target, amount: "1", notConsumed: false, level: "", levelOperator: "exact" as LevelOperator },
            ],
          }
        : { ...current, drops: [...current.drops, { key: key(), target, chance: "", amount: "1", maxAmount: "" }] },
    );
  };

  const level = numberOf(form.level);
  const respawn = numberOf(form.respawnDelayMinutes);
  const buy = numberOf(form.baseBuyPrice);
  const sell = numberOf(form.baseSellPrice);
  const levelInvalid = !isOptionalInteger(form.level);
  const respawnInvalid = !isOptionalInteger(form.respawnDelayMinutes) || (respawn !== null && respawn !== undefined && respawn < 0);
  const attributesBad = attributesInvalid(form.attributes, sortedDefinitions);
  const dataInvalid =
    form.name.trim() === "" ||
    form.extId.trim() === "" ||
    levelInvalid ||
    respawnInvalid ||
    buy === undefined ||
    sell === undefined ||
    attributesBad;
  const requirementsInvalid = form.requirements.some((row) => !isPositive(row.amount) || !isLevel(row.level));
  const dropsInvalid = form.drops.some((row) => {
    if (!isPositive(row.amount) || !isChance(row.chance)) return true;
    const max = numberOf(row.maxAmount);
    if (max === undefined) return true;
    return max !== null && max < (numberOf(row.amount) as number);
  });
  const valid = !dataInvalid && !requirementsInvalid && !dropsInvalid;

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
        rarityCode: form.rarityCode || null,
        level,
        respawnDelayMinutes: respawn,
        baseBuyPrice: buy,
        baseSellPrice: sell,
        variantOf: form.variantOf,
        categories: form.categories,
        events: form.events,
        attributes: attributesOut(form.attributes, sortedDefinitions),
        requirements: form.requirements.map((row) => ({
          target: row.target,
          amount: numberOf(row.amount),
          notConsumed: row.notConsumed,
          level: levelOut(row.level),
          levelOperator: levelOut(row.level) === null ? null : row.levelOperator,
        })),
        drops: form.drops.map((row) => ({
          target: row.target,
          chance: chanceOut(row.chance),
          amount: numberOf(row.amount),
          maxAmount: numberOf(row.maxAmount),
        })),
      },
      [{ file: icon, usage: "icon" }],
    );
    if (saved) {
      onClose();
      onSaved?.(extId);
    }
  };

  return (
    <StyledDialog
      open
      modal
      fullScreen
      onClose={saving ? () => undefined : onClose}
      title={creating ? "Nova entidade" : `Editar ${form.name || entity?.extId}`}
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
              Apagar entidade
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
        <Tabs value={tab} onChange={(_, value: EntityTab) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
          <Tab value="data" label={<TabLabel label="Dados" invalid={dataInvalid} />} />
          <Tab value="requirements" label={<TabLabel label="Requisitos" count={form.requirements.length} invalid={requirementsInvalid} />} />
          <Tab value="drops" label={<TabLabel label="Drops" count={form.drops.length} invalid={dropsInvalid} />} />
        </Tabs>
      </Box>

      <Stack spacing={2} sx={{ maxWidth: 1100, mx: "auto", width: "100%" }}>
        {tab === "data" && (
          <>
            <IconUploadField currentMediaId={entity ? currentMedia(entity.media, "icon") : null} kind="entity" file={icon} onChange={setIcon} />

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
                  helperText={creating ? "Identifica a entidade nos dados do jogo." : "O código não muda depois de criado."}
                  fullWidth
                  slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Raridade" value={form.rarityCode} onChange={(event) => set("rarityCode", event.target.value)} fullWidth>
                  <MenuItem value="">
                    <em>Nenhuma</em>
                  </MenuItem>
                  {(rarities.data ?? []).map((rarity) => (
                    <MenuItem key={rarity.code} value={rarity.code} sx={{ color: rarity.color }}>
                      {rarity.name}
                    </MenuItem>
                  ))}
                  {form.rarityCode && !rarities.data?.some((rarity) => rarity.code === form.rarityCode) && (
                    <MenuItem value={form.rarityCode}>{form.rarityCode}</MenuItem>
                  )}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  label="Nível"
                  value={form.level}
                  onChange={(event) => set("level", event.target.value)}
                  error={levelInvalid}
                  helperText={levelInvalid ? "Número inteiro." : undefined}
                  fullWidth
                  slotProps={{ htmlInput: { inputMode: "numeric" } }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  label="Respawn"
                  value={form.respawnDelayMinutes}
                  onChange={(event) => set("respawnDelayMinutes", event.target.value)}
                  error={respawnInvalid}
                  helperText={respawnInvalid ? "Minutos, inteiro, zero ou mais." : "Quanto tempo até voltar."}
                  fullWidth
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">min</InputAdornment> },
                    htmlInput: { inputMode: "numeric" },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  label="Preço de compra"
                  value={form.baseBuyPrice}
                  onChange={(event) => set("baseBuyPrice", event.target.value)}
                  error={buy === undefined}
                  helperText={buy === undefined ? "Número." : "Vazio: sem preço base."}
                  fullWidth
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  label="Preço de venda"
                  value={form.baseSellPrice}
                  onChange={(event) => set("baseSellPrice", event.target.value)}
                  error={sell === undefined}
                  helperText={sell === undefined ? "Número." : "Vazio: não se vende."}
                  fullWidth
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Variante de
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Button
                      onClick={() => setPicking({ list: "variantOf" })}
                      color="inherit"
                      size="small"
                      sx={{ textTransform: "none", minWidth: 0, justifyContent: "flex-start" }}
                    >
                      {form.variantOf ? (
                        <ReferenceName gameId={gameId} target={{ kind: "entity", extId: form.variantOf }} />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Escolher entidade base
                        </Typography>
                      )}
                    </Button>
                    {form.variantOf && (
                      <Tooltip title="Tirar">
                        <Button size="small" color="inherit" onClick={() => set("variantOf", null)} sx={{ minWidth: 0 }}>
                          ×
                        </Button>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
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
            {pickError && <Alert severity="warning">{pickError}</Alert>}

            <FormSection title="Classificação" />
            <CodesField
              label="Categorias"
              options={categoryOptions}
              value={form.categories}
              onChange={(value) => set("categories", value)}
              loading={categories.isPending}
              helperText="A principal abre a entidade nos painéis e no filtro Categoria; as demais são sub-categorias."
              action={
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setCreatingCategory(true)}
                  sx={{ textTransform: "none", whiteSpace: "nowrap", mt: 1 }}
                >
                  Nova
                </Button>
              }
            />
            <CodesField
              label="Eventos"
              options={eventOptions}
              value={form.events}
              onChange={(value) => set("events", value)}
              loading={events.isPending}
              helperText="Com eventos, a entidade só aparece quando algum deles está ativo."
            />

            <AttributeFields definitions={sortedDefinitions} value={form.attributes} onChange={setAttribute} />
          </>
        )}

        {tab === "requirements" && (
          <>
            <FormSection
              title="Requisitos"
              action={
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setPicking({ list: "requirements", index: null })}
                  sx={{ textTransform: "none" }}
                >
                  Adicionar
                </Button>
              }
            />
            <Typography variant="body2" color="text.secondary">
              O que a entidade exige para ser coletada ou derrotada: ferramenta, isca, chave.
            </Typography>
            {form.requirements.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Sem requisitos.
              </Typography>
            )}
            {form.requirements.map((row, index) => (
              <TargetRow
                key={row.key}
                gameId={gameId}
                target={row.target}
                onPick={() => setPicking({ list: "requirements", index })}
                onUp={index > 0 ? () => set("requirements", move(form.requirements, index, -1)) : undefined}
                onDown={index < form.requirements.length - 1 ? () => set("requirements", move(form.requirements, index, 1)) : undefined}
                onRemove={() => removeRow("requirements", index)}
              >
                <TextField
                  label="Quantidade"
                  size="small"
                  value={row.amount}
                  onChange={(event) => updateRow("requirements", index, { amount: event.target.value })}
                  error={!isPositive(row.amount)}
                  sx={{ width: 120 }}
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                />
                <LevelFields
                  level={row.level}
                  operator={row.levelOperator}
                  onChange={(changes) => updateRow("requirements", index, changes)}
                />
                <Tooltip title="Exigido, mas não gasto (ex.: ferramenta)">
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={row.notConsumed}
                        onChange={(event) => updateRow("requirements", index, { notConsumed: event.target.checked })}
                      />
                    }
                    label={<Typography variant="body2">Não consome</Typography>}
                  />
                </Tooltip>
              </TargetRow>
            ))}
          </>
        )}

        {tab === "drops" && (
          <>
            <FormSection
              title="Drops"
              action={
                <Button size="small" startIcon={<Add />} onClick={() => setPicking({ list: "drops", index: null })} sx={{ textTransform: "none" }}>
                  Adicionar
                </Button>
              }
            />
            <Typography variant="body2" color="text.secondary">
              O que a entidade larga. A quantidade vai de "de" até "até"; o mesmo alvo pode aparecer em mais de uma linha.
            </Typography>
            {form.drops.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Sem drops.
              </Typography>
            )}
            {form.drops.map((row, index) => {
              const max = numberOf(row.maxAmount);
              const maxInvalid = max === undefined || (max !== null && max < (numberOf(row.amount) ?? 0));
              return (
                <TargetRow
                  key={row.key}
                  gameId={gameId}
                  target={row.target}
                  onPick={() => setPicking({ list: "drops", index })}
                  onUp={index > 0 ? () => set("drops", move(form.drops, index, -1)) : undefined}
                  onDown={index < form.drops.length - 1 ? () => set("drops", move(form.drops, index, 1)) : undefined}
                  onRemove={() => removeRow("drops", index)}
                >
                  <TextField
                    label="De"
                    size="small"
                    value={row.amount}
                    onChange={(event) => updateRow("drops", index, { amount: event.target.value })}
                    error={!isPositive(row.amount)}
                    sx={{ width: 100 }}
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                  />
                  <TextField
                    label="Até"
                    size="small"
                    value={row.maxAmount}
                    onChange={(event) => updateRow("drops", index, { maxAmount: event.target.value })}
                    error={maxInvalid}
                    placeholder="—"
                    helperText={maxInvalid ? "Não pode ser menor." : undefined}
                    sx={{ width: 110 }}
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                  />
                  <TextField
                    label="Chance"
                    size="small"
                    value={row.chance}
                    onChange={(event) => updateRow("drops", index, { chance: event.target.value })}
                    error={!isChance(row.chance)}
                    placeholder="100"
                    sx={{ width: 120 }}
                    slotProps={{
                      input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                      htmlInput: { inputMode: "decimal" },
                    }}
                  />
                </TargetRow>
              );
            })}
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
          kinds={picking.list === "variantOf" ? ["entities"] : ["items", "entities"]}
          title={
            picking.list === "variantOf"
              ? "Selecionar entidade base"
              : picking.list === "requirements"
                ? "Selecionar requisito"
                : "Selecionar drop"
          }
          onClose={() => setPicking(null)}
          onConfirm={pick}
        />
      )}

      {deleting && entity && (
        <ConfirmDeleteDialog
          title="Apagar entidade"
          message={
            <>
              Apagar <strong>{form.name || entity.extId}</strong> (<code>{entity.extId}</code>)? Os pontos de spawn dela no
              mapa continuam apontando para o código. O último estado fica guardado como revisão.
            </>
          }
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(false)}
          onConfirm={() => remove.mutate(entity.extId, { onSuccess: onDeleted })}
        />
      )}
      {creatingCategory && (
        <CategoryFormDialog
          gameId={gameId}
          category={null}
          onClose={() => setCreatingCategory(false)}
          onSaved={(extId) => set("categories", [...form.categories, extId])}
        />
      )}
    </StyledDialog>
  );
}
