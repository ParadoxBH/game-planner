import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Clear, Delete, Search } from "@mui/icons-material";
import {
  MAX_PAGE_SIZE,
  type CategoryDocument,
  type EventDocument,
  type ItemDocument,
  type Reference,
} from "../../api/content";
import { currentMedia } from "../../api/references";
import { useAttributeDefinitions, useContentDocument, useContentList, useContentWrites, useRarities } from "../../api/useContent";
import { CategoryFormDialog } from "../category/CategoryFormDialog";
import { ApiContentSelector } from "../common/ApiContentSelector";
import { AttributeFields } from "../common/AttributeFields";
import { attributeFormOf, attributesInvalid, attributesOut, type AttributeForm } from "../common/attributeValues";
import { CodesField, type CodeOption } from "../common/CodesField";
import { ConfirmDeleteDialog } from "../common/ConfirmDeleteDialog";
import { numberOf, slugOf, useContentSave } from "../common/contentForm";
import { IconUploadField } from "../common/IconUploadField";
import { StyledDialog } from "../common/StyledDialog";

/** Números ficam como texto enquanto se digita; vazio é "sem valor". */
interface ItemForm {
  extId: string;
  name: string;
  summary: string;
  description: string;
  rarityCode: string;
  level: string;
  baseBuyPrice: string;
  baseSellPrice: string;
  currency: Reference | null;
  variantOf: string | null;
  categories: string[];
  events: string[];
  attributes: AttributeForm;
}

const text = (value: number | string | null | undefined) => (value === null || value === undefined ? "" : String(value));

function formOf(item: ItemDocument | null): ItemForm {
  return {
    extId: item?.extId ?? "",
    name: item?.name ?? "",
    summary: item?.summary ?? "",
    description: item?.description ?? "",
    rarityCode: item?.rarityCode ?? "",
    level: text(item?.level),
    baseBuyPrice: text(item?.baseBuyPrice),
    baseSellPrice: text(item?.baseSellPrice),
    currency: item?.currency ?? null,
    variantOf: item?.variantOf ?? null,
    categories: item?.categories ?? [],
    events: item?.events ?? [],
    attributes: attributeFormOf(item?.attributes),
  };
}

/** Nome de um registro citado, lido pelo código; enquanto não chega ou se não existe, o código. */
function ReferenceLabel({ gameId, target }: { gameId: string; target: Reference }) {
  const resource = target.kind === "entity" ? "entities" : "items";
  const document = useContentDocument<ItemDocument>(gameId, resource, target.extId);
  return <>{document.data?.name ? `${document.data.name} (${target.extId})` : target.extId}</>;
}

/** Campo de referência: mostra o escolhido e abre o seletor de item ou entidade. */
function ReferenceField({
  gameId,
  label,
  value,
  onPick,
  onClear,
  helperText,
}: {
  gameId: string;
  label: string;
  value: Reference | null;
  onPick: () => void;
  onClear: () => void;
  helperText?: string;
}) {
  return (
    <TextField
      label={label}
      value={value ? " " : ""}
      onClick={onPick}
      helperText={helperText}
      fullWidth
      slotProps={{
        input: {
          readOnly: true,
          sx: { cursor: "pointer" },
          startAdornment: value ? (
            <InputAdornment position="start" sx={{ maxWidth: "100%" }}>
              <Typography variant="body2" noWrap>
                <ReferenceLabel gameId={gameId} target={value} />
              </Typography>
            </InputAdornment>
          ) : undefined,
          endAdornment: (
            <InputAdornment position="end">
              {value ? (
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClear();
                  }}
                >
                  <Clear fontSize="small" />
                </IconButton>
              ) : (
                <Search fontSize="small" />
              )}
            </InputAdornment>
          ),
        },
        inputLabel: { shrink: true },
      }}
    />
  );
}

interface ItemFormDialogProps {
  gameId: string;
  /** O item a editar; null, criando. Montado só enquanto aberto, então o formulário nasce dele. */
  item: ItemDocument | null;
  onClose: () => void;
  /** Depois de salvar, com o código do item. */
  onSaved?: (extId: string) => void;
  /** Mostra "Apagar item" (quem pode apagar: moderador ou acima). */
  canDelete?: boolean;
  /** Depois de apagar. Padrão: onClose. */
  onDeleted?: () => void;
}

type Picking = "currency" | "variantOf" | null;

/**
 * Cria ou edita um item. A escrita substitui o documento inteiro: todo campo vai, inclusive os
 * atributos sem definição no jogo, que ficam como estavam. As imagens ficam fora do documento, e um
 * ícone novo é anexado depois de salvar.
 */
