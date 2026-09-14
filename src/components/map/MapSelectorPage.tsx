import { Box, Button, Card, CardActionArea, CardContent, CardMedia, CircularProgress, Grid, Stack, Typography } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useNavigate, useParams } from "react-router-dom";
import { MAX_PAGE_SIZE, type MapDocument } from "../../api/content";
import { useContentList, useGame } from "../../api/useContent";
import { StyledContainer } from "../common/StyledContainer";
import { MAP_PLACEHOLDER, mapThumbnail } from "./mapGeometry";

/** Mapas do jogo, lidos da API. */
export const MapSelectorPage = () => {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const game = useGame(gameId);
  const maps = useContentList<MapDocument>(gameId, "maps", { size: MAX_PAGE_SIZE, sort: "name" });

  return (
    <StyledContainer
      title={`Mapas de ${game.data?.name ?? gameId}`}
      label="Selecione um mapa para explorar regiões, recursos e detalhes técnicos."
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
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => navigate(`/game/${gameId}/map/${encodeURIComponent(map.extId)}`)}
                    sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch" }}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={mapThumbnail(map) ?? MAP_PLACEHOLDER}
                      alt={map.name}
                      sx={{ borderBottom: 1, borderColor: "divider" }}
                    />
                    <CardContent sx={{ p: 3, flexGrow: 1, display: "flex", flexDirection: "column" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: "-0.5px" }}>
                          {map.name}
                        </Typography>
                        <Box sx={{ p: 1, bgcolor: "rgba(255, 68, 0, 0.1)", borderRadius: 1.5, display: "flex" }}>
                          <MapIcon color="primary" fontSize="small" />
                        </Box>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flexGrow: 1, lineHeight: 1.6 }}>
                        {map.summary ?? map.description ?? `Explore os detalhes cartográficos e analíticos de ${map.name}.`}
                      </Typography>
                      <Button
                        component="span"
                        fullWidth
                        variant="contained"
                        endIcon={<ChevronRightIcon />}
                        sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 800, py: 1.5, mt: "auto" }}
                      >
                        Abrir mapa
                      </Button>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </StyledContainer>
  );
};
