import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardMedia,
  CircularProgress,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, Delete, Edit, Visibility } from "@mui/icons-material";
import { MAX_PAGE_SIZE, type MapDocument } from "../../api/content";
import { useContentList, useContentWrites, useCountWhere } from "../../api/useContent";
import { AdminGate } from "../common/AdminGate";
import { describeError } from "../common/contentForm";
import { DataChip } from "../common/DataChip";
import { StyledContainer } from "../common/StyledContainer";
import { StyledDialog } from "../common/StyledDialog";
import { MapFormDialog } from "./MapFormDialog";
import { MAP_PLACEHOLDER, MAP_TYPE_LABELS, mapThumbnail } from "./mapGeometry";

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

function MapUsageLabel({ gameId, extId }: { gameId: string; extId: string }) {
  const usage = useMapUsage(gameId, extId);
  if (usage.isPending) return <CircularProgress size={12} />;
  return (
    <Typography variant="caption" color="text.secondary">
      {plural(usage.locations, "local", "locais")} · {plural(usage.spawns, "ponto de spawn", "pontos de spawn")}
    </Typography>
  );
}

function DeleteMapDialog({ gameId, map, onClose }: { gameId: string; map: MapDocument; onClose: () => void }) {
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
            onClick={() => remove.mutate(map.extId, { onSuccess: onClose })}
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

function MapsPanel({ gameId }: { gameId: string }) {
  const navigate = useNavigate();
  const maps = useContentList<MapDocument>(gameId, "maps", { size: MAX_PAGE_SIZE, sort: "name" });
  const [search, setSearch] = useState("");
  // undefined: formulário fechado; null: criando.
  const [editing, setEditing] = useState<MapDocument | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<MapDocument | null>(null);

  const visible = useMemo(() => {
    const all = maps.data?.content ?? [];
    const term = search.trim().toLowerCase();
    return term ? all.filter((map) => map.name.toLowerCase().includes(term) || map.extId.toLowerCase().includes(term)) : all;
  }, [maps.data, search]);

  return (
    <StyledContainer
      title="Mapas"
      label="Gerencie os mapas do jogo: imagem, geometria, visões e filtros de abertura."
      search={{ placeholder: "Pesquisar mapas..." }}
      searchValue={search}
      onChangeSearch={setSearch}
      searchEnd={
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setEditing(null)}
          sx={{ textTransform: "none", whiteSpace: "nowrap" }}
        >
          Novo mapa
        </Button>
      }
    >
      {maps.isPending ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : maps.isError ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar os mapas.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {describeError(maps.error)}
          </Typography>
        </Stack>
      ) : visible.length === 0 ? (
        <Typography variant="h6" sx={{ color: "text.disabled", textAlign: "center", py: 6 }}>
          {maps.data.content.length === 0 ? "O jogo ainda não tem mapas." : "Nenhum mapa encontrado."}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {visible.map((map) => (
            <Grid key={map.extId} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={{ height: "100%", borderRadius: 1, border: 1, borderColor: "divider", display: "flex", flexDirection: "column" }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={mapThumbnail(map) ?? MAP_PLACEHOLDER}
                  alt={map.name}
                  sx={{ borderBottom: 1, borderColor: "divider" }}
                />
                <Stack spacing={1} sx={{ p: 2, flex: 1 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                      {map.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                      {map.extId}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                    <DataChip label={MAP_TYPE_LABELS[map.mapType]?.label ?? map.mapType} />
                    {!map.bounds && <DataChip label="Sem limites" color="warning" />}
                    {map.weathers.length > 0 && <DataChip label={plural(map.weathers.length, "clima", "climas")} />}
                  </Stack>
                  <MapUsageLabel gameId={gameId} extId={map.extId} />
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" sx={{ mt: "auto !important" }}>
                    <Tooltip title="Abrir mapa">
                      <IconButton size="small" onClick={() => navigate(`/game/${gameId}/map/${encodeURIComponent(map.extId)}`)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => setEditing(map)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Apagar">
                      <IconButton size="small" color="error" onClick={() => setDeleting(map)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {editing !== undefined && <MapFormDialog gameId={gameId} map={editing} onClose={() => setEditing(undefined)} />}
      {deleting && <DeleteMapDialog gameId={gameId} map={deleting} onClose={() => setDeleting(null)} />}
    </StyledContainer>
  );
}

/** Painel de mapas, só para administradores do jogo: listar, criar, editar e apagar. */
export function MapsAdminPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  return (
    <AdminGate gameId={gameId} title="Mapas" from={`/game/${gameId}/manage/maps`}>
      <MapsPanel gameId={gameId} />
    </AdminGate>
  );
}
