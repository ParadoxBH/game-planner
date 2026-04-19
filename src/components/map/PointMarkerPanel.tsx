import { Box, Paper, Stack, Typography, IconButton, TextField, Autocomplete, MenuItem, Select, FormControl, InputLabel, Button, Divider, Tooltip, Badge, List, ListItem, ListItemText, ListItemSecondaryAction, Slide } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import PlaceIcon from "@mui/icons-material/Place";
import InfoIcon from "@mui/icons-material/Info";
import type { Entity, ReferencePoints, Item } from "../../types/gameModels";
import { getPublicUrl } from "../../utils/pathUtils";

interface PointMarkerPanelProps {
  open: boolean;
  onClose: () => void;
  sessionPoints: ReferencePoints[];
  onDeletePoint: (id: string) => void;
  onClearPoints: () => void;
  onCopyAll: () => void;
  pointConfig: {
    type: string;
    entityId: string;
  };
  onConfigChange: (config: { type: string; entityId: string }) => void;
  entities: Entity[];
  items: Item[];
}

const POINT_TYPES = [
  { value: "spawn", label: "Spawn (Inimigo/Recurso)" },
  { value: "poi", label: "Ponto de Interesse (Local)" },
  { value: "location", label: "Localização" },
  { value: "biome", label: "Bioma/Região" },
  { value: "rule", label: "Regra" },
];

export const PointMarkerPanel = ({
  open,
  onClose,
  sessionPoints,
  onDeletePoint,
  onClearPoints,
  onCopyAll,
  pointConfig,
  onConfigChange,
  entities,
  items,
}: PointMarkerPanelProps) => {
  const allOptions = [
    ...entities.map(e => ({ id: e.id, name: e.name, icon: e.icon, type: 'entity' })),
    ...items.map(i => ({ id: i.id, name: i.name, icon: i.icon, type: 'item' }))
  ];

  const selectedOption = allOptions.find(o => o.id === pointConfig.entityId) || null;

  return (
    <Slide direction="left" in={open} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: "absolute",
          top: 12,
          right: 80, // Offset from toolbox
          width: 320,
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
        {/* Header */}
        <Box sx={{ p: 2, pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PlaceIcon color="primary" />
            <Typography variant="h6" sx={{ fontSize: "1rem" }}>Marcador de Pontos</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider />

        {/* Configuration Section */}
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontSize: "0.7rem", textTransform: "uppercase" }}>Configuração do Próximo Ponto</Typography>
          
          <FormControl fullWidth size="small">
            <InputLabel>Tipo de Ponto</InputLabel>
            <Select
              value={pointConfig.type}
              label="Tipo de Ponto"
              onChange={(e) => onConfigChange({ ...pointConfig, type: e.target.value })}
            >
              {POINT_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Autocomplete
            size="small"
            options={allOptions}
            getOptionLabel={(option) => option.name}
            value={selectedOption}
            onChange={(_, newValue) => onConfigChange({ ...pointConfig, entityId: newValue?.id || "TODO" })}
            renderInput={(params) => <TextField {...params} label="Entidade/Item" variant="outlined" />}
            renderOption={(props, option) => (
              <Box component="li" {...props} sx={{ gap: 1 }}>
                <img src={getPublicUrl(option.icon || "/img/placeholder.png")} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
                <Typography variant="body2">{option.name}</Typography>
                <Typography variant="caption" sx={{ ml: "auto", opacity: 0.5 }}>{option.type}</Typography>
              </Box>
            )}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.03)', p: 1, borderRadius: 1 }}>
            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Cada clique no mapa adicionará um ponto com estas configurações.
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* Session List */}
        <Box sx={{ flexGrow: 1, overflow: "auto", p: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1, mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontSize: "0.7rem", textTransform: "uppercase" }}>
              Sessão Atual ({sessionPoints.length})
            </Typography>
            {sessionPoints.length > 0 && (
              <Tooltip title="Limpar Tudo">
                <IconButton onClick={onClearPoints} size="small" color="error">
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          <List dense disablePadding>
            {sessionPoints.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', opacity: 0.5 }}>
                <Typography variant="caption">Nenhum ponto marcado ainda.</Typography>
              </Box>
            ) : (
              sessionPoints.slice().reverse().map((point) => {
                const entity = allOptions.find(o => o.id === point.entityId);
                return (
                  <ListItem key={point.id} sx={{ borderRadius: 1, mb: 0.5, "&:hover": { bgcolor: "rgba(255,255,255,0.05)" } }}>
                    <ListItemText
                      primary={entity?.name || point.entityId}
                      secondary={`${point.type} - [${point.geom.coordinates}]`}
                      primaryTypographyProps={{ variant: "body2", sx: { fontSize: "0.8rem", fontWeight: 600 } }}
                      secondaryTypographyProps={{ variant: "caption", sx: { display: "block", fontSize: "0.6rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" size="small" onClick={() => onDeletePoint(point.id)}>
                        <DeleteIcon fontSize="inherit" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })
            )}
          </List>
        </Box>

        <Divider />

        {/* Footer Actions */}
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            disabled={sessionPoints.length === 0}
            startIcon={<ContentCopyIcon />}
            onClick={onCopyAll}
            sx={{ borderRadius: 1.5, py: 1 }}
          >
            Copiar Lista (JSON)
          </Button>
        </Box>
      </Paper>
    </Slide>
  );
};
