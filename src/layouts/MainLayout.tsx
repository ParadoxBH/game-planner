import { Outlet, useParams, Navigate } from "react-router-dom";
import { Box, Stack } from "@mui/material";
import { ApiError } from "../api/ApiError";
import { isComingSoon } from "../api/games";
import { useGame } from "../api/useContent";
import { Header } from "../components/Header";
import { ServerOffline } from "../components/common/ServerOffline";
import { useServerOnline } from "../hooks/useServerOnline";
import { isDev } from "../utils/mapper";

export function MainLayout() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = useGame(gameId);
  const online = useServerOnline();

  // Jogo que não existe, que o usuário não pode ler ou que ainda vai sair: volta para o início.
  const notReadable = game.error instanceof ApiError && (game.error.status === 403 || game.error.status === 404);
  const notReleased = game.data !== undefined && isComingSoon(game.data) && !isDev();
  if (gameId && (notReadable || notReleased)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Stack sx={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, overflow: "hidden" }}>
      <Header />
      {/* Sem servidor, a tela aberta fica montada e escondida: volta como estava quando ele responder. */}
      {!online && <ServerOffline />}
      <Box display={online ? "flex" : "none"} flex={1} sx={{ overflowY: "auto" }}>
        <Outlet />
      </Box>
    </Stack>
  );
}
