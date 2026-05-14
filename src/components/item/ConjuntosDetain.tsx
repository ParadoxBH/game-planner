import {
  Box,
  Typography,
  Card,
  Grid,
  Stack,
  Chip,
  CircularProgress,
  alpha,
  Switch,
  Button,
  Checkbox,
} from "@mui/material";
import {
  AutoAwesomeMosaic,
  ArrowBack,
  CheckCircle,
  CheckCircleOutline,
} from "@mui/icons-material";
import { ItemCard } from "./ItemCard";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { useState, useMemo, useEffect } from "react";
import { StyledContainer } from "../common/StyledContainer";
import type {
  Conjunto,
  ConjuntoGroup,
  Item,
  Entity,
} from "../../types/gameModels";
import { EntityCard } from "../entity/EntityCard";
import { conjuntoRepository } from "../../repositories/ConjuntoRepository";
import { conjuntoGroupRepository } from "../../repositories/ConjuntoGroupRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { usePlatform } from "../../hooks/usePlatform";
import { theme } from "../../theme/theme";
import { getPublicUrl } from "../../utils/pathUtils";

export function ConjuntosDetain() {
  const { gameId, conjuntoId } = useParams<{
    gameId: string;
    conjuntoId?: string;
  }>();
  const navigate = useNavigate();

  const { loading: dbLoading, activeEventIds } = useApi(gameId);

  const [conjuntos, setConjuntos] = useState<Conjunto[]>([]);
  const [conjuntoGroups, setConjuntoGroups] = useState<ConjuntoGroup[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  const [hideCompleted, setHideCompleted] = useState(false);
  const { isMobile } = usePlatform();

  // Load data
  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    Promise.all([
      conjuntoRepository.getAll(),
      conjuntoGroupRepository.getAll(),
      itemRepository.getAll(),
      entityRepository.getAll(),
    ])
      .then(([allConjuntos, allGroups, allItems, allEntities]) => {
        if (!isMounted) return;
        setConjuntos(allConjuntos);
        setConjuntoGroups(allGroups);
        setItems(allItems);
        setEntities(allEntities);
        setDataLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching conjuntos data:", err);
        if (isMounted) setDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dbLoading]);

  // Load collected IDs from localStorage
  useEffect(() => {
    if (!gameId) return;
    const saved = localStorage.getItem(`gp_collected_${gameId}`);
    if (saved) {
      try {
        setCollectedIds(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error("Failed to parse collected IDs", e);
      }
    }
  }, [gameId]);

  // Load filter preference from localStorage
  useEffect(() => {
    if (!gameId) return;
    const saved = localStorage.getItem(`gp_hide_completed_${gameId}`);
    if (saved) {
      setHideCompleted(saved === "true");
    }
  }, [gameId]);

  // Save filter preference to localStorage
  const toggleHideCompleted = () => {
    const newVal = !hideCompleted;
    setHideCompleted(newVal);
    localStorage.setItem(`gp_hide_completed_${gameId}`, String(newVal));
  };

  // Save to localStorage whenever collectedIds changes
  const toggleCollected = (id: string) => {
    setCollectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(
        `gp_collected_${gameId}`,
        JSON.stringify(Array.from(next)),
      );
      return next;
    });
  };

  const itemMap = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const entityMap = useMemo(() => {
    const map = new Map<string, Entity>();
    entities.forEach((entity) => map.set(entity.id, entity));
    return map;
  }, [entities]);

  const currentConjunto = useMemo(() => {
    return conjuntos.find((c) => c.id === conjuntoId);
  }, [conjuntos, conjuntoId]);

  const filteredConjuntos = useMemo(() => {
    if (!currentConjunto) return [];

    let list = [currentConjunto];

    // Filter by Event
    if (activeEventIds && activeEventIds.length > 0) {
      list = list.filter((c) => {
        // A set is shown if it has at least one group matching the active events
        const groups = conjuntoGroups.filter((g) =>
          g.conjuntoIds?.includes(c.id),
        );
        return groups.some((group) => {
          if (!group.event) return true;
          const eventArray = Array.isArray(group.event)
            ? group.event
            : [group.event];
          return eventArray.some((e) => activeEventIds.includes(e));
        });
      });
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter((c) => {
        const matchesSetName =
          c.name.toLowerCase().includes(lower) ||
          c.description?.toLowerCase().includes(lower);
        const groups = conjuntoGroups.filter((g) =>
          g.conjuntoIds?.includes(c.id),
        );
        const matchesGroupName = groups.some((g) =>
          g.name.toLowerCase().includes(lower),
        );
        return matchesSetName || matchesGroupName;
      });
    }

    return list;
  }, [currentConjunto, searchTerm, activeEventIds, conjuntoGroups]);

  // Global progress for the current conjunto
  const { globalTotal, globalCollected } = useMemo(() => {
    if (!currentConjunto) return { globalTotal: 0, globalCollected: 0 };

    const groups = conjuntoGroups.filter((g) =>
      g.conjuntoIds?.includes(currentConjunto.id),
    );
    let total = 0;
    let collected = 0;

    groups.forEach((group) => {
      const gItems = group.items || [];
      const gEntities = group.entitys || [];
      total += gItems.length + gEntities.length;
      collected += [...gItems, ...gEntities].filter((id) =>
        collectedIds.has(id),
      ).length;
    });

    return { globalTotal: total, globalCollected: collected };
  }, [currentConjunto, conjuntoGroups, collectedIds]);

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

  const renderConjuntosList = () => (
    <Stack spacing={isMobile ? 3 : 6}>
      {filteredConjuntos.map((conjunto) => {
        const groups = conjuntoGroups
          .filter((g) => g.conjuntoIds?.includes(conjunto.id))
          .filter((group) => {
            if (!group) return false;

            // Search filter within groups
            if (searchTerm) {
              const lower = searchTerm.toLowerCase();
              if (!group.name.toLowerCase().includes(lower)) return false;
            }

            // Filter Group by Event
            if (activeEventIds && activeEventIds.length > 0) {
              if (!group.event) return true;
              const eventArray = Array.isArray(group.event)
                ? group.event
                : [group.event];
              return eventArray.some((e) => activeEventIds.includes(e));
            }
            return true;
          }) as ConjuntoGroup[];

        if (hideCompleted) {
          // In the detail view, we can hide completed groups individually
          // But the user's logic might want to hide the whole set if fully completed.
          // Let's stick to hiding the groups that are fully collected.
        }

        const visibleGroups = hideCompleted 
            ? groups.filter(g => {
                const gTotal = (g.items?.length || 0) + (g.entitys?.length || 0);
                const gCollected = [...(g.items || []), ...(g.entitys || [])].filter(id => collectedIds.has(id)).length;
                return gTotal === 0 || gCollected < gTotal;
            })
            : groups;

        if (visibleGroups.length === 0 && groups.length > 0) return null;

        return (
          <Box key={conjunto.id}>
            <Stack spacing={4} sx={{ pl: isMobile ? 1 : 4 }}>
              {visibleGroups.map((group) => {
                const gItems = group.items || [];
                const gEntities = group.entitys || [];
                const gTotal = gItems.length + gEntities.length;
                const gCollected = [...gItems, ...gEntities].filter((id) =>
                  collectedIds.has(id),
                ).length;

                return (
                  <Box key={group.id}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      mb={1.5}
                    >
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 800, color: "primary.light" }}
                      >
                        {group.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({gCollected}/{gTotal})
                      </Typography>
                    </Stack>

                    {group.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        {group.description}
                      </Typography>
                    )}

                    <Grid container spacing={1}>
                      {gItems.map((itemId) => {
                        const item = itemMap.get(itemId);
                        const isCollected = collectedIds.has(itemId);

                        return (
                          <Grid
                            size={{ xs: 6, sm: 4, md: 3, lg: 2 }}
                            key={itemId}
                          >
                            <Box sx={{ position: "relative", height: "100%" }}>
                              {item ? (
                                <ItemCard
                                  item={item}
                                  gameId={gameId || ""}
                                  variant="compact"
                                  sx={
                                    isCollected
                                      ? {
                                          background: alpha(
                                            theme.palette.success.light,
                                            0.1,
                                          ),
                                        }
                                      : undefined
                                  }
                                />
                              ) : (
                                <Card
                                  sx={{
                                    p: 1,
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <Typography variant="caption">
                                    {itemId}
                                  </Typography>
                                </Card>
                              )}
                              <Checkbox
                                icon={<CheckCircleOutline />}
                                checkedIcon={<CheckCircle />}
                                checked={isCollected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleCollected(itemId);
                                }}
                                sx={{
                                  position: "absolute",
                                  top: 4,
                                  right: 4,
                                  zIndex: 10,
                                  color: isCollected
                                    ? "success.main"
                                    : "rgba(255,255,255,0.2)",
                                  "&.Mui-checked": { color: "success.main" },
                                  backgroundColor: "rgba(0,0,0,0.3)",
                                  backdropFilter: "blur(4px)",
                                  padding: "4px",
                                }}
                              />
                            </Box>
                          </Grid>
                        );
                      })}

                      {gEntities.map((entityId) => {
                        const entity = entityMap.get(entityId);
                        const isCollected = collectedIds.has(entityId);

                        return (
                          <Grid
                            size={{ xs: 6, sm: 4, md: 3, lg: 2 }}
                            key={entityId}
                          >
                            <Box sx={{ position: "relative", height: "100%" }}>
                              {entity ? (
                                <EntityCard
                                  entity={entity}
                                  variant="compact"
                                  onClick={() =>
                                    navigate(
                                      `/game/${gameId}/entity/view/${entity.id}`,
                                    )
                                  }
                                />
                              ) : (
                                <Card
                                  sx={{
                                    p: 1,
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <Typography variant="caption">
                                    {entityId}
                                  </Typography>
                                </Card>
                              )}
                              <Checkbox
                                icon={<CheckCircleOutline />}
                                checkedIcon={<CheckCircle />}
                                checked={isCollected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleCollected(entityId);
                                }}
                                sx={{
                                  position: "absolute",
                                  top: 4,
                                  right: 4,
                                  zIndex: 10,
                                  color: isCollected
                                    ? "success.main"
                                    : "rgba(255,255,255,0.2)",
                                  "&.Mui-checked": { color: "success.main" },
                                  backgroundColor: "rgba(0,0,0,0.3)",
                                  backdropFilter: "blur(4px)",
                                  padding: "4px",
                                }}
                              />
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );

  return (
    <StyledContainer
      title={
        currentConjunto ? `Conjuntos: ${currentConjunto.name}` : "Conjuntos"
      }
      label={
        currentConjunto
          ? currentConjunto.description ||
            `Explorando conjuntos de ${currentConjunto.name}`
          : "Explore coleções e conjuntos de itens temáticos."
      }
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar conjuntos..." }}
      actionsStart={
        <Stack
          alignItems={"center"}
          spacing={1}
          flex={1}
          direction={"row"}
          justifyContent={"space-between"}
        >
          <Stack alignItems={"center"} spacing={1} direction={"row"}>
            <Switch
              size="small"
              checked={hideCompleted}
              onChange={toggleHideCompleted}
            />

            <Typography
              variant="body2"
              sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
            >
              Esconder Completos
            </Typography>
          </Stack>
          <Chip
            label={`${globalCollected} / ${globalTotal}`}
            color={globalCollected === globalTotal ? "success" : "primary"}
            variant={globalCollected === globalTotal ? "filled" : "outlined"}
            sx={{ fontWeight: 800, borderRadius: 1 }}
          />
          <Button
            sx={{ minWidth: "auto" }}
            startIcon={
              !isMobile ? <ArrowBack sx={{ fontSize: 20 }} /> : undefined
            }
            onClick={() => navigate(`/game/${gameId}/conjuntos`)}
          >
            {isMobile && <ArrowBack sx={{ fontSize: 20 }} />}
            {!isMobile && (
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Voltar
              </Typography>
            )}
          </Button>
        </Stack>
      }
    >
      {renderConjuntosList()}

      {(!currentConjunto || filteredConjuntos.length === 0) && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <AutoAwesomeMosaic
            sx={{ fontSize: 64, color: "rgba(255,255,255,0.05)", mb: 2 }}
          />
          <Typography variant="h6" color="text.secondary">
            Nenhum conjunto encontrado.
          </Typography>
        </Box>
      )}
    </StyledContainer>
  );
}
