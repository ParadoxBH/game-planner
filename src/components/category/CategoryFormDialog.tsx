import { useEffect, useState } from "react";
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
import { CloudUpload } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import type { CategoryDocument } from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentWrites } from "../../api/useContent";
import { useUploadMedia } from "../../api/useMedia";
import { ContentIcon } from "../common/ContentIcon";
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

/** Código sugerido a partir do nome: minúsculo, sem acento, com "_" no lugar de espaço e pontuação. */
function slugOf(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function describe(error: unknown): string {
  return error instanceof ApiError ? error.message : "Erro inesperado.";
}

interface CategoryFormDialogProps {
  gameId: string;
  /** A categoria a editar; null, criando. Montado só enquanto aberto, então o formulário nasce dela. */
  category: CategoryDocument | null;
  onClose: () => void;
}

/**
 * Cria ou edita uma categoria. A escrita substitui o documento inteiro, então os eventos da categoria
 * são reenviados como estão; as imagens ficam fora do documento, e um ícone novo é anexado depois de salvar.
 */
export function CategoryFormDialog({ gameId, category, onClose }: CategoryFormDialogProps) {
  // Criada nesta abertura (o ícone falhou depois): tentar de novo substitui em vez de criar outra vez.
  const [created, setCreated] = useState(false);
  const editing = Boolean(category) || created;
  const [form, setForm] = useState<CategoryForm>(() => formOf(category));
  const [extIdTouched, setExtIdTouched] = useState(false);
  const [icon, setIcon] = useState<{ file: File; preview: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const writes = useContentWrites(gameId, "categories");
  const upload = useUploadMedia();

  useEffect(() => () => {
    if (icon) URL.revokeObjectURL(icon.preview);
  }, [icon]);

  const set = <K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const changeName = (name: string) =>
    setForm((current) => ({ ...current, name, extId: editing || extIdTouched ? current.extId : slugOf(name) }));

  const valid = form.name.trim() !== "" && form.extId.trim() !== "";

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    const extId = form.extId.trim();
    const document = {
      extId,
      name: form.name.trim(),
      appliesTo: form.appliesTo,
      primary: form.primary,
      summary: form.summary.trim() || null,
      description: form.description.trim() || null,
      events: category?.events ?? [],
    };
    try {
      if (editing) await writes.put.mutateAsync({ extId, document });
      else {
        await writes.create.mutateAsync(document);
        setCreated(true);
      }
    } catch (cause) {
      setError(describe(cause));
      setSaving(false);
      return;
    }
    if (icon) {
      try {
        const uploaded = await upload.mutateAsync(icon.file);
        await writes.addMedia.mutateAsync({ extId, usage: "icon", mediaId: uploaded.media.id });
      } catch (cause) {
        // A categoria já foi salva: fica aberto para tentar o ícone de novo, agora como edição.
        setError(`Categoria salva, mas o ícone não foi enviado: ${describe(cause)}`);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onClose();
  };

  const currentIcon = category ? currentMedia(category.media, "icon") : null;

  return (
    <StyledDialog
      open
      onClose={saving ? () => undefined : onClose}
      title={editing ? `Editar ${form.name || form.extId}` : "Nova categoria"}
      actions={
        <>
          <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={!valid || saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none" }}
          >
            {editing ? "Salvar" : "Criar"}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          {icon ? (
            <img src={icon.preview} alt="Ícone novo" style={{ width: 56, height: 56, objectFit: "contain" }} />
          ) : (
            <ContentIcon mediaId={currentIcon} kind="category" alt={form.name} size={56} />
          )}
          <Button component="label" variant="outlined" size="small" startIcon={<CloudUpload />} sx={{ textTransform: "none" }}>
            {currentIcon || icon ? "Trocar ícone" : "Enviar ícone"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setIcon({ file, preview: URL.createObjectURL(file) });
                event.target.value = "";
              }}
            />
          </Button>
        </Stack>

        <TextField label="Nome" value={form.name} onChange={(event) => changeName(event.target.value)} required autoFocus fullWidth />
        <TextField
          label="Código"
          value={form.extId}
          onChange={(event) => {
            setExtIdTouched(true);
            set("extId", event.target.value);
          }}
          required
          disabled={editing}
          helperText={editing ? "O código não muda depois de criado." : "Identifica a categoria nos dados do jogo."}
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
