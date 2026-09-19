import type { ReactNode } from "react";
import { Button, Chip, Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { ArrowDownward, ArrowUpward, Delete, ErrorOutline, SwapHoriz } from "@mui/icons-material";
import type { Reference } from "../../api/content";
import { ReferenceName } from "./ReferenceName";

/** Rótulo de aba de formulário: o nome, quantas linhas tem e, em vermelho, quando algo impede salvar. */
export function TabLabel({ label, count, invalid }: { label: string; count?: number; invalid: boolean }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <span>{label}</span>
      {count !== undefined && <Chip size="small" label={count} color={invalid ? "error" : "default"} sx={{ height: 20 }} />}
      {count === undefined && invalid && <ErrorOutline fontSize="small" color="error" />}
    </Stack>
  );
}

/** Divisória de seção, com uma ação opcional à direita (ex.: "Adicionar"). */
export function FormSection({ title, action }: { title: string; action?: ReactNode }) {
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

/** Linha de uma lista de conteúdo: o alvo à esquerda, os campos no meio e as ações à direita. */
export function TargetRow({
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
  children?: ReactNode;
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
