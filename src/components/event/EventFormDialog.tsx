import { useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import type { EventDocument } from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentWrites } from "../../api/useContent";
import { ConfirmDeleteDialog } from "../common/ConfirmDeleteDialog";
import { type ImageUpload, slugOf, useContentSave } from "../common/contentForm";
import { IconUploadField } from "../common/IconUploadField";
import { StyledDialog } from "../common/StyledDialog";
import { EVENT_TYPES } from "./ApiEventRenderers";

interface EventForm {
  extId: string;
  name: string;
  eventType: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  description: string;
}

const EMPTY: EventForm = {
  extId: "",
  name: "",
  eventType: "event",
  periodStart: "",
  periodEnd: "",
  summary: "",
  description: "",
};

function formOf(event: EventDocument | null): EventForm {
  if (!event) return EMPTY;
  return {
    extId: event.extId,
    name: event.name ?? "",
    eventType: event.eventType ?? "event",
    periodStart: event.periodStart ?? "",
    periodEnd: event.periodEnd ?? "",
    summary: event.summary ?? "",
    description: event.description ?? "",
  };
}

export interface EventFormDialogProps {
  gameId: string;
  /** O evento a editar; null se estiver criando. */
  event: EventDocument | null;
  /** Código fixo inicial ao criar (opcional). */
  extId?: string;
  onClose: () => void;
  /** Callback chamado após salvar com sucesso, recebendo o extId do evento. */
  onSaved?: (extId: string) => void;
  /** Exibe o botão de "Apagar evento". */
  canDelete?: boolean;
  /** Callback chamado após o evento ser excluído. */
  onDeleted?: () => void;
}

const TYPE_OPTIONS = Object.entries(EVENT_TYPES).map(([value, info]) => ({
  value,
  label: info.label,
}));

/**
 * Formulário para criar ou editar um evento no jogo.
 */
