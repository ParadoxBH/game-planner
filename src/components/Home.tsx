import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CircularProgress,
  Typography,
  Grid
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadGamesList } from "../services/dataLoader";
import { StyledContainer } from "./common/StyledContainer";
import type { GameInfo } from "../types/gameModels";

export function Home() {
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadGamesList()
      .then((data) => {
        setGames(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box display="flex" flex={1} alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flex={1} alignItems="center" justifyContent="center" color="error.main">
        <Typography>Erro ao carregar jogos: {error}</Typography>
      </Box>
    );
  }

  return (
    <StyledContainer
      title="Selecione um Jogo"
      label="Escolha um jogo para acessar seu guia interativo."
    >
      <Grid container spacing={4} justifyContent="center">
        {games.map((game) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={game.id}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s ease-in-out, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 10,
                },
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                backdropFilter: "blur(10px)",
                borderRadius: 2,
                border: "1px solid rgba(255, 255, 255, 0.05)"
              }}
            >
              <CardActionArea
                onClick={() => navigate(`/game/${game.id}`)}
                sx={{ flexGrow: 1 }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={game.thumbnail || `/public/img/${game.id}/logo.png`}
                  alt={`Thumbnail of ${game.name}`}
                  sx={{ filter: "brightness(0.7)" }}
                />
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography gutterBottom variant="h5" component="h2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {game.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {game.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </StyledContainer>
  );
}
