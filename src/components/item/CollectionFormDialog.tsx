import { useMemo, useState } from "react";
import { Alert, Button, CircularProgress, Stack, TextField } from "@mui/material";
import { Delete } from "@mui/icons-material";
import { MAX_PAGE_SIZE, type CollectionDocument, type EventDocument } from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentList, useContentWrites } from "../../api/useContent";
import { CodesField, type CodeOption } from "../common/CodesField";
import { ConfirmDeleteDialog } from "../common/ConfirmDeleteDialog";
import { slugOf, useContentSave } from "../common/contentForm";
import { IconUploadField } from "../common/IconUploadField";
import { StyledDialog } from "../common/StyledDialog";

interface CollectionForm {
  extId: string;
  name: string;
  summary: string;
  description: string;
  events: string[];
}

const EMPTY: CollectionForm = { extId: "", name: "", summary: "", description: "", events: [] };

function formOf(collection: CollectionDocument | null): CollectionForm {
  if (!collection) return EMPTY;
  return {
    extId: collection.extId,
    name: collection.name ?? "",
    summary: collection.summary ?? "",
    description: collection.description ?? "",
    events: collection.events,
  };
}

interface CollectionFormDialogProps {
  gameId: string;
  /** O conjunto a editar; null, criando. Montado só enquanto aberto, então o formulário nasce dele. */
  collection: CollectionDocument | null;
  onClose: () => void;
  /** Depois de salvar, com o código do conjunto. */
  onSaved?: (extId: string) => void;
  /** Mostra "Apagar conjunto" (quem pode apagar: moderador ou acima). */
  canDelete?: boolean;
  /** Depois de apagar. Padrão: onClose. */
  onDeleted?: () => void;
}

/**
 * Cria ou edita um conjunto. Os membros não ficam aqui: cada grupo aponta para o conjunto pelo
 * código (ver CollectionGroupFormDialog). O ícone é anexado depois de salvar.
 */
export function CollectionFormDialog({
  gameId,
  collection,
  onClose,
  onSaved,
  canDelete = false,
  onDeleted = onClose,
}: CollectionFormDialogProps) {
  const [form, setForm] = useState<CollectionForm>(() => formOf(collection));
  const [extIdTouched, setExtIdTouched] = useState(false);
  const [icon, setIcon] = useState<File | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { save, saving, error, creating } = useContentSave(gameId, "collections", collection === null);
  const { remove } = useContentWrites(gameId, "collections");

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

  const set = <K extends keyof CollectionForm>(key: K, value: CollectionForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

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
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        events: form.events,
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
      title={creating ? "Novo conjunto" : `Editar ${form.name || form.extId}`}
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
              Apagar conjunto
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
        <IconUploadField
          currentMediaId={collection ? currentMedia(collection.media, "icon") : null}
          kind="collection"
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
          helperText={creating ? "Identifica o conjunto nos dados do jogo." : "O código não muda depois de criado."}
          fullWidth
          slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
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
        <CodesField
          label="Eventos"
          options={eventOptions}
          value={form.events}
          onChange={(value) => set("events", value)}
          loading={events.isPending}
          helperText="Com eventos, o conjunto só aparece quando algum deles está ativo."
        />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>

      {deleting && collection && (
        <ConfirmDeleteDialog
          title="Apagar conjunto"
          message={
            <>
              Apagar <strong>{form.name || collection.extId}</strong> (<code>{collection.extId}</code>)? Os grupos
              continuam cadastrados, apontando para um conjunto que não existe mais. O último estado fica guardado como
              revisão.
            </>
          }
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(false)}
          onConfirm={() => remove.mutate(collection.extId, { onSuccess: onDeleted })}
        />
      )}
    </StyledDialog>
  );
}
