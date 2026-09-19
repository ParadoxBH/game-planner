import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type { CategoryDocument } from "../../api/content";
import { currentMedia } from "../../api/references";
import { slugOf, useContentSave } from "../common/contentForm";
import { IconUploadField } from "../common/IconUploadField";
import { StyledDialog } from "../common/StyledDialog";
import { APPLIES_TO_LABELS } from "./CategoriesPage";

interface CategoryForm {
  extId: string;
  name: string;
  appliesTo: CategoryDocument["appliesTo"];
  primary: boolean;
  summary: string;
  description: string;
}

const EMPTY: CategoryForm = { extId: "", name: "", appliesTo: "both", primary: false, summary: "", description: "" };

function formOf(category: CategoryDocument | null): CategoryForm {
  if (!category) return EMPTY;
  return {
    extId: category.extId,
    name: category.name ?? "",
    appliesTo: category.appliesTo,
    primary: category.primary,
    summary: category.summary ?? "",
    description: category.description ?? "",
  };
}

interface CategoryFormDialogProps {
  gameId: string;
  /** A categoria a editar; null, criando. Montado só enquanto aberto, então o formulário nasce dela. */
  category: CategoryDocument | null;
  onClose: () => void;
  /** Depois de salvar, com o código da categoria. */
  onSaved?: (extId: string) => void;
}

/**
 * Cria ou edita uma categoria. A escrita substitui o documento inteiro, então os eventos da categoria
 * são reenviados como estão; as imagens ficam fora do documento, e um ícone novo é anexado depois de salvar.
 */
export function CategoryFormDialog({ gameId, category, onClose, onSaved }: CategoryFormDialogProps) {
  const [form, setForm] = useState<CategoryForm>(() => formOf(category));
  const [extIdTouched, setExtIdTouched] = useState(false);
  const [icon, setIcon] = useState<File | null>(null);
  const { save, saving, error, creating } = useContentSave(gameId, "categories", category === null);

  const set = <K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const changeName = (name: string) =>
    setForm((current) => ({ ...current, name, extId: !creating || extIdTouched ? current.extId : slugOf(name) }));

  const valid = form.name.trim() !== "" && form.extId.trim() !== "";

  const submit = async () => {
    if (!valid) return;
    const extId = form.extId.trim();
    const saved = await save(
      extId,
      {
        extId,
        name: form.name.trim(),
        appliesTo: form.appliesTo,
        primary: form.primary,
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        events: category?.events ?? [],
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
      title={creating ? "Nova categoria" : `Editar ${form.name || form.extId}`}
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
          currentMediaId={category ? currentMedia(category.media, "icon") : null}
          kind="category"
          file={icon}
          onChange={setIcon}
        />

        <TextField label="Nome" value={form.name} onChange={(event) => changeName(event.target.value)} required autoFocus fullWidth />
        <TextField
          label="Código"
          value={form.extId}
          onChange={(event) => {
            setExtIdTouched(true);
            set("extId", event.target.value);
          }}
          required
          disabled={!creating}
          helperText={creating ? "Identifica a categoria nos dados do jogo." : "O código não muda depois de criado."}
          fullWidth
          slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
        />
        <TextField
          select
          label="Agrupa"
          value={form.appliesTo}
          onChange={(event) => set("appliesTo", event.target.value as CategoryForm["appliesTo"])}
          fullWidth
        >
          {Object.entries(APPLIES_TO_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={<Switch checked={form.primary} onChange={(event) => set("primary", event.target.checked)} />}
          label={
            <Stack>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Categoria principal
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Aparece no menu, nos painéis e no filtro Categoria; as demais são sub-categorias.
              </Typography>
            </Stack>
          }
        />
        <TextField label="Resumo" value={form.summary} onChange={(event) => set("summary", event.target.value)} fullWidth />
        <TextField
          label="Descrição"
          value={form.description}
          onChange={(event) => set("description", event.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </StyledDialog>
  );
}
