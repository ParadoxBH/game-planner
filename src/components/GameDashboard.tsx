import { Button, Typography, Stack, useTheme, Grid, Card, Box, CardContent, CardActionArea } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Map, 
  Construction, 
  Pets, 
  Assignment, 
  Storefront, 
  Restaurant, 
  Event, 
  ConfirmationNumber 
} from "@mui/icons-material";
import { StyledContainer } from "./common/StyledContainer";

export function GameDashboard() {
  const theme = useTheme();
  const { gameId } = useParams();
  const navigate = useNavigate();

  // Função auxiliar para capitalizar a primeira letra
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const menuItems = [
    { title: "Mapa Interativo", icon: <Map sx={{ fontSize: 40 }} />, path: `/game/${gameId}/map`, color: theme.palette.primary.main },
    { title: "Itens & Recursos", icon: <Construction sx={{ fontSize: 40 }} />, path: `/game/${gameId}/items/list`, color: "#4caf50" },
    { title: "Entidades", icon: <Pets sx={{ fontSize: 40 }} />, path: `/game/${gameId}/entity/list`, color: "#ff9800" },
    { title: "Receitas", icon: <Restaurant sx={{ fontSize: 40 }} />, path: `/game/${gameId}/recipes/list`, color: "#f44336" },
    { title: "Lojas", icon: <Storefront sx={{ fontSize: 40 }} />, path: `/game/${gameId}/shops/list`, color: "#9c27b0" },
    { title: "Eventos", icon: <Event sx={{ fontSize: 40 }} />, path: `/game/${gameId}/events`, color: "#e91e63" },
    { title: "Códigos", icon: <ConfirmationNumber sx={{ fontSize: 40 }} />, path: `/game/${gameId}/codes`, color: "#795548" },
    { title: "Missões", icon: <Assignment sx={{ fontSize: 40 }} />, path: `/game/${gameId}/quests`, color: "#2196f3" },
  ];

  return (
    <StyledContainer
      title={`Dashboard: ${gameId ? capitalize(gameId) : ''}`}
      label="Acesse as ferramentas e dados do seu jogo."
    >
      <Grid container spacing={3}>
        {menuItems.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.title}>
            <Card sx={{ 
              borderRadius: 2, 
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                transform: 'translateY(-4px)',
                borderColor: item.color
              }
            }}>
              <CardActionArea onClick={() => navigate(item.path)} sx={{ p: 4, textAlign: 'center' }}>
                <Box sx={{ 
                  color: item.color, 
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  {item.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {item.title}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </StyledContainer>
  );
}
