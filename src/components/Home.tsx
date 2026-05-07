import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CircularProgress,
  Typography,
  Grid,
  Divider
} from "@mui/material";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { loadGamesList } from "../services/dataLoader";
import { StyledContainer } from "./common/StyledContainer";
import { getPublicUrl } from "../utils/pathUtils";
import type { GameInfo } from "../types/gameModels";
import { isDev } from "../utils/mapper";

export function Home() {
  const [games, setGames] = useState<GameInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  const handleGameClick = (gameId: string) => {
    try {
      const log = JSON.parse(localStorage.getItem('gameAccessLog') || '{}');
      log[gameId] = Date.now();
      localStorage.setItem('gameAccessLog', JSON.stringify(log));
    } catch (e) {
      console.error("Failed to update access log", e);
    }
    navigate(`/game/${gameId}`);
  };

  const accessLog = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('gameAccessLog') || '{}');
    } catch {
      return {};
    }
  }, [loading]); // Refresh when loading completes

  const filteredGames = useMemo(() => {
    if (!searchTerm) return games;
    const term = searchTerm.toLowerCase();
    return games.filter(g => 
      g.name.toLowerCase().includes(term) || 
      g.description.toLowerCase().includes(term)
    );
  }, [games, searchTerm]);

  const availableGames = useMemo(() => {
    return filteredGames
      .filter(g => !g.comingSoon)
      .sort((a, b) => (accessLog[b.id] || 0) - (accessLog[a.id] || 0));
  }, [filteredGames, accessLog]);

  const comingSoonGames = useMemo(() => {
    return filteredGames.filter(g => g.comingSoon);
  }, [filteredGames]);

  const renderGameCard = (game: GameInfo) => (
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
          onClick={() => handleGameClick(game.id)}
          sx={{ flexGrow: 1 }}
          disabled={game.comingSoon && !isDev()}
        >
          <Box sx={{ position: 'relative' }}>
            <CardMedia
              component="img"
              height="200"
              image={game.thumbnail || getPublicUrl(`img/${game.id}/logo.png`)}
              alt={`Thumbnail of ${game.name}`}
              sx={{ 
                filter: game.comingSoon ? "brightness(0.3) grayscale(1)" : "brightness(0.7)",
                transition: 'filter 0.3s'
              }}
            />
            {game.comingSoon && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 900,
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    border: '2px solid rgba(255,255,255,0.2)'
                  }}
                >
                  Em Breve
                </Typography>
              </Box>
            )}
          </Box>
          <CardContent sx={{ flexGrow: 1, p: 3, opacity: game.comingSoon ? 0.5 : 1 }}>
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
  );

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
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar jogos..." }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6, py: 2 }}>
        {availableGames.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 2 }}>
              Disponíveis
              <Divider sx={{ flex: 1, opacity: 0.1 }} />
            </Typography>
            <Grid container spacing={4}>
              {availableGames.map(renderGameCard)}
            </Grid>
          </Box>
        )}

        {comingSoonGames.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 800, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 2 }}>
              Em Breve
              <Divider sx={{ flex: 1, opacity: 0.1 }} />
            </Typography>
            <Grid container spacing={4}>
              {comingSoonGames.map(renderGameCard)}
            </Grid>
          </Box>
        )}

        {availableGames.length === 0 && comingSoonGames.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h6" color="text.secondary">Nenhum jogo encontrado para "{searchTerm}"</Typography>
          </Box>
        )}
      </Box>
    </StyledContainer>
  );
}
