import { Paper, Stack, IconButton, Tooltip, Divider, Badge } from "@mui/material";
import PolylineIcon from "@mui/icons-material/Polyline";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import CancelIcon from "@mui/icons-material/Cancel";
import PlaceIcon from "@mui/icons-material/Place";
import ListIcon from "@mui/icons-material/List";
import CropIcon from "@mui/icons-material/Crop";
import { usePlatform } from "../../hooks/usePlatform";

interface MapToolboxProps {
  activeTool: 'point' | 'polygon' | null;
  hasPoints: boolean;
  onSelectTool: (tool: 'point' | 'polygon' | null) => void;
  onConfirm: () => void;
  onClear: () => void;
  onCancel: () => void;
  sessionCount?: number;
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
  isBoundBoxEditorOpen?: boolean;
  onToggleBoundBoxEditor?: () => void;
}

export const MapToolbox = ({
  activeTool,
  hasPoints,
  onSelectTool,
  onConfirm,
  onClear,
  onCancel,
  sessionCount = 0,
  isPanelOpen = false,
  onTogglePanel,
  isBoundBoxEditorOpen = false,
  onToggleBoundBoxEditor,
}: MapToolboxProps) => {

  const { isMobile } = usePlatform();

  if(isMobile)
    return <></>

  return (
    <Paper
      elevation={4}
      sx={{
        backgroundColor: "designTokens.colors.glassBg",
        backdropFilter: "blur(16px)",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        p: 0.5,
      }}
    >
      <Stack direction="row" spacing={0.5}>
        {activeTool === null ? (
          <>
            <Tooltip title="Criar Ponto" placement="left">
              <IconButton onClick={() => onSelectTool('point')} color="primary" size="medium">
                <PlaceIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Criar Zona (Polígono)" placement="left">
              <IconButton onClick={() => onSelectTool('polygon')} color="primary" size="medium">
                <PolylineIcon />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            {activeTool === 'polygon' && (
              <>
                <Tooltip title="Confirmar Zona" placement="bottom">
                  <span>
                    <IconButton 
                      onClick={onConfirm} 
                      color="success" 
                      size="medium" 
                      disabled={!hasPoints}
                    >
                      <CheckIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                
                <Tooltip title="Limpar Pontos" placement="bottom">
                  <span>
                    <IconButton 
                      onClick={onClear} 
                      color="warning" 
                      size="medium" 
                      disabled={!hasPoints}
                    >
                      <ClearIcon />
                    </IconButton>
                  </span>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              </>
            )}

            <Tooltip title={activeTool === 'point' ? "Sair do modo Ponto" : "Cancelar Desenho"} placement="bottom">
              <IconButton onClick={onCancel} color="error" size="medium">
                <CancelIcon />
              </IconButton>
            </Tooltip>
          </>
        )}

        {(sessionCount > 0 || isPanelOpen || activeTool !== null) && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Tooltip title="Lista de Pontos" placement="left">
              <IconButton onClick={onTogglePanel} color={isPanelOpen ? "primary" : "default"} size="medium">
                <Badge badgeContent={sessionCount} color="primary" sx={{ "& .MuiBadge-badge": { fontSize: '0.6rem', height: 16, minWidth: 16 } }}>
                  <ListIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          </>
        )}

        {activeTool === null && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Tooltip title="Editor de BoundBox" placement="left">
              <IconButton
                onClick={onToggleBoundBoxEditor}
                color={isBoundBoxEditorOpen ? "warning" : "default"}
                size="medium"
                sx={isBoundBoxEditorOpen ? {
                  bgcolor: "rgba(251,191,36,0.12)",
                  "&:hover": { bgcolor: "rgba(251,191,36,0.2)" },
                } : {}}
              >
                <CropIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>
    </Paper>
  );
};
