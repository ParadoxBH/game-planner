import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CircularProgress,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Add, Edit } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { MAX_PAGE_SIZE, type MapDocument } from "../../api/content";
import { useContentList, useGame } from "../../api/useContent";
import { useGameAdmin } from "../../hooks/useGameAdmin";
import { StyledContainer } from "../common/StyledContainer";
import { MapFormDialog } from "./MapFormDialog";
import { MAP_PLACEHOLDER, mapThumbnail } from "./mapGeometry";

/**
 * Mapas do jogo, lidos da API. Para quem administra o jogo, é também onde se gerencia: criar pelo
 * cabeçalho e editar em cada card; apagar fica dentro da edição.
 */
export const MapSelectorPage = () => {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const game = useGame(gameId);
  const { isAdmin } = useGameAdmin(gameId);
  const maps = useContentList<MapDocument>(gameId, "maps", { size: MAX_PAGE_SIZE, sort: "name" });
  // undefined: formulário fechado; null: criando.
  const [editing, setEditing] = useState<MapDocument | null | undefined>(undefined);

  const open = (map: MapDocument) => navigate(`/game/${gameId}/map/${encodeURIComponent(map.extId)}`);

  return (
    <StyledContainer
      title={`Mapas de ${game.data?.name ?? gameId}`}
      label="Selecione um mapa para explorar regiões, recursos e detalhes técnicos."
      actionsEnd={
        isAdmin && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setEditing(null)}
            sx={{ textTransform: "none", whiteSpace: "nowrap" }}
          >
            Novo mapa
          </Button>
        )
      }
    >
      {maps.isPending ? (
        <Stack alignItems="center" sx={{ py: 10 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : maps.isError ? (
        <Typography color="error">{maps.error.message}</Typography>
      ) : maps.data.content.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 8 }}>
          Nenhum mapa cadastrado para este jogo.
        </Typography>
      ) : (
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Grid container spacing={3}>
            {maps.data.content.map((map) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={map.extId}>
                <Card
                  sx={{
                    bgcolor: "designTokens.colors.glassBg",
                    backdropFilter: "blur(16px)",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 4,
                    overflow: "hidden",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => open(map)}
                    sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start" }}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={mapThumbnail(map) ?? MAP_PLACEHOLDER}
                      alt={map.name}
                      sx={{ borderBottom: 1, borderColor: "divider" }}
                    />
                    <CardContent sx={{ p: 3, pb: 0, flexGrow: 1, display: "flex", flexDirection: "column" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: "-0.5px" }}>
                          {map.name}
                        </Typography>
                        <Box sx={{ p: 1, bgcolor: "rgba(255, 68, 0, 0.1)", borderRadius: 1.5, display: "flex" }}>
                          <MapIcon color="primary" fontSize="small" />
                        </Box>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {map.summary ?? map.description ?? `Explore os detalhes cartográficos e analíticos de ${map.name}.`}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                  {/* Fora da área clicável do card: botão dentro de botão não é permitido. */}
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 3, pt: 3 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      endIcon={<ChevronRightIcon />}
                      onClick={() => open(map)}
                      sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 800, py: 1.5 }}
                    >
                      Abrir mapa
                    </Button>
                    {isAdmin && (
                      <Tooltip title="Editar mapa">
                        <IconButton onClick={() => setEditing(map)} sx={{ border: 1, borderColor: "divider", borderRadius: 2.5 }}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      {editing !== undefined && <MapFormDialog gameId={gameId} map={editing} onClose={() => setEditing(undefined)} />}
    </StyledContainer>
  );
};
