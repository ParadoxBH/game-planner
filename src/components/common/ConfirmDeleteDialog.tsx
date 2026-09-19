import type { ReactNode } from "react";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Delete } from "@mui/icons-material";
import { describeError } from "./contentForm";
import { StyledDialog } from "./StyledDialog";

interface ConfirmDeleteDialogProps {
  title: string;
  /** O que será apagado e as consequências. */
  message: ReactNode;
  pending: boolean;
  error: unknown;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmação de apagar: só fecha por Cancelar ou pelo X, e mostra o erro do backend se houver. */
export function ConfirmDeleteDialog({ title, message, pending, error, onConfirm, onClose }: ConfirmDeleteDialogProps) {
  return (
    <StyledDialog
      open
      modal
      onClose={pending ? () => undefined : onClose}
      title={title}
      maxWidth="xs"
      actions={
        <>
          <Button onClick={onClose} disabled={pending} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={pending}
            startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <Delete />}
            onClick={onConfirm}
            sx={{ textTransform: "none" }}
          >
            Apagar
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2" component="div">
          {message}
        </Typography>
        {Boolean(error) && <Alert severity="error">{describeError(error)}</Alert>}
      </Stack>
    </StyledDialog>
  );
}
