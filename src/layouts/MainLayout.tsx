import { Outlet } from "react-router-dom";
import { Header } from "../components/Header";
import { Box, Stack } from "@mui/material";

export function MainLayout() {
  return (
    <Stack sx={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      {/* O Header aparecerá em todas as rotas filhas */}
      <Header />
      <Box display={"flex"} flex={1} sx={{ overflowY: "auto" }}>
        {/* Renderiza o conteúdo das rotas filhas aqui */}
        <Outlet />
      </Box>
    </Stack>
  );
}
