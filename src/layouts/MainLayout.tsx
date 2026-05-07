import { Outlet, useParams, Navigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Box, Stack, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { loadGamesList } from "../services/dataLoader";
import { isDev } from "../utils/mapper";

export function MainLayout() {
  const { gameId } = useParams<{ gameId: string }>();
  const [loading, setLoading] = useState(!!gameId);
  const [isAllowed, setIsAllowed] = useState(true);

  useEffect(() => {
    if (gameId) {
      setLoading(true);
      loadGamesList().then(games => {
        const game = games.find(g => g.id === gameId);
        if (game?.comingSoon && !isDev()) {
          setIsAllowed(false);
        } else {
          setIsAllowed(true);
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setIsAllowed(true);
      setLoading(false);
    }
  }, [gameId]);

  if (loading) {
    return (
      <Box display="flex" flex={1} alignItems="center" justifyContent="center" height="100vh" bgcolor="#0a0a0a">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return (
    <Stack sx={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, overflow: "hidden" }}>
      {/* O Header aparecerá em todas as rotas filhas */}
      <Header />
      <Box display={"flex"} flex={1} sx={{ overflowY: "auto" }}>
        {/* Renderiza o conteúdo das rotas filhas aqui */}
        <Outlet />
      </Box>
    </Stack>
  );
}
