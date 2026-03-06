import { Box, Stack, Typography } from "@mui/material";

export function Home() {
  return (
    <Stack flex={1} alignItems={"center"} justifyContent={"center"}>
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h2" gutterBottom>
          Bem-vindo ao Game Planner
        </Typography>
        <Typography variant="h5" color="textSecondary">
          Seu guia definitivo para mapear sua jornada.
        </Typography>
      </Box>
    </Stack>
  );
}
