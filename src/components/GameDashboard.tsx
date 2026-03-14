import { Typography, Grid, Card, Box, CardActionArea } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { StyledContainer } from "./common/StyledContainer";
import { useNavigation } from "../hooks/useNavigation";

export function GameDashboard() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { menuItems } = useNavigation(gameId || null);

  // Função auxiliar para capitalizar a primeira letra
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <StyledContainer
      title={`Dashboard: ${gameId ? capitalize(gameId) : ''}`}
      label="Acesse as ferramentas e dados do seu jogo."
    >
      <Grid container spacing={3}>
        {menuItems.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.id}>
            <Card sx={{ 
              height: '100%',
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
              <CardActionArea onClick={() => navigate(item.path)} sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ 
                  color: item.color, 
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  {item.icon && (
                    <Box sx={{ "& svg": { fontSize: 40 } }}>
                      {item.icon}
                    </Box>
                  )}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {item.label}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </StyledContainer>
  );
}
