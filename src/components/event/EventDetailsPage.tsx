import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Divider,
  Breadcrumbs,
  Avatar,
  Chip,
} from "@mui/material";
import {
  NavigateNext,
  AccessTime,
  Star,
  Inventory,
  Category,
  AutoAwesomeMosaic,
} from "@mui/icons-material";
import { useApi } from "../../hooks/useApi";
import { StyledContainer } from "../common/StyledContainer";
import { ItemChip } from "../common/ItemChip";
import { RecipeCard } from "../recipe/RecipeCard";
import { EntityCard } from "../entity/EntityCard";
import { useMemo } from "react";
import type { GameDataTypes } from "../../types/gameModels";

const typeMap = {
  clima: { label: "Clima", color: "#4fc3f7" },
  season: { label: "Temporada", color: "#ffb74d" },
  mapa: { label: "Mapa", color: "#81c784" },
  event: { label: "Evento", color: "#ba68c8" },
};

export function EventDetailsPage() {
  const { gameId, eventId = "" } = useParams<{
    gameId: string;
    eventId: string;
  }>();
  const navigate = useNavigate();

  const { loading, getEventDetails, raw } = useApi(gameId);

  const eventDetails = useMemo(
    () => getEventDetails(eventId),
    [getEventDetails, eventId],
  );

  const eventsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (raw?.events) {
      raw.events.forEach((e) => map.set(e.id, e.name));
    }
    return map;
  }, [raw?.events]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (raw?.items) raw.items.forEach((i) => map.set(i.id, i));
    return map;
  }, [raw?.items]);

  const entitiesMap = useMemo(() => {
    const map = new Map<string, any>();
    if (raw?.entities) raw.entities.forEach((e) => map.set(e.id, e));
    return map;
  }, [raw?.entities]);

  const getSourceData = (type: GameDataTypes | undefined, id: string): any => {
    if (type === "entity") return entitiesMap.get(id);
    return itemsMap.get(id);
  };

  if (loading) {
    return (
      <StyledContainer title="Carregando..." label="Obtendo dados do jogo">
        <Typography>Por favor, aguarde...</Typography>
      </StyledContainer>
    );
  }

  if (!eventDetails) {
    return (
      <StyledContainer
        title="Evento não encontrado"
        label="O evento solicitado não existe no banco de dados."
      >
        <Typography>Verifique o ID ou retorne à lista de eventos.</Typography>
      </StyledContainer>
    );
  }

  const { event, items, recipes, entities, conjuntos } = eventDetails;
  const typeInfo = typeMap[event.type] || { label: event.type, color: "#999" };

  return (
    <StyledContainer
      title={event.name}
      label={`Detalhes do evento ${event.id}`}
      actionsStart={
        <Box>
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            <Link
              to={`/game/${gameId}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Dashboard
            </Link>
            <Link
              to={`/game/${gameId}/events`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Eventos
            </Link>
            <Typography color="primary">{event.name}</Typography>
          </Breadcrumbs>
        </Box>
      }
    >
      <Stack spacing={4} sx={{ pb: 8 }}>
        {/* Banner and Header Info */}
        <Paper
          elevation={0}
          sx={{ overflow: "hidden", borderRadius: 4, position: "relative" }}
        >
          {event.banner && (
            <Box sx={{ height: 300, overflow: "hidden", position: "relative" }}>
              <img
                src={event.banner}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                alt=""
              />
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.9))",
                }}
              />
            </Box>
          )}
          <Box
            sx={{
              p: 4,
              mt: event.banner ? -10 : 0,
              position: "relative",
              zIndex: 2,
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={3}
              alignItems="flex-start"
            >
              <Avatar
                src={event.icon}
                sx={{
                  width: 120,
                  height: 120,
                  border: "4px solid rgba(255,255,255,0.1)",
                  bgcolor: "rgba(255,255,255,0.05)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              />
              <Box sx={{ pt: 2, flex: 1 }}>
                <Typography
                  variant="h3"
                  fontWeight={800}
                  color="white"
                  gutterBottom
                >
                  {event.name}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Chip
                    label={typeInfo.label}
                    size="small"
                    sx={{
                      backgroundColor: `${typeInfo.color}20`,
                      color: typeInfo.color,
                      border: `1px solid ${typeInfo.color}40`,
                      fontWeight: 700,
                    }}
                  />
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ borderColor: "rgba(255,255,255,0.1)" }}
                  />
                  <AccessTime
                    sx={{ color: "secondary.main", fontSize: "1.2rem" }}
                  />
                  <Typography variant="body1" fontWeight={600} color="white">
                    {event.period.start}{" "}
                    {event.period.end ? `— ${event.period.end}` : ""}
                  </Typography>
                </Stack>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ maxWidth: 800, lineHeight: 1.8 }}
                >
                  {event.description}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Paper>

        <Grid container spacing={4}>
          {/* Related Items */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper
              sx={{
                p: 3,
                height: "100%",
                backgroundColor: "rgba(255,255,255,0.02)",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 3 }}justifyContent={"space-between"}
              >
                <Stack direction={"row"} spacing={1} alignItems="center">
                <Inventory color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Itens do Evento
                </Typography>
                </Stack>
                <Chip label={items.length} size="small" sx={{ ml: "auto" }} />
              </Stack>
              <Stack overflow={"auto"} maxHeight={500}>
                {items.length > 0 ? (
                  <Grid container spacing={1}>
                    {items.map((item) => (
                      <Grid size={{ xs: 4, sm: 3, md: 2, lg: 4 }} key={item.id}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 1,
                            backgroundColor: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            gap: 1.5,
                            cursor: "pointer",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            aspectRatio: "1/1",
                            "&:hover": {
                              backgroundColor: "rgba(255,255,255,0.08)",
                              borderColor: "primary.main",
                              transform: "translateY(-4px)",
                              boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
                              "& .item-name": {
                                color: "primary.main",
                              },
                            },
                          }}
                          onClick={() =>
                            navigate(`/game/${gameId}/items/view/${item.id}`)
                          }
                        >
                          <ItemChip
                            id={item.id}
                            icon={item.icon}
                            level={item.level}
                            size="large"
                          />
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            className="item-name"
                            sx={{
                              lineHeight: 1.2,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              transition: "color 0.2s",
                            }}
                          >
                            {item.name}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhum item associado diretamente.
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Related Entities/NPCs */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper
              sx={{
                p: 3,
                height: "100%",
                backgroundColor: "rgba(255,255,255,0.02)",
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 3 }}justifyContent={"space-between"}
              >
                <Stack direction={"row"} spacing={1} alignItems="center">
                <Category color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Entidades e Estações
                </Typography>
                </Stack>
                <Chip
                  label={entities.length}
                  size="small"
                  sx={{ ml: "auto" }}
                />
              </Stack>
              <Stack overflow="auto" maxHeight={500}>
                {entities.length > 0 ? (
                  <Grid container spacing={2}>
                    {entities.map((entity) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={entity.id}>
                        <EntityCard
                          entity={entity}
                          onClick={() =>
                            navigate(`/game/${gameId}/entity/view/${entity.id}`)
                          }
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma entidade especial encontrada.
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Conjuntos */}
          {conjuntos.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 3, backgroundColor: "rgba(255,255,255,0.02)" }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 3 }}
                   justifyContent={"space-between"}
                >
                  <Stack direction={"row"} spacing={1} alignItems="center">
                  <AutoAwesomeMosaic color="primary" />
                  <Typography variant="h5" fontWeight={700}>
                    Conjuntos do Evento
                  </Typography>
                  </Stack>
                  <Chip
                    label={conjuntos.length}
                    size="small"
                    sx={{ ml: "auto" }}
                  />
                </Stack>
                <Grid container spacing={2}>
                  {conjuntos.map((conjunto) => (
                    <Grid size={{ xs: 12, md: 6, xl: 4 }} key={conjunto.id}>
                      <Paper
                        sx={{
                          p: 2,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          borderRadius: 2,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": {
                            borderColor: "primary.main",
                            backgroundColor: "rgba(255,255,255,0.05)",
                            transform: "translateY(-2px)",
                          },
                        }}
                        onClick={() =>
                          navigate(
                            `/game/${gameId}/conjuntos/${conjunto.category || ""}`,
                          )
                        }
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            src={conjunto.icon}
                            variant="rounded"
                            sx={{ width: 48, height: 48 }}
                          >
                            <AutoAwesomeMosaic />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {conjunto.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(conjunto.items?.length || 0) +
                                (conjunto.entitys?.length || 0)}{" "}
                              itens colecionáveis
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          )}

          {/* Recipes */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3, backgroundColor: "rgba(255,255,255,0.02)" }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 3 }}
                justifyContent={"space-between"}
              >
                <Stack direction={"row"} spacing={1} alignItems="center">
                <Star color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Receitas de Temporada
                </Typography>
                </Stack>
                <Chip label={recipes.length} size="small" sx={{ ml: "auto" }} />
              </Stack>
              <Stack overflow="auto" maxHeight={500}>
                {recipes.length > 0 ? (
                  <Grid container spacing={2}>
                    {recipes.map((recipe: any) => (
                      <Grid size={{ xs: 12, md: 6, xl: 4 }} key={recipe.id}>
                        <RecipeCard
                          id={recipe.id}
                          name={recipe.normalizedName}
                          stations={recipe.normalizedStations}
                          ingredients={recipe.normalizedIngredients}
                          products={recipe.normalizedProducts}
                          unlock={recipe.unlock}
                          getSourceData={getSourceData}
                          eventsMap={eventsMap}
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma receita sazonal encontrada.
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </StyledContainer>
  );
}