export function EventFormDialog({
  gameId,
  event,
  extId: initialExtId,
  onClose,
  onSaved,
  canDelete = false,
  onDeleted = onClose,
}: EventFormDialogProps) {
  const [form, setForm] = useState<EventForm>(() =>
    event || !initialExtId ? formOf(event) : { ...EMPTY, extId: initialExtId },
  );
  const [extIdTouched, setExtIdTouched] = useState(Boolean(initialExtId));

  // Imagens
  const [icon, setIcon] = useState<File | null>(null);
  const [pickedIcon, setPickedIcon] = useState<string | null>(null);
  const [iconRemoved, setIconRemoved] = useState(false);

  const [banner, setBanner] = useState<File | null>(null);
  const [pickedBanner, setPickedBanner] = useState<string | null>(null);
  const [bannerRemoved, setBannerRemoved] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const { save, saving, error, creating } = useContentSave(gameId, "events", event === null);
  const { remove } = useContentWrites(gameId, "events");

  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const changeName = (name: string) =>
    setForm((current) => ({
      ...current,
      name,
      extId: !creating || extIdTouched ? current.extId : slugOf(name),
    }));

  const valid = form.name.trim() !== "" && form.extId.trim() !== "";

  const submit = async () => {
    if (!valid) return;
    const extId = form.extId.trim();

    const images: ImageUpload[] = [];

    // Ícone
    const currentIconId = event ? currentMedia(event.media, "icon") : null;
    if (icon || pickedIcon || (iconRemoved && currentIconId)) {
      images.push({
        file: icon,
        mediaId: pickedIcon,
        usage: "icon",
        remove: iconRemoved && event ? event.media.filter((m) => m.usage === "icon") : undefined,
      });
    }

    // Banner
    const currentBannerId = event ? currentMedia(event.media, "banner") : null;
    if (banner || pickedBanner || (bannerRemoved && currentBannerId)) {
      images.push({
        file: banner,
        mediaId: pickedBanner,
        usage: "banner",
        wide: true,
        remove: bannerRemoved && event ? event.media.filter((m) => m.usage === "banner") : undefined,
      });
    }

    const saved = await save(
      extId,
      {
        extId,
        name: form.name.trim(),
        eventType: form.eventType.trim() || "event",
        periodStart: form.periodStart.trim() || null,
        periodEnd: form.periodEnd.trim() || null,
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
      },
      images,
    );

    if (saved) {
      onClose();
      onSaved?.(extId);
    }
  };

  const currentIconId = event && !iconRemoved ? currentMedia(event.media, "icon") : null;
  const currentBannerId = event && !bannerRemoved ? currentMedia(event.media, "banner") : null;

  return (
    <>
      <StyledDialog
        open
        modal
        onClose={saving ? () => undefined : onClose}
        title={creating ? "Novo evento" : `Editar ${form.name || form.extId}`}
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
                Apagar evento
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
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                ÍCONE DO EVENTO
              </Typography>
              <IconUploadField
                currentMediaId={currentIconId}
                kind="event"
                noun="ícone"
                file={icon}
                onChange={(file) => {
                  setIcon(file);
                  setPickedIcon(null);
                  setIconRemoved(false);
                }}
                gameId={gameId}
                picked={pickedIcon}
                onPick={(image) => {
                  setPickedIcon(image.mediaId);
                  setIcon(null);
                  setIconRemoved(false);
                }}
                onRemove={
                  currentIconId || icon || pickedIcon
                    ? () => {
                        setIcon(null);
                        setPickedIcon(null);
                        setIconRemoved(true);
                      }
                    : undefined
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                BANNER DO EVENTO
              </Typography>
              <IconUploadField
                wide
                currentMediaId={currentBannerId}
                kind="event"
                noun="banner"
                file={banner}
                onChange={(file) => {
                  setBanner(file);
                  setPickedBanner(null);
                  setBannerRemoved(false);
                }}
                gameId={gameId}
                picked={pickedBanner}
                onPick={(image) => {
                  setPickedBanner(image.mediaId);
                  setBanner(null);
                  setBannerRemoved(false);
                }}
                onRemove={
                  currentBannerId || banner || pickedBanner
                    ? () => {
                        setBanner(null);
                        setPickedBanner(null);
                        setBannerRemoved(true);
                      }
                    : undefined
                }
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Nome"
                value={form.name}
                onChange={(event) => changeName(event.target.value)}
                required
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
                disabled={!creating || Boolean(initialExtId)}
                helperText={
                  !creating
                    ? "O código não muda depois de criado."
                    : initialExtId
                      ? "O código já usado no conteúdo do jogo."
                      : "Identifica o evento nos dados do jogo."
                }
                fullWidth
                slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Autocomplete
                freeSolo
                options={TYPE_OPTIONS.map((opt) => opt.value)}
                getOptionLabel={(option) => {
                  const match = TYPE_OPTIONS.find((opt) => opt.value === option);
                  return match ? `${match.label} (${match.value})` : option;
                }}
                value={form.eventType}
                onChange={(_e, newValue) => set("eventType", newValue ?? "event")}
                onInputChange={(_e, newInputValue) => set("eventType", newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tipo de evento"
                    helperText="Ex.: clima, season, mapa, event..."
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Início do período"
                type="date"
                value={form.periodStart}
                onChange={(event) => set("periodStart", event.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Opcional. Data em que o evento começa."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Fim do período"
                type="date"
                value={form.periodEnd}
                onChange={(event) => set("periodEnd", event.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Opcional. Data em que o evento termina."
              />
            </Grid>
          </Grid>

          <TextField
            label="Resumo"
            value={form.summary}
            onChange={(event) => set("summary", event.target.value)}
            fullWidth
            helperText="Breve resumo exibido nos cards."
          />

          <TextField
            label="Descrição"
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            multiline
            minRows={3}
            fullWidth
            helperText="Descrição completa detalhando o funcionamento e regras do evento."
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </StyledDialog>

      {deleting && event && (
        <ConfirmDeleteDialog
          title={`Apagar ${event.name}`}
          message={
            <>
              Tem certeza que deseja apagar o evento <strong>{event.name}</strong> (<code>{event.extId}</code>)?
              Os itens, mapas e conteúdos associados permanecerão no sistema.
            </>
          }
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(false)}
          onConfirm={() => remove.mutate(event.extId, { onSuccess: onDeleted })}
        />
      )}
    </>
  );
}
