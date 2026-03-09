import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadGamesList } from "../services/dataLoader";

interface GameInfo {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
}

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
      <Box
        display="flex"
        flex={1}
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flex={1}
        alignItems="center"
        justifyContent="center"
        color="error.main"
      >
        <Typography>Erro ao carregar jogos: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, width: "100%", maxWidth: "1200px", mx: "auto" }}>
      <Typography variant="h2" gutterBottom textAlign="center" sx={{ mb: 1, fontWeight: 'bold' }}>
        Selecione um Jogo
      </Typography>
      <Typography
        variant="h5"
        color="textSecondary"
        textAlign="center"
        sx={{ mb: 6 }}
      >
        Escolha um jogo para acessar seu guia.
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          justifyContent: "center",
        }}
      >
        {games.map((game) => (
          <Box
            key={game.id}
            sx={{
              width: { xs: "100%", sm: "calc(50% - 16px)", md: "calc(33.333% - 21.33px)" },
            }}
          >
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s ease-in-out, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
                backgroundColor: "background.paper",
                borderRadius: 2,
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
                  sx={{ filter: "brightness(0.8)" }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {game.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {game.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
