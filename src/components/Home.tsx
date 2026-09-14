import { Box, Card, CardActionArea, CardMedia, CircularProgress, Divider, Grid, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GameInfo } from "../api/content";
import { gameImage, isComingSoon, readAccessLog, recordAccess } from "../api/games";
import { useGames } from "../api/useContent";
import { isDev } from "../utils/mapper";
import { StyledContainer } from "./common/StyledContainer";

/** Escolha do jogo: os que o usuário pode ver, lidos da API, com os mais acessados primeiro. */
export function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const games = useGames();

  const accessLog = useMemo(() => readAccessLog(), [games.data]);

  const filteredGames = useMemo(() => {
    const list = games.data ?? [];
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((game) =>
      [game.name, game.summary, game.description].some((text) => text?.toLowerCase().includes(term)),
    );
  }, [games.data, searchTerm]);

  const availableGames = useMemo(
    () => filteredGames.filter((game) => !isComingSoon(game)).sort((a, b) => (accessLog[b.id] || 0) - (accessLog[a.id] || 0)),
    [filteredGames, accessLog],
  );
  const comingSoonGames = useMemo(() => filteredGames.filter(isComingSoon), [filteredGames]);

  const openGame = (gameId: string) => {
    recordAccess(gameId);
    navigate(`/game/${gameId}`);
  };

  const renderGameCard = (game: GameInfo) => {
    const comingSoon = isComingSoon(game);
    const badge = comingSoon ? "Em breve" : game.status === "draft" ? "Rascunho" : null;
    return (
      <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={game.id}>
        <Card
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            transition: "transform 0.2s ease-in-out, box-shadow 0.2s",
            "&:hover": { transform: "scale(1.05)", boxShadow: 20, zIndex: 1 },
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            borderRadius: 2,
            border: "1px solid rgba(255, 255, 255, 0.05)",
            overflow: "hidden",
            aspectRatio: "2 / 3",
          }}
        >
          <CardActionArea onClick={() => openGame(game.id)} sx={{ height: "100%" }} disabled={comingSoon && !isDev()}>
            <Box sx={{ position: "relative", height: "100%" }}>
              <CardMedia
                component="img"
                image={gameImage(game, ["capsule", "thumbnail", "banner", "icon"]) ?? `https://placehold.co/400x600/333/fff?text=${encodeURIComponent(game.name)}`}
                alt={`Capa de ${game.name}`}
                sx={{
                  height: "100%",
                  width: "100%",
                  objectFit: "cover",
                  filter: comingSoon ? "brightness(0.3) grayscale(1)" : "brightness(0.9)",
                  transition: "filter 0.3s",
                }}
              />
              {badge && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: comingSoon ? "center" : "flex-start",
                    justifyContent: comingSoon ? "center" : "flex-start",
                    p: comingSoon ? 0 : 1,
                    pointerEvents: "none",
                  }}
                >
                  <Typography
                    variant="button"
                    sx={{
                      fontWeight: 900,
                      color: "white",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      backgroundColor: "rgba(0,0,0,0.7)",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: { xs: "0.6rem", sm: "0.8rem" },
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {badge}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardActionArea>
        </Card>
      </Grid>
    );
  };

  if (games.isPending) {
    return (
      <Box display="flex" flex={1} alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (games.isError) {
    return (
      <Box display="flex" flex={1} alignItems="center" justifyContent="center" color="error.main">
        <Typography>Erro ao carregar jogos: {games.error.message}</Typography>
      </Box>
    );
  }

  return (
    <StyledContainer
      title="Selecione um jogo"
      label="Escolha um jogo para acessar seu guia interativo."
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar jogos..." }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 6, py: 2, overflowY: "auto" }}>
        {availableGames.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 800, color: "text.secondary", display: "flex", alignItems: "center", gap: 2 }}>
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
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 800, color: "text.secondary", display: "flex", alignItems: "center", gap: 2 }}>
              Em breve
              <Divider sx={{ flex: 1, opacity: 0.1 }} />
            </Typography>
            <Grid container spacing={4}>
              {comingSoonGames.map(renderGameCard)}
            </Grid>
          </Box>
        )}

        {availableGames.length === 0 && comingSoonGames.length === 0 && (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography variant="h6" color="text.secondary">
              {searchTerm ? `Nenhum jogo encontrado para "${searchTerm}"` : "Nenhum jogo disponível."}
            </Typography>
          </Box>
        )}
      </Box>
    </StyledContainer>
  );
}
