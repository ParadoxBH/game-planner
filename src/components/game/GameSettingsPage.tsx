import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import type { GameInfo, GamePatch, GameStatus, MediaUsage } from "../../api/content";
import { currentMedia } from "../../api/references";
import { useGame, useUpdateGame } from "../../api/useContent";
import { useUploadMedia } from "../../api/useMedia";
import { AdminGate } from "../common/AdminGate";
import { describeError } from "../common/contentForm";
import { IconUploadField } from "../common/IconUploadField";
import { StyledContainer } from "../common/StyledContainer";

const STATUS: { value: GameStatus; label: string; hint: string }[] = [
  { value: "published", label: "Publicado", hint: "Aparece e abre normalmente." },
  { value: "coming_soon", label: "Em breve", hint: "Aparece na lista marcado como em breve." },
  { value: "draft", label: "Rascunho", hint: "Em preparação." },
];

const READ_POLICIES = [
  { value: "public", label: "Pública", hint: "Qualquer pessoa, mesmo sem conta, vê o jogo." },
  { value: "members", label: "Só membros", hint: "Só membros veem; para os demais, o jogo não existe." },
] as const;

const WRITE_POLICIES = [
  { value: "community", label: "Comunitária", hint: "Qualquer conta verificada cria e edita conteúdo." },
  { value: "members", label: "Só membros", hint: "Só membros (editor ou acima) criam e editam conteúdo." },
] as const;

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** As imagens do jogo, na ordem da tela. */
const IMAGES: { usage: MediaUsage; label: string; hint: string; wide: boolean }[] = [
  { usage: "icon", label: "Ícone", hint: "No menu e nas listas.", wide: false },
  { usage: "capsule", label: "Capa", hint: "Cartaz vertical na tela inicial.", wide: false },
  { usage: "thumbnail", label: "Miniatura", hint: "Na tela inicial, sem capa.", wide: true },
  { usage: "banner", label: "Banner", hint: "Faixa larga no topo.", wide: true },
];

interface GameForm {
  name: string;
  summary: string;
  description: string;
  status: GameStatus;
  readPolicy: "public" | "members";
  writePolicy: "community" | "members";
  dailyResetTime: string;
  weeklyResetDay: string;
}

