import { Box, Button, Typography, Stack } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { Map, Construction, Pets, Assignment } from "@mui/icons-material";

export function GameDashboard() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  // Função auxiliar para capitalizar a primeira letra
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <Box sx={{ p: 4, width: "100%", maxWidth: "1200px", mx: "auto" }}>
      <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        Dashboard: <span style={{ color: '#ff4400' }}>{gameId ? capitalize(gameId) : ''}</span>
      </Typography>

      <Stack spacing={2} direction="row" flexWrap="wrap" useFlexGap sx={{ mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Map />}
          onClick={() => navigate(`/game/${gameId}/map`)}
          sx={{ py: 2, px: 4, borderRadius: 2 }}
        >
          Mapa Interativo
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<Construction />}
          onClick={() => navigate(`/game/${gameId}/items`)}
          sx={{ py: 2, px: 4, borderRadius: 2 }}
        >
          Itens & Recursos
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<Pets />}
          onClick={() => navigate(`/game/${gameId}/monsters`)}
          sx={{ py: 2, px: 4, borderRadius: 2 }}
        >
          Monstros
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<Assignment />}
          onClick={() => navigate(`/game/${gameId}/quests`)}
          sx={{ py: 2, px: 4, borderRadius: 2 }}
        >
          Missões
        </Button>
      </Stack>
    </Box>
  );
}