export function ItemFormDialog({
  gameId,
  item,
  onClose,
  onSaved,
  canDelete = false,
  onDeleted = onClose,
}: ItemFormDialogProps) {
  const [form, setForm] = useState<ItemForm>(() => formOf(item));
  const [extIdTouched, setExtIdTouched] = useState(false);
  const [icon, setIcon] = useState<File | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { save, saving, error, creating } = useContentSave(gameId, "items", item === null);
  const { remove } = useContentWrites(gameId, "items");

  const rarities = useRarities(gameId);
  const definitions = useAttributeDefinitions(gameId);
  const categories = useContentList<CategoryDocument>(gameId, "categories", { size: MAX_PAGE_SIZE, sort: "name" });
  const events = useContentList<EventDocument>(gameId, "events", { size: MAX_PAGE_SIZE, sort: "name" });

  const categoryOptions = useMemo<CodeOption[]>(
    () =>
      (categories.data?.content ?? [])
        .filter((category) => category.appliesTo !== "entity")
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
  const set = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const setAttribute = (key: string, value: string | boolean) =>
    setForm((current) => ({ ...current, attributes: { ...current.attributes, [key]: value } }));

  const changeName = (name: string) =>
    setForm((current) => ({ ...current, name, extId: !creating || extIdTouched ? current.extId : slugOf(name) }));

  const level = numberOf(form.level);
  const buy = numberOf(form.baseBuyPrice);
  const sell = numberOf(form.baseSellPrice);
  const levelInvalid = level === undefined || (level !== null && !Number.isInteger(level));
  const numberAttributesInvalid = attributesInvalid(form.attributes, definitions.data ?? []);
  const valid =
    form.name.trim() !== "" &&
    form.extId.trim() !== "" &&
    !levelInvalid &&
    buy !== undefined &&
    sell !== undefined &&
    !numberAttributesInvalid;

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
        baseBuyPrice: buy,
        baseSellPrice: sell,
        currency: form.currency,
        variantOf: form.variantOf,
        categories: form.categories,
        events: form.events,
        attributes: attributesOut(form.attributes, definitions.data ?? []),
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
      onClose={saving ? () => undefined : onClose}
      title={creating ? "Novo item" : `Editar ${form.name || form.extId}`}
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
              Apagar item
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
        <IconUploadField currentMediaId={item ? currentMedia(item.media, "icon") : null} kind="item" file={icon} onChange={setIcon} />

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
              helperText={creating ? "Identifica o item nos dados do jogo." : "O código não muda depois de criado."}
              fullWidth
              slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
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
          <Grid size={{ xs: 12, sm: 6 }}>
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
          <Grid size={12}>
            <TextField label="Resumo" value={form.summary} onChange={(event) => set("summary", event.target.value)} fullWidth />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Descrição"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Grid>
        </Grid>

        <Divider textAlign="left">
          <Typography variant="caption" color="text.secondary">
            Preços
          </Typography>
        </Divider>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Preço de compra"
              value={form.baseBuyPrice}
              onChange={(event) => set("baseBuyPrice", event.target.value)}
              error={buy === undefined}
              helperText={buy === undefined ? "Número." : "Vazio: sem preço base de compra."}
              fullWidth
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
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
            <ReferenceField
              gameId={gameId}
              label="Moeda"
              value={form.currency}
              onPick={() => setPicking("currency")}
              onClear={() => set("currency", null)}
              helperText="Em que os preços base são cobrados."
            />
          </Grid>
        </Grid>

        <Divider textAlign="left">
          <Typography variant="caption" color="text.secondary">
            Classificação
          </Typography>
        </Divider>
        <CodesField
          label="Categorias"
          options={categoryOptions}
          value={form.categories}
          onChange={(value) => set("categories", value)}
          loading={categories.isPending}
          helperText="A principal abre o item nos painéis e no filtro Categoria; as demais são sub-categorias."
          action={
            <Button size="small" startIcon={<Add />} onClick={() => setCreatingCategory(true)} sx={{ textTransform: "none", whiteSpace: "nowrap", mt: 1 }}>
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
          helperText="Com eventos, o item só aparece quando algum deles está ativo."
        />
        <ReferenceField
          gameId={gameId}
          label="Variante de"
          value={form.variantOf ? { kind: "item", extId: form.variantOf } : null}
          onPick={() => setPicking("variantOf")}
          onClear={() => set("variantOf", null)}
          helperText="O item base, quando este é uma variante dele."
        />
        {pickError && <Alert severity="warning">{pickError}</Alert>}

        <AttributeFields definitions={definitions.data ?? []} value={form.attributes} onChange={setAttribute} />

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>

      <ApiContentSelector
        open={picking !== null}
        modal
        gameId={gameId}
        title={picking === "currency" ? "Selecionar moeda" : "Selecionar item base"}
        onClose={() => setPicking(null)}
        onConfirm={(selection) => {
          if (picking === "currency") {
            set("currency", { kind: selection.kind, extId: selection.extId });
            setPickError(null);
          } else if (selection.kind !== "item") {
            setPickError("O item base precisa ser um item, não uma entidade.");
          } else if (selection.extId === form.extId.trim()) {
            setPickError("Um item não pode ser variante de si mesmo.");
          } else {
            set("variantOf", selection.extId);
            setPickError(null);
          }
          setPicking(null);
        }}
      />
      {deleting && item && (
        <ConfirmDeleteDialog
          title="Apagar item"
          message={
            <>
              Apagar <strong>{form.name || item.extId}</strong> (<code>{item.extId}</code>)? As receitas, lojas e drops
              que citam o código continuam apontando para ele. O último estado fica guardado como revisão.
            </>
          }
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(false)}
          onConfirm={() => remove.mutate(item.extId, { onSuccess: onDeleted })}
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
