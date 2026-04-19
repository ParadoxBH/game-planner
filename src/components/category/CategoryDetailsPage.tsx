import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Button,
} from "@mui/material";
import {
  NavigateNext,
  Category as CategoryIcon,
  Inventory,
  Bolt,
  ArrowBack,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { ItemCard } from "../item/ItemCard";
import { EntityCard } from "../entity/EntityCard";
import type { CategoryDetails } from "../../types/apiModels";
import { StyledContainer } from "../common/StyledContainer";

export function CategoryDetailsPage() {
  const { gameId, categoryId } = useParams<{
    gameId: string;
    categoryId: string;
  }>();
  const navigate = useNavigate();
  const { getCategoryDetails, loading: apiLoading } = useApi(gameId);

  const [details, setDetails] = useState<CategoryDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gameId && categoryId) {
      setLoading(true);
      getCategoryDetails(categoryId).then((data) => {
        setDetails(data);
        setLoading(false);
      });
    }
  }, [gameId, categoryId, getCategoryDetails]);

  if (loading || apiLoading) {
    return (
      <Container sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!details) {
    return (
      <Container sx={{ mt: 10, textAlign: "center" }}>
        <Typography variant="h5" color="error">
          Categoria não encontrada: {categoryId}
        </Typography>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Voltar
        </Button>
      </Container>
    );
  }

  const { category, items, entities } = details;

  return (
    <StyledContainer
      prefix={
        category.icon ? (
          <img
            src={category.icon}
            alt={category.name}
            style={{ height: 60, width: 60, objectFit: "contain" }}
          />
        ) : (
          <CategoryIcon sx={{ height: 60, width: 60, color: "primary.main" }} />
        )
      }
      title={category.name}
      label={category.description}
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
          <Typography color="text.primary">Categorias</Typography>
          <Typography color="primary" sx={{ fontWeight: 700 }}>
            {category.name}
          </Typography>
        </Breadcrumbs>
      }
      actionsEnd={
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 2, justifyContent: { xs: "center", md: "flex-start" } }}
        >
          <Paper
            variant="outlined"
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Inventory fontSize="small" color="primary" />
            <Typography variant="body2">{items.length} Itens</Typography>
          </Paper>
          <Paper
            variant="outlined"
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Bolt fontSize="small" color="secondary" />
            <Typography variant="body2">{entities.length} Entidades</Typography>
          </Paper>
        </Stack>
      }
    >
      {items.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h5"
            sx={{
              mb: 3,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Inventory color="primary" /> Itens nesta Categoria
          </Typography>
          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }} key={item.id}>
                <ItemCard item={item} gameId={gameId!} variant="compact"/>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {entities.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h5"
            sx={{
              mb: 3,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Bolt color="secondary" /> Entidades nesta Categoria
          </Typography>
          <Grid container spacing={2}>
            {entities.map((entity) => (
              <Grid
                size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }}
                key={entity.id}
              >
                <EntityCard
                  entity={entity}
                  onClick={() =>
                    navigate(`/game/${gameId}/entity/view/${entity.id}`)
                  }
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {items.length === 0 && entities.length === 0 && (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: "rgba(255,255,255,0.02)",
          }}
        >
          <Typography color="text.secondary">
            Nenhum conteúdo encontrado para esta categoria.
          </Typography>
        </Paper>
      )}
    </StyledContainer>
  );
}
