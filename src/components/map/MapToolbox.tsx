import { Paper, Stack, IconButton, Tooltip, Divider } from "@mui/material";
import PolylineIcon from "@mui/icons-material/Polyline";
import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import CancelIcon from "@mui/icons-material/Cancel";
import PlaceIcon from "@mui/icons-material/Place";
import CropIcon from "@mui/icons-material/Crop";
import EditIcon from "@mui/icons-material/Edit";
import { usePlatform } from "../../hooks/usePlatform";

interface MapToolboxProps {
  activeTool: 'point' | 'polygon' | null;
  /** Desenhar ponto e zona é de quem pode cadastrar conteúdo do jogo. */
  canDraw?: boolean;
  hasPoints: boolean;
  onSelectTool: (tool: 'point' | 'polygon' | null) => void;
  onConfirm: () => void;
  onClear: () => void;
  onCancel: () => void;
  isBoundBoxEditorOpen?: boolean;
  onToggleBoundBoxEditor?: () => void;
  /** Abre a edição do mapa. Sem ele (quem não administra o jogo), o botão não aparece. */
  onEditMap?: () => void;
}

export const MapToolbox = ({
  activeTool,
  canDraw = false,
  hasPoints,
  onSelectTool,
  onConfirm,
  onClear,
  onCancel,
  isBoundBoxEditorOpen = false,
  onToggleBoundBoxEditor,
  onEditMap,
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
        {!canDraw ? null : activeTool === null ? (
          <>
            <Tooltip title="Criar ponto: clique no mapa" placement="left">
              <IconButton onClick={() => onSelectTool('point')} color="primary" size="medium">
                <PlaceIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Criar zona: clique nos vértices e feche com dois cliques ou Enter" placement="left">
              <IconButton onClick={() => onSelectTool('polygon')} color="primary" size="medium">
                <PolylineIcon />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            {activeTool === 'polygon' && (
              <>
                <Tooltip title="Fechar a zona (ou dê dois cliques no mapa, ou aperte Enter)" placement="bottom">
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
            {onEditMap && (
              <Tooltip title="Editar mapa" placement="left">
                <IconButton onClick={onEditMap} size="medium">
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
};