function formOf(game: GameInfo): GameForm {
  return {
    name: game.name,
    summary: game.summary ?? "",
    description: game.description ?? "",
    status: (game.status as GameStatus) ?? "published",
    readPolicy: game.readPolicy === "members" ? "members" : "public",
    writePolicy: game.writePolicy === "community" ? "community" : "members",
    // O backend devolve "HH:mm" ou "HH:mm:ss"; o campo de hora usa "HH:mm".
    dailyResetTime: game.dailyResetTime?.slice(0, 5) ?? "",
    weeklyResetDay: game.weeklyResetDay === null ? "" : String(game.weeklyResetDay),
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function GameSettingsForm({ game }: { game: GameInfo }) {
  const [form, setForm] = useState<GameForm>(() => formOf(game));
  const [images, setImages] = useState<Partial<Record<MediaUsage, File>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const update = useUpdateGame(game.id);
  const upload = useUploadMedia();

  const set = <K extends keyof GameForm>(key: K, value: GameForm[K]) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const valid = form.name.trim() !== "" && form.summary.length <= 500 && form.name.length <= 120;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const changes: GamePatch = {
        name: form.name.trim(),
        summary: form.summary.trim(),
        description: form.description.trim(),
        status: form.status,
        readPolicy: form.readPolicy,
        writePolicy: form.writePolicy,
      };
      // Vazio não é enviado: o PATCH não tem como limpar esses dois, só trocar.
      if (form.dailyResetTime) changes.dailyResetTime = form.dailyResetTime;
      if (form.weeklyResetDay !== "") changes.weeklyResetDay = Number(form.weeklyResetDay);

      const chosen = Object.entries(images) as [MediaUsage, File][];
      if (chosen.length > 0) {
        // A lista de imagens vai inteira: as de cada uso trocado saem, e entra a nova no lugar.
        const replaced = new Set(chosen.map(([usage]) => usage));
        const kept = game.media
          .filter((link) => !replaced.has(link.usage))
          .map(({ usage, mediaId }) => ({ usage, mediaId }));
        const added = [];
        for (const [usage, file] of chosen) {
          const uploaded = await upload.mutateAsync({ file });
          added.push({ usage, mediaId: uploaded.media.id });
        }
        changes.media = [...kept, ...added];
      }

      await update.mutateAsync(changes);
      setImages({});
      setSaved(true);
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setSaving(false);
    }
  };

  const hint = <T extends { value: string; hint: string }>(options: readonly T[], value: string) =>
    options.find((option) => option.value === value)?.hint;

  return (
    <Stack spacing={2}>
      <Section title="Informações">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              label="Nome"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              required
              error={form.name.length > 120}
              helperText={form.name.length > 120 ? "Até 120 caracteres." : undefined}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Código"
              value={game.id}
              disabled
              helperText="O código do jogo não muda."
              fullWidth
              slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Resumo"
              value={form.summary}
              onChange={(event) => set("summary", event.target.value)}
              error={form.summary.length > 500}
              helperText={`${form.summary.length}/500`}
              fullWidth
            />
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
      </Section>

      <Section title="Imagens">
        <Grid container spacing={3}>
          {IMAGES.map((image) => (
            <Grid key={image.usage} size={{ xs: 12, md: 6 }}>
              <Stack spacing={0.5}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {image.label}
                </Typography>
                <IconUploadField
                  currentMediaId={currentMedia(game.media, image.usage)}
                  kind="game"
                  file={images[image.usage] ?? null}
                  onChange={(file) => {
                    setSaved(false);
                    setImages((current) => ({ ...current, [image.usage]: file }));
                  }}
                  noun={image.label.toLowerCase()}
                  wide={image.wide}
                />
                <Typography variant="caption" color="text.secondary">
                  {image.hint}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section title="Publicação e acesso">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              label="Situação"
              value={form.status}
              onChange={(event) => set("status", event.target.value as GameStatus)}
              helperText={hint(STATUS, form.status)}
              fullWidth
            >
              {STATUS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              label="Quem vê"
              value={form.readPolicy}
              onChange={(event) => set("readPolicy", event.target.value as GameForm["readPolicy"])}
              helperText={hint(READ_POLICIES, form.readPolicy)}
              fullWidth
            >
              {READ_POLICIES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              label="Quem edita"
              value={form.writePolicy}
              onChange={(event) => set("writePolicy", event.target.value as GameForm["writePolicy"])}
              helperText={hint(WRITE_POLICIES, form.writePolicy)}
              fullWidth
            >
              {WRITE_POLICIES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Section>

      <Section title="Reset do jogo">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Quando os coletáveis diários e semanais voltam, no horário de quem está vendo.
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              type="time"
              label="Reset diário"
              value={form.dailyResetTime}
              onChange={(event) => set("dailyResetTime", event.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              label="Reset semanal"
              value={form.weeklyResetDay}
              onChange={(event) => set("weeklyResetDay", event.target.value)}
              fullWidth
            >
              {form.weeklyResetDay === "" && (
                <MenuItem value="">
                  <em>Não definido</em>
                </MenuItem>
              )}
              {WEEKDAYS.map((day, index) => (
                <MenuItem key={day} value={String(index)}>
                  {day}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Section>

      <Divider />
      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">Informações do jogo salvas.</Alert>}
      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
          onClick={submit}
          disabled={!valid || saving}
          sx={{ textTransform: "none" }}
        >
          Salvar
        </Button>
      </Stack>
    </Stack>
  );
}

function GameSettingsPanel({ gameId }: { gameId: string }) {
  const game = useGame(gameId);
  return (
    <StyledContainer title="Jogo" label="Informações, imagens, acesso e reset do jogo.">
      {game.isPending ? (
        <Stack alignItems="center" sx={{ py: 10 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : game.isError ? (
        <Alert severity="error">{describeError(game.error)}</Alert>
      ) : (
        <GameSettingsForm game={game.data} />
      )}
    </StyledContainer>
  );
}

/** Dados do próprio jogo: só owner ou administrador da plataforma, que é quem o backend deixa mudar. */
export function GameSettingsPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  return (
    <AdminGate gameId={gameId} title="Jogo" from={`/game/${gameId}/settings`} ownerOnly>
      <GameSettingsPanel gameId={gameId} />
    </AdminGate>
  );
}
