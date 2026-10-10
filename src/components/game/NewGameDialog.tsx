import { useState } from "react";
import { Alert, Button, CircularProgress, Grid, TextField, Typography } from "@mui/material";
import type { GameInfo } from "../../api/content";
import { useCreateGame } from "../../api/useContent";
import { describeError, slugOf } from "../common/contentForm";
import { StyledDialog } from "../common/StyledDialog";

/** O mesmo formato que o backend aceita para o código do jogo. */
const ID_FORMAT = /^[a-z0-9_-]{2,64}$/;

interface NewGameDialogProps {
  open: boolean;
  /** Jogos já conhecidos, para avisar do código repetido antes de enviar. */
  existingIds: string[];
  onClose: () => void;
  onCreated: (game: GameInfo) => void;
}

/**
 * Registro de um jogo novo: código, nome e textos. Ele nasce como rascunho; imagens, situação,
 * políticas e reset ficam na tela de configurações do jogo, para onde quem cria é levado em seguida.
 */
export function NewGameDialog({ open, existingIds, onClose, onCreated }: NewGameDialogProps) {
  const [name, setName] = useState("");
  // Enquanto não é editado à mão, o código acompanha o nome.
  const [id, setId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateGame();

  const code = id ?? slugOf(name);
  const duplicate = existingIds.includes(code);
  const codeError = code !== "" && !ID_FORMAT.test(code)
    ? "Use de 2 a 64 caracteres entre minúsculas, números, hífen ou sublinhado."
    : duplicate
      ? "Já existe um jogo com este código."
      : null;
  const valid = name.trim() !== "" && name.length <= 120 && summary.length <= 500 && code !== "" && !codeError;

  const close = () => {
    if (create.isPending) return;
    setName("");
    setId(null);
    setSummary("");
    setDescription("");
    create.reset();
    onClose();
  };

  const submit = () => {
    if (!valid) return;
    create.mutate(
      {
        id: code,
        name: name.trim(),
        summary: summary.trim() || undefined,
        description: description.trim() || undefined,
      },
      { onSuccess: onCreated },
    );
  };

  return (
    <StyledDialog
      open={open}
      modal
      onClose={close}
      title="Novo jogo"
      maxWidth="sm"
      actions={
        <>
          <Button onClick={close} disabled={create.isPending} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={!valid || create.isPending}
            startIcon={create.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none" }}
          >
            Criar jogo
          </Button>
        </>
      }
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 7 }}>
          <TextField
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoFocus
            error={name.length > 120}
            helperText={name.length > 120 ? "Até 120 caracteres." : undefined}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <TextField
            label="Código"
            value={code}
            onChange={(event) => setId(event.target.value.toLowerCase())}
            required
            error={Boolean(codeError)}
            helperText={codeError ?? "Vai na URL do jogo e não muda depois."}
            fullWidth
            slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Resumo"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            error={summary.length > 500}
            helperText={`${summary.length}/500`}
            fullWidth
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Descrição"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
        </Grid>
        <Grid size={12}>
          <Typography variant="caption" color="text.secondary">
            O jogo nasce como rascunho e você vira owner dele. Depois de criar, você vai para as configurações para
            enviar as imagens e definir situação, acesso e reset.
          </Typography>
        </Grid>
        {create.isError && (
          <Grid size={12}>
            <Alert severity="error">{describeError(create.error)}</Alert>
          </Grid>
        )}
      </Grid>
    </StyledDialog>
  );
}
