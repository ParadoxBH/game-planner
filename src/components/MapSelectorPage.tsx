import { Box, Typography, Card, CardContent, Grid, Stack, Button, CardActionArea, CardMedia } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadGamesList, loadGameMaps } from "../services/dataLoader";
import MapIcon from "@mui/icons-material/Map";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { GameInfo, MapMetadata } from "../types/gameModels";
import { getPublicUrl } from "../utils/pathUtils";
import { StyledContainer } from "./common/StyledContainer";

export const MapSelectorPage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
   const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [maps, setMaps] = useState<MapMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    Promise.all([
      loadGamesList(),
      loadGameMaps(gameId)
    ]).then(([games, mps]) => {
      const game = games.find(g => g.id === gameId);
      if (game) {
        setGameInfo(game);
        setMaps(mps);
      }
      setLoading(false);
    });
  }, [gameId]);

  if (loading) return <Box sx={{ p: 4 }}><Typography>Carregando mapas...</Typography></Box>;
  if (!gameInfo) return <Box sx={{ p: 4 }}><Typography>Jogo não encontrado.</Typography></Box>;

  return (
    <StyledContainer title={`Mapas de ${gameInfo.name}`} label={"Selecione um mapa para explorar regiões, recursos e detalhes técnicos."}>
      <Grid container spacing={3}>
        {maps.map((map: MapMetadata) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={map.id}>
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
                  borderColor: "primary.main"
                }
              }}
            >
              <CardActionArea onClick={() => navigate(`/game/${gameId}/map/${map.id}`)} sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={getPublicUrl(map.thumbnail || "https://placehold.co/600x400/333/fff?text=Map")}
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
                    {map.description || `Explore os detalhes cartográficos e analíticos de ${map.name}.`}
                  </Typography>

                  <Button 
                    fullWidth 
                    variant="contained" 
                    endIcon={<ChevronRightIcon />}
                    sx={{ 
                      borderRadius: 2.5, 
                      textTransform: "none", 
                      fontWeight: 800,
                      py: 1.5,
                      mt: "auto",
                      boxShadow: "0 4px 16px rgba(255, 68, 0, 0.2)"
                    }}
                  >
                    Abrir Mapa
                  </Button>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </StyledContainer>
  );
};
