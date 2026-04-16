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
  CircularProgress,
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
import { useMemo, useState, useEffect, useCallback } from "react";
import type { GameDataTypes, GameEvent, Item, Entity } from "../../types/gameModels";
import type { EventDetails } from "../../types/apiModels";
import { eventRepository } from "../../repositories/EventRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { getPublicUrl } from "../../utils/pathUtils";

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

  const { loading: dbLoading, getEventDetails } = useApi(gameId);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [events, setEvents] = useState<GameEvent[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    if (dbLoading || !eventId) return;

    let isMounted = true;
    setDataLoading(true);

    Promise.all([
      getEventDetails(eventId),
      eventRepository.getAll(),
      itemRepository.getAll(),
      entityRepository.getAll()
    ]).then(([details, allEvents, allItems, allEntities]) => {
      if (!isMounted) return;
      setEventDetails(details);
      setEvents(allEvents);
      setItems(allItems);
      setEntities(allEntities);
      setDataLoading(false);
    }).catch(err => {
      console.error("Error fetching event details:", err);
      if (isMounted) setDataLoading(false);
    });

    return () => { isMounted = false; };
  }, [dbLoading, eventId, getEventDetails]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [events]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  const entitiesMap = useMemo(() => {
    const map = new Map<string, any>();
    entities.forEach((e) => map.set(e.id, e));
    return map;
  }, [entities]);

  const getSourceData = useCallback((type: GameDataTypes | undefined, id: string): any => {
    if (type === "entity") return entitiesMap.get(id);
    return itemsMap.get(id);
  }, [entitiesMap, itemsMap]);

  const handleItemClick = useCallback((itemId: string) => {
    navigate(`/game/${gameId}/items/view/${itemId}`);
  }, [navigate, gameId]);

  const handleEntityClick = useCallback((entityId: string) => {
    navigate(`/game/${gameId}/entity/view/${entityId}`);
  }, [navigate, gameId]);

  const handleConjuntoClick = useCallback((conjunto: any) => {
    navigate(`/game/${gameId}/conjuntos/${conjunto.category || ""}`);
  }, [navigate, gameId]);

  if (dbLoading || dataLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
        <CircularProgress color="primary" />
      </Box>
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

  const { event, items: eventItems, recipes: eventRecipes, entities: eventEntities, conjuntos: eventConjuntos } = eventDetails;
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
        <Paper
          elevation={0}
          sx={{ overflow: "hidden", borderRadius: 4, position: "relative" }}
        >
          {event.banner && (
            <Box sx={{ height: 300, overflow: "hidden", position: "relative" }}>
              <img
                src={getPublicUrl(event.banner)}
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
                src={getPublicUrl(event.icon)}
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
                <Chip label={eventItems.length} size="small" sx={{ ml: "auto" }} />
              </Stack>
              <Stack overflow={"auto"} maxHeight={500}>
                {eventItems.length > 0 ? (
                  <Grid container spacing={1}>
                    {eventItems.map((item) => (
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
                          onClick={() => handleItemClick(item.id)}
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
                  label={eventEntities.length}
                  size="small"
                  sx={{ ml: "auto" }}
                />
              </Stack>
              <Stack overflow="auto" maxHeight={500}>
                {eventEntities.length > 0 ? (
                  <Grid container spacing={2}>
                    {eventEntities.map((entity) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={entity.id}>
                        <EntityCard
                          entity={entity}
                          onClick={() => handleEntityClick(entity.id)}
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

          {eventConjuntos.length > 0 && (
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
                    label={eventConjuntos.length}
                    size="small"
                    sx={{ ml: "auto" }}
                  />
                </Stack>
                <Grid container spacing={2}>
                  {eventConjuntos.map((conjunto) => (
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
                        onClick={() => handleConjuntoClick(conjunto)}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            src={getPublicUrl(conjunto.icon)}
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
                <Chip label={eventRecipes.length} size="small" sx={{ ml: "auto" }} />
              </Stack>
              <Stack overflow="auto" maxHeight={500}>
                {eventRecipes.length > 0 ? (
                  <Grid container spacing={2}>
                    {eventRecipes.map((recipe: any) => (
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
