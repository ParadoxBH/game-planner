import { useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Slide,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import PlaceIcon from "@mui/icons-material/Place";
import InfoIcon from "@mui/icons-material/Info";
import { useParams } from "react-router-dom";
import type { ResolvedReference, SearchHit } from "../../api/content";
import { useSearch } from "../../api/useContent";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ContentChip } from "../common/ContentChip";

/** Marcação feita no mapa: ponto de spawn (sempre POINT) ou local (POINT ou POLYGON), em coordenadas de jogo. */
export interface MapDraft {
  id: string;
  kind: "spawn" | "location";
  locationType: string | null;
  /** Ocupante do ponto de spawn. */
  target: SearchHit | null;
  /** Nome do local. */
  name: string | null;
  map: string;
  wkt: string;
}

export interface DraftConfig {
  /** "spawn" ou o tipo do local. */
  type: string;
  target: SearchHit | null;
  name: string;
}

export const DRAFT_TYPES = [
  { value: "spawn", label: "Ponto de spawn (entidade ou recurso)" },
  { value: "poi", label: "Local: ponto de interesse" },
  { value: "location", label: "Local: localização" },
  { value: "biome", label: "Local: bioma" },
  { value: "region", label: "Local: região" },
];

/** JSON no formato da API, pronto para importar: pontos de spawn e locais. */
export function draftsJson(drafts: MapDraft[]): string {
  const spawnPoints = drafts
    .filter((draft) => draft.kind === "spawn")
    .map((draft) => ({
      extId: draft.id,
      map: draft.map,
      position: draft.wkt,
      occupants: draft.target ? [{ target: { kind: draft.target.kind, extId: draft.target.extId } }] : [],
    }));
  const locations = drafts
    .filter((draft) => draft.kind === "location")
    .map((draft) => ({
      extId: draft.id,
      name: draft.name ?? draft.id,
      locationType: draft.locationType,
      map: draft.map,
      area: draft.wkt,
    }));
  return JSON.stringify({ spawnPoints, locations }, null, 2);
}

function hitReference(hit: SearchHit): ResolvedReference {
  return { kind: hit.kind, extId: hit.extId, resolvedKind: hit.kind, name: hit.name, iconMediaId: hit.iconMediaId };
}

interface PointMarkerPanelProps {
  open: boolean;
  onClose: () => void;
  drafts: MapDraft[];
  onDeleteDraft: (id: string) => void;
  onClearDrafts: () => void;
  onCopyAll: () => void;
  config: DraftConfig;
  onConfigChange: (config: DraftConfig) => void;
}

export const PointMarkerPanel = ({
  open,
  onClose,
  drafts,
  onDeleteDraft,
  onClearDrafts,
  onCopyAll,
  config,
  onConfigChange,
}: PointMarkerPanelProps) => {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const [input, setInput] = useState("");
  const term = useDebouncedValue(input);
  const search = useSearch(gameId, term);
  const isSpawn = config.type === "spawn";

  return (
    <Slide direction="left" in={open} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: "absolute",
          bottom: { xs: 8, sm: 12 },
          right: { xs: 8, sm: 12 },
          width: { xs: "calc(100% - 16px)", sm: 320 },
          maxHeight: "calc(100% - 24px)",
          zIndex: 1100,
          backgroundColor: "designTokens.colors.glassBg",
          backdropFilter: "blur(20px)",
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 2, pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PlaceIcon color="primary" />
            <Typography variant="h6" sx={{ fontSize: "1rem" }}>
              Marcador de pontos
            </Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontSize: "0.7rem", textTransform: "uppercase" }}>
            Configuração da próxima marcação
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel>Tipo</InputLabel>
            <Select value={config.type} label="Tipo" onChange={(event) => onConfigChange({ ...config, type: event.target.value })}>
              {DRAFT_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isSpawn ? (
            <Autocomplete
              size="small"
              options={search.data ?? []}
              value={config.target}
              filterOptions={(options) => options}
              loading={search.isFetching}
              inputValue={input}
              onInputChange={(_, value) => setInput(value)}
              onChange={(_, value) => onConfigChange({ ...config, target: value })}
              getOptionLabel={(option) => option.name ?? option.extId}
              isOptionEqualToValue={(a, b) => a.kind === b.kind && a.extId === b.extId}
              noOptionsText={term.trim().length < 2 ? "Digite ao menos 2 letras" : "Nada encontrado"}
              renderInput={(params) => <TextField {...params} label="Ocupante (entidade ou item)" />}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={`${option.kind}:${option.extId}`} sx={{ gap: 1 }}>
                  <ContentChip target={{ kind: option.kind, extId: option.extId }} resolved={hitReference(option)} size="small" disableLink />
                  <Typography variant="body2">{option.name ?? option.extId}</Typography>
                  <Typography variant="caption" sx={{ ml: "auto", opacity: 0.5 }}>
                    {option.kind}
                  </Typography>
                </Box>
              )}
            />
          ) : (
            <TextField
              size="small"
              label="Nome do local"
              value={config.name}
              onChange={(event) => onConfigChange({ ...config, name: event.target.value })}
            />
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "rgba(255,255,255,0.03)", p: 1, borderRadius: 1 }}>
            <InfoIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">
              Cada clique no mapa marca um ponto; a ferramenta de área marca um local com polígono.
            </Typography>
          </Box>
        </Box>

        <Divider />

        <Box sx={{ flexGrow: 1, overflow: "auto", p: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontSize: "0.7rem", textTransform: "uppercase" }}>
              Sessão atual ({drafts.length})
            </Typography>
            {drafts.length > 0 && (
              <Tooltip title="Limpar tudo">
                <IconButton onClick={onClearDrafts} size="small" color="error">
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          <List dense disablePadding>
            {drafts.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center", opacity: 0.5 }}>
                <Typography variant="caption">Nenhuma marcação ainda.</Typography>
              </Box>
            ) : (
              drafts
                .slice()
                .reverse()
                .map((draft) => (
                  <ListItem
                    key={draft.id}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.5,
                      border: 1,
                      borderColor: "rgba(255,255,255,0.05)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.08)", borderColor: "primary.main" },
                    }}
                  >
                    <Box sx={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", mr: 1.5 }}>
                      {draft.target ? (
                        <ContentChip
                          target={{ kind: draft.target.kind, extId: draft.target.extId }}
                          resolved={hitReference(draft.target)}
                          size="small"
                          disableLink
                        />
                      ) : (
                        <PlaceIcon sx={{ color: "text.secondary" }} />
                      )}
                    </Box>
                    <ListItemText
                      primary={draft.target?.name ?? draft.name ?? draft.id}
                      secondary={`${draft.kind === "spawn" ? "spawn" : draft.locationType} · ${draft.wkt}`}
                      primaryTypographyProps={{ variant: "body2", sx: { fontSize: "0.8rem", fontWeight: 600, color: "text.primary" } }}
                      secondaryTypographyProps={{
                        variant: "caption",
                        sx: { display: "block", fontSize: "0.65rem", opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                      }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => onDeleteDraft(draft.id)}
                        sx={{ color: "error.main", opacity: 0.5, "&:hover": { opacity: 1 } }}
                      >
                        <DeleteIcon fontSize="inherit" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
            )}
          </List>
        </Box>

        <Divider />

        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            disabled={drafts.length === 0}
            startIcon={<ContentCopyIcon />}
            onClick={onCopyAll}
            sx={{ borderRadius: 1.5, py: 1 }}
          >
            Copiar JSON (formato da API)
          </Button>
        </Box>
      </Paper>
    </Slide>
  );
};
