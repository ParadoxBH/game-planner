import {
  Grid,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Box
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { Construction } from "@mui/icons-material";
import { StyledContainer } from "../common/StyledContainer";

interface CalculatorOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

export function CalculatorPage() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();

  const calculatorOptions: CalculatorOption[] = [
    {
      id: "crafting",
      title: "Calculadora de Crafting",
      description: "Calcule a quantidade total de recursos base necessários para fabricar itens complexos.",
      icon: <Construction sx={{ fontSize: 40, color: "primary.main" }} />,
      path: `/game/${gameId}/calculator/crafting`
    },
    // Aqui podem ser adicionadas novas calculadoras no futuro
  ];

  return (
    <StyledContainer
      title="Calculadoras"
      label="Ferramentas e utilitários para auxiliar sua jornada no jogo."
    >
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {calculatorOptions.map((option) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={option.id}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s ease-in-out, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 10,
                  borderColor: "primary.main"
                },
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                backdropFilter: "blur(10px)",
                borderRadius: 2,
                border: "1px solid rgba(255, 255, 255, 0.05)"
              }}
            >
              <CardActionArea
                onClick={() => navigate(option.path)}
                sx={{ flexGrow: 1, p: 2 }}
              >
                <CardContent>
                  <Stack spacing={2} alignItems="center" textAlign="center">
                    <Box 
                      sx={{ 
                        p: 2, 
                        borderRadius: "50%", 
                        backgroundColor: "rgba(255, 68, 0, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {option.icon}
                    </Box>
                    <Typography variant="h6" fontWeight="bold">
                      {option.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </StyledContainer>
  );
}
