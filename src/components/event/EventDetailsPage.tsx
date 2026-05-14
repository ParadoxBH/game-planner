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
  Explore,
} from "@mui/icons-material";
import { useApi } from "../../hooks/useApi";
import { StyledContainer } from "../common/StyledContainer";
import { ItemChip } from "../common/ItemChip";
import { RecipeCard } from "../recipe/RecipeCard";
import { EntityCard } from "../entity/EntityCard";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import { DetainItem } from "../common/DetainItem";
import type {
  GameDataTypes,
  GameEvent,
  Item,
  Entity,
  MapMetadata,
  ReferencePoints,
} from "../../types/gameModels";
import type { EventDetails } from "../../types/apiModels";
import { eventRepository } from "../../repositories/EventRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { mapRepository } from "../../repositories/MapRepository";
import { getPublicUrl } from "../../utils/pathUtils";
import { MiniMap } from "../common/MiniMap";
import { parseWKTPoint } from "../../utils/wkt";
import { usePlatform } from "../../hooks/usePlatform";

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
  const theme = useTheme();

  const { loading: dbLoading, getEventDetails } = useApi(gameId);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const { isMobile } = usePlatform();

  const [events, setEvents] = useState<GameEvent[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [maps, setMaps] = useState<MapMetadata[]>([]);

  useEffect(() => {
    if (dbLoading || !eventId) return;

    let isMounted = true;
    setDataLoading(true);

    Promise.all([
      getEventDetails(eventId),
      eventRepository.getAll(),
      itemRepository.getAll(),
      entityRepository.getAll(),
      mapRepository.getAll(),
    ])
      .then(([details, allEvents, allItems, allEntities, allMaps]) => {
        if (!isMounted) return;
        setEventDetails(details);
        setEvents(allEvents);
        setItems(allItems);
        setEntities(allEntities);
        setMaps(allMaps);
        setDataLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching event details:", err);
        if (isMounted) setDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
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

  const getSourceData = useCallback(
    (type: GameDataTypes | undefined, id: string): any => {
      if (type === "entity") return entitiesMap.get(id);
      return itemsMap.get(id);
    },
    [entitiesMap, itemsMap],
  );

  const handleItemClick = useCallback(
    (itemId: string) => {
      navigate(`/game/${gameId}/items/view/${itemId}`);
    },
    [navigate, gameId],
  );

  const handleEntityClick = useCallback(
    (entityId: string) => {
      navigate(`/game/${gameId}/entity/view/${entityId}`);
    },
    [navigate, gameId],
  );

  const handleConjuntoClick = useCallback(
    (conjunto: any) => {
      navigate(`/game/${gameId}/conjuntos/${conjunto.id}`);
    },
    [navigate, gameId],
  );

  const mapsMap = useMemo(() => {
    const map = new Map<string, MapMetadata>();
    maps.forEach((m) => map.set(m.id, m));
    return map;
  }, [maps]);

  const {
    event = {} as GameEvent,
    items: eventItems = [],
    recipes: eventRecipes = [],
    entities: eventEntities = [],
    conjuntos: eventConjuntos = [],
    referencePoints: eventReferencePoints = [],
    shops: eventShops = [],
    categories: eventCategories = [],
  } = eventDetails || {};

  const pointsGroupedByEntity = useMemo(() => {
    const groups = new Map<string, ReferencePoints[]>();
    eventReferencePoints.forEach((rp) => {
      const list = groups.get(rp.entityId) || [];
      list.push(rp);
      groups.set(rp.entityId, list);
    });
    return Array.from(groups.entries());
  }, [eventReferencePoints]);

  if (dbLoading || dataLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          width: "100%",
        }}
      >
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

  const typeInfo = typeMap[event.type as keyof typeof typeMap] || {
    label: event.type,
    color: "#999",
  };

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
      <Stack spacing={isMobile ? 2 : 4}>
        <Paper
          elevation={0}
          sx={{
            overflow: "hidden",
            borderRadius: isMobile ? 2 : 4,
            position: "relative",
            backgroundColor: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Background Blurred Image */}
          {event.banner && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
                overflow: "hidden",
              }}
            >
              <Box
                component="img"
                src={getPublicUrl(event.banner)}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "blur(25px) brightness(0.3) saturate(1.2)",
                  transform: "scale(1.15)",
                  opacity: 0.7,
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)",
                }}
              />
            </Box>
          )}
          {!isMobile && event.banner && (
            <Box
              sx={{
                height: 280,
                overflow: "hidden",
                position: "relative",
                zIndex: 1,
              }}
            >
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
                    "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.4) 100%)",
                }}
              />
            </Box>
          )}
          <Stack
            sx={{
              p: isMobile ? 2 : 4,
              pt: isMobile ? 3 : 4,
              mt: !isMobile && event.banner ? -12 : 0,
              position: "relative",
              zIndex: 2,
            }}
          >
            <Stack
              direction={"row"}
              spacing={isMobile ? 1 : 3}
              alignItems={isMobile ? "center" : "flex-start"}
            >
              <Avatar
                src={getPublicUrl(event.icon)}
                sx={{
                  width: isMobile ? 64 : 120,
                  height: isMobile ? 64 : 120,
                  border: "4px solid rgba(255,255,255,0.1)",
                  bgcolor: "rgba(255,255,255,0.05)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              />
              <Box flex={1}>
                <Typography
                  variant={"h3"}
                  fontSize={isMobile ? 24 : undefined}
                  fontWeight={800}
                  color="white"
                  gutterBottom
                >
                  {event.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
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
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    color="white"
                  >
                    {event.period?.start ? (
                      <>
                        {`${event.period.start} ${isMobile ? "\n" : "—"} ${event.period.end}`}
                      </>
                    ) : (
                      "Evento Ocasional"
                    )}
                  </Typography>
                </Stack>
                {!isMobile && (
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ textAlign: "left", lineHeight: 1.8 }}
                  >
                    {event.description ||
                      "Sem descrição disponível para este evento."}
                  </Typography>
                )}
              </Box>
            </Stack>
            {isMobile && (
              <Typography variant="subtitle2" color="text.secondary">
                {event.description ||
                  "Sem descrição disponível para este evento."}
              </Typography>
            )}
          </Stack>
        </Paper>

        <Grid container spacing={isMobile ? 2 : 4}>
          <DetainItem
            size={{ xs: 12, lg: 4 }}
            label="Itens do Evento"
            startIcon={<Inventory color="primary" />}
            count={eventItems.length}
          >
            {eventItems.length > 0 && (
              <Stack overflow={"auto"} maxHeight={500} sx={{ mt: 2 }}>
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
              </Stack>
            )}
          </DetainItem>

          <DetainItem
            size={{ xs: 12, lg: 8 }}
            label="Entidades e Estações"
            startIcon={<Category color="primary" />}
            count={eventEntities.length}
          >
            {eventEntities.length > 0 && (
              <Stack overflow="auto" maxHeight={500} sx={{ mt: 2 }}>
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
              </Stack>
            )}
          </DetainItem>

          <DetainItem
            label="Locais e Spawns"
            startIcon={<Explore color="primary" />}
            count={eventReferencePoints.length}
          >
            {pointsGroupedByEntity.length > 0 && (
              <Grid container spacing={3} sx={{ mt: 2 }}>
                {pointsGroupedByEntity.map(([entityId, entityPoints]) => {
                  const entity =
                    entitiesMap.get(entityId) || itemsMap.get(entityId);
                  
                  // Agrupar por mapa para este item específico
                  const mapGroups = new Map<string, ReferencePoints[]>();
                  entityPoints.forEach(rp => {
                    const mid = rp.mapId || "main";
                    const list = mapGroups.get(mid) || [];
                    list.push(rp);
                    mapGroups.set(mid, list);
                  });

                  return (
                    <Grid size={{ xs: 12, md: 3 }} key={entityId}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          backgroundColor: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          borderRadius: 3,
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          sx={{ mb: 2 }}
                        >
                          <Avatar
                            src={getPublicUrl(entity?.icon)}
                            variant="rounded"
                            sx={{
                              width: 48,
                              height: 48,
                              bgcolor: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            <Explore />
                          </Avatar>
                          <Box flex={1}>
                            <Typography variant="subtitle1" fontWeight={800}>
                              {entity?.name || entityId}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {entityPoints.length} local(is) encontrado(s)
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack spacing={2} flex={1}>
                          {Array.from(mapGroups.entries()).map(([mapId, points]) => {
                            const mapMeta = mapsMap.get(mapId);
                            if (!mapMeta) return null;

                            return (
                              <Box key={mapId}>
                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                  <Typography variant="caption" fontWeight={700} color="primary.main">
                                    {mapMeta.name}
                                  </Typography>
                                </Stack>
                                <MiniMap
                                  meta={mapMeta}
                                  height={160}
                                  markers={points.map(p => {
                                    const coords = parseWKTPoint(p.geom.coordinates);
                                    return {
                                      id: p.id,
                                      position: [coords[1], coords[0]], // Leaflet [lat, lng]
                                      color: theme.palette.primary.main
                                    };
                                  })}
                                  onClick={() => navigate(`/game/${gameId}/map/${mapId}?entity=${entityId}`)}
                                />
                              </Box>
                            );
                          })}
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </DetainItem>

          <DetainItem
            size={{ xs: 12, lg: 12 }}
            label="Conjuntos do Evento"
            startIcon={<AutoAwesomeMosaic color="primary" />}
            count={eventConjuntos.length}
          >
            {eventConjuntos.length > 0 && <Grid container spacing={1}>
              {eventConjuntos.map((conjunto) => (
                <Grid size={{ xs: 12, sm: 4 }} key={conjunto.id}>
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
                      <Stack flex={1}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {conjunto.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(conjunto.items?.length || 0) +
                            (conjunto.entitys?.length || 0)}{" "}
                          itens colecionáveis
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>}
          </DetainItem>

          <DetainItem
            size={{ xs: 12, lg: 6 }}
            label="Lojas do Evento"
            startIcon={<Explore color="primary" />}
            count={eventShops.length}
          >
            {eventShops.length > 0 && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                {eventShops.map((shop) => (
                  <Paper
                    key={shop.id}
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
                    onClick={() => navigate(`/game/${gameId}/shops/list/${shop.id}`)}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        src={getPublicUrl(shop.icon)}
                        variant="rounded"
                        sx={{ width: 48, height: 48 }}
                      />
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {shop.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {shop.npcId ? `NPC: ${entitiesMap.get(shop.npcId)?.name || shop.npcId}` : "Loja Global"}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </DetainItem>
          
          <DetainItem
            size={{ xs: 12, lg: 6 }}
            label="Categorias Vinculadas"
            startIcon={<Category color="primary" />}
            count={eventCategories.length}
          >
            {eventCategories.length > 0 && (
              <Grid container spacing={1} sx={{ mt: 1 }}>
                {eventCategories.map((cat) => (
                  <Grid size={{ xs: 6, sm: 4 }} key={cat.id}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        cursor: "pointer",
                        "&:hover": {
                          borderColor: "primary.main",
                          backgroundColor: "rgba(255,255,255,0.05)",
                        },
                      }}
                      onClick={() => navigate(`/game/${gameId}/categories/view/${cat.id}`)}
                    >
                      <ItemChip id={cat.id} type="category" size="small" icon={cat.icon} />
                      <Typography variant="caption" fontWeight={700} noWrap>
                        {cat.name}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </DetainItem>

          <DetainItem
            label="Receitas de Temporada"
            startIcon={<Star color="primary" />}
            count={eventRecipes.length}
          >
            {eventRecipes.length > 0 && (
              <Stack overflow="auto" maxHeight={500} sx={{ mt: 2 }}>
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
              </Stack>
            )}
          </DetainItem>
        </Grid>
      </Stack>
    </StyledContainer>
  );
}
