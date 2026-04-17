import {
  Typography,
  Grid,
  Card,
  Box,
  CardActionArea,
  Stack,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { StyledContainer } from "./common/StyledContainer";
import { useNavigation } from "../hooks/useNavigation";
import { usePlatform } from "../hooks/usePlatform";

export function GameDashboard() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { menuItems } = useNavigation(gameId || null);
  const { isMobile } = usePlatform();

  // Função auxiliar para capitalizar a primeira letra
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <StyledContainer
      title={`Dashboard: ${gameId ? capitalize(gameId) : ""}`}
      label="Acesse as ferramentas e dados do seu jogo."
    >
      <Grid container spacing={1}>
        {menuItems.map((item) => (
          <Grid size={{ xs: 4, sm: 3, md: 3 }} key={item.id}>
            <Card
              sx={{
                height: "100%",
                borderRadius: 1,
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  transform: "translateY(-4px)",
                  borderColor: item.color,
                },
              }}
            >
              <CardActionArea
                onClick={() => navigate(item.path)}
                sx={{
                  p: isMobile ? 2 : 4,
                  textAlign: "center",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Stack direction={"column"} alignItems={"center"} justifyContent={"center"} spacing={1}>
                  {item.icon && (
                    <Box sx={{ color: item.color, "& svg": { fontSize: isMobile ? 30 : 40 } }}>
                      {item.icon}
                    </Box>
                  )}
                  <Typography variant={"subtitle2"} fontSize={isMobile ? 12 : 24} sx={{ fontWeight: 800 }}>
                    {item.label}
                  </Typography>
                </Stack>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </StyledContainer>
  );
}
