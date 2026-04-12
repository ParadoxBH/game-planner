import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Grid,
  Breadcrumbs,
  Link as MuiLink,
  CircularProgress,
  Paper,
  Stack,
  CardActionArea,
} from "@mui/material";
import { NavigateNext, Category as CategoryIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import type { Category } from "../../types/gameModels";
import { StyledContainer } from "../common/StyledContainer";

export function CategoriesPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { getCategories, loading: apiLoading } = useApi(gameId);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gameId) {
      setLoading(true);
      getCategories().then((data) => {
        setCategories(data);
        setLoading(false);
      });
    }
  }, [gameId, getCategories]);

  if (loading || apiLoading) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <StyledContainer
      title={"Explorar Categorias"}
      label={
        "Navegue por todo o conteúdo organizado por tipos de itens e entidades"
      }
      actionsStart={
        <Breadcrumbs
          separator={<NavigateNext fontSize="small" />}
          sx={{ mb: 2 }}
        >
          <MuiLink
            component={Link}
            to={`/game/${gameId}`}
            underline="hover"
            color="inherit"
          >
            Dashboard
          </MuiLink>
          <Typography color="primary" sx={{ fontWeight: 700 }}>
            Categorias
          </Typography>
        </Breadcrumbs>
      }
    >
      <Grid container spacing={3}>
        {categories.map((cat) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={cat.id}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: "primary.main",
                  transform: "translateY(-4px)",
                  boxShadow: "0 4px 20px rgba(255, 68, 0, 0.15)",
                },
              }}
            >
              <CardActionArea
                component={Link}
                to={`/game/${gameId}/categories/view/${cat.id}`}
                sx={{ p: 3 }}
              >
                <Stack direction="row" spacing={3} alignItems="center">
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 2,
                      backgroundColor: "rgba(255, 68, 0, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255, 68, 0, 0.2)",
                    }}
                  >
                    {cat.icon ? (
                      <img
                        src={cat.icon}
                        alt={cat.name}
                        style={{
                          width: "70%",
                          height: "70%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <CategoryIcon color="primary" sx={{ fontSize: 32 }} />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {cat.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Clique para ver detalhes
                    </Typography>
                  </Box>
                </Stack>
              </CardActionArea>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {categories.length === 0 && (
        <Paper
          sx={{
            p: 6,
            textAlign: "center",
            backgroundColor: "rgba(255,255,255,0.02)",
          }}
        >
          <Typography color="text.secondary" variant="h6">
            Nenhuma categoria registrada para este jogo.
          </Typography>
        </Paper>
      )}
    </StyledContainer>
  );
}
