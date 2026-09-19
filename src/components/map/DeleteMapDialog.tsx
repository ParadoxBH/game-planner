import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Delete } from "@mui/icons-material";
import type { MapDocument } from "../../api/content";
import { useContentWrites, useCountWhere } from "../../api/useContent";
import { describeError } from "../common/contentForm";
import { StyledDialog } from "../common/StyledDialog";

/** Quantos locais e pontos de spawn estão no mapa. */
function useMapUsage(gameId: string, extId: string) {
  const locations = useCountWhere(gameId, "locations", "map", extId);
  const spawns = useCountWhere(gameId, "spawn-points", "map", extId);
  return {
    locations: locations.data?.total,
    spawns: spawns.data?.total,
    isPending: locations.isPending || spawns.isPending,
  };
}

function plural(count: number | undefined, one: string, many: string) {
  return `${count ?? 0} ${count === 1 ? one : many}`;
}

/**
 * Confirma e apaga o mapa, avisando quantos locais e pontos de spawn ficam sem ele. `onClose` fecha só a
 * confirmação (cancelar); `onDeleted`, depois de apagar.
 */
export function DeleteMapDialog({
  gameId,
  map,
  onClose,
  onDeleted,
}: {
  gameId: string;
  map: MapDocument;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { remove } = useContentWrites(gameId, "maps");
  const usage = useMapUsage(gameId, map.extId);
  const inUse = (usage.locations ?? 0) + (usage.spawns ?? 0);

  return (
    <StyledDialog
      open
      modal
      onClose={remove.isPending ? () => undefined : onClose}
      title="Apagar mapa"
      maxWidth="xs"
      actions={
        <>
          <Button onClick={onClose} disabled={remove.isPending} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={remove.isPending}
            startIcon={remove.isPending ? <CircularProgress size={16} color="inherit" /> : <Delete />}
            onClick={() => remove.mutate(map.extId, { onSuccess: onDeleted })}
            sx={{ textTransform: "none" }}
          >
            Apagar
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2">
          Apagar <strong>{map.name}</strong> (<code>{map.extId}</code>)? O último estado fica guardado como revisão.
        </Typography>
        {usage.isPending ? (
          <CircularProgress size={16} />
        ) : (
          inUse > 0 && (
            <Alert severity="warning">
              O mapa tem {plural(usage.locations, "local", "locais")} e {plural(usage.spawns, "ponto de spawn", "pontos de spawn")}.
              Eles continuam apontando para o código dele, mas ficam sem mapa para aparecer.
            </Alert>
          )
        )}
        {remove.error && <Alert severity="error">{describeError(remove.error)}</Alert>}
      </Stack>
    </StyledDialog>
  );
}
