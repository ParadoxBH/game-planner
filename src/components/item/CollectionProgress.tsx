import { LinearProgress, Stack, Typography } from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { isComplete, type Progress } from "../../hooks/useCollectedMembers";

/** Barra de progresso de coleção ou grupo: obtidos sobre o total de membros. */
export function CollectionProgress({ progress }: { progress: Progress }) {
  const complete = isComplete(progress);
  return (
    <Stack spacing={0.5} sx={{ width: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Progresso
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {complete && <CheckCircle color="success" sx={{ fontSize: 14 }} />}
          <Typography variant="caption" fontWeight={800} color={complete ? "success.light" : "primary.light"}>
            {progress.done} / {progress.total}
          </Typography>
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0}
        color={complete ? "success" : "primary"}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Stack>
  );
}
