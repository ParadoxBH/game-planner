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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  LinearProgress,
  CardActionArea,
} from "@mui/material";
import {
  AutoAwesomeMosaic,
  ArrowBack,
  CheckCircle,
  CheckCircleOutline,
  ViewList,
  GridView,
  Layers,
  Close as CloseIcon,
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
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedGroup, setSelectedGroup] = useState<ConjuntoGroup | null>(null);
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

  // Load view mode preference from localStorage
  useEffect(() => {
    if (!gameId) return;
    const saved = localStorage.getItem(`gp_conjuntos_view_mode_${gameId}`);
    if (saved === "grid" || saved === "list") {
      setViewMode(saved);
    }
  }, [gameId]);

  // Save filter preference to localStorage
  const toggleHideCompleted = () => {
    const newVal = !hideCompleted;
    setHideCompleted(newVal);
    localStorage.setItem(`gp_hide_completed_${gameId}`, String(newVal));
  };

  const handleViewModeChange = (newMode: "list" | "grid") => {
    setViewMode(newMode);
    localStorage.setItem(`gp_conjuntos_view_mode_${gameId}`, newMode);
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
          if (!group.event || (Array.isArray(group.event) && group.event.length === 0)) return true;
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

  const renderConjuntosGrid = () => (
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
              if (!group.event || (Array.isArray(group.event) && group.event.length === 0)) return true;
              const eventArray = Array.isArray(group.event)
                ? group.event
                : [group.event];
              return eventArray.some((e) => activeEventIds.includes(e));
            }
            return true;
          }) as ConjuntoGroup[];

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
            <Grid container spacing={isMobile ? 1.5 : 3}>
              {visibleGroups.map((group) => {
                const gItems = group.items || [];
                const gEntities = group.entitys || [];
                const gTotal = gItems.length + gEntities.length;
                const gCollected = [...gItems, ...gEntities].filter((id) =>
                  collectedIds.has(id),
                ).length;
                const isCompleted = gTotal > 0 && gCollected === gTotal;
                const progressPercent = gTotal > 0 ? (gCollected / gTotal) * 100 : 0;

                // Encontrar imagem para o card do grupo
                let groupImg = group.image || group.icon;
                if (!groupImg && gItems.length > 0) {
                  const firstItem = itemMap.get(gItems[0]);
                  if (firstItem) {
                    groupImg = firstItem.image || firstItem.icon;
                  }
                }
                if (!groupImg && gEntities.length > 0) {
                  const firstEntity = entityMap.get(gEntities[0]);
                  if (firstEntity) {
                    groupImg = firstEntity.image || firstEntity.icon;
                  }
                }

                return (
                  <Grid size={{ xs: 6, sm: 6, md: 4, lg: 3 }} key={group.id}>
                    <Card
                      sx={{
                        backgroundColor: isCompleted ? alpha(theme.palette.success.light, 0.08) : "rgba(255, 255, 255, 0.02)",
                        backdropFilter: "blur(16px)",
                        borderRadius: 2,
                        border: 1,
                        borderColor: isCompleted ? "success.main" : "rgba(255, 255, 255, 0.1)",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        position: "relative",
                        "&:hover": {
                          transform: "translateY(-6px)",
                          backgroundColor: isCompleted ? alpha(theme.palette.success.light, 0.15) : "rgba(255, 255, 255, 0.05)",
                          borderColor: isCompleted ? "success.light" : "primary.main",
                          boxShadow: isCompleted ? "0 8px 32px rgba(76, 175, 80, 0.3)" : "0 8px 32px rgba(0,0,0,0.4)",
                        },
                      }}
                    >
                      <CardActionArea
                        onClick={() => setSelectedGroup(group)}
                        sx={{ p: 2, flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                      >
                        {isCompleted && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              zIndex: 1,
                              backgroundColor: "success.main",
                              color: "#fff",
                              borderRadius: "50%",
                              width: 24,
                              height: 24,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                            }}
                          >
                            <CheckCircle sx={{ fontSize: 16 }} />
                          </Box>
                        )}

                        <Box sx={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
                          <Box
                            sx={{
                              width: 80,
                              height: 80,
                              borderRadius: 2,
                              backgroundColor: "rgba(0,0,0,0.3)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              mb: 1.5,
                              p: 1,
                            }}
                          >
                            {groupImg ? (
                              <img
                                src={getPublicUrl(groupImg)}
                                alt={group.name}
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                              />
                            ) : (
                              <Layers sx={{ fontSize: 40, color: "primary.main", opacity: 0.8 }} />
                            )}
                          </Box>

                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 800,
                              textAlign: "center",
                              lineHeight: 1.2,
                              mb: 0.5,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {group.name}
                          </Typography>
                        </Box>

                        <Box sx={{ width: "100%", mt: "auto" }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              Progresso
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 800,
                                color: isCompleted ? "success.light" : "primary.light",
                              }}
                            >
                              {gCollected} / {gTotal}
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={progressPercent}
                            color={isCompleted ? "success" : "primary"}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: "rgba(255,255,255,0.1)",
                              "& .MuiLinearProgress-bar": {
                                borderRadius: 3,
                              },
                            }}
                          />
                        </Box>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        );
      })}
    </Stack>
  );

  const renderGroupDialog = () => {
    if (!selectedGroup) return null;

    const gItems = selectedGroup.items || [];
    const gEntities = selectedGroup.entitys || [];
    const gTotal = gItems.length + gEntities.length;
    const gCollected = [...gItems, ...gEntities].filter((id) => collectedIds.has(id)).length;
    const isCompleted = gTotal > 0 && gCollected === gTotal;

    return (
      <Dialog
        open={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "background.paper",
            backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))",
            borderRadius: 3,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.light" }}>
              {selectedGroup.name}
            </Typography>
            <Chip
              label={`${gCollected} / ${gTotal}`}
              size="small"
              color={isCompleted ? "success" : "primary"}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
          <IconButton onClick={() => setSelectedGroup(null)} size="small" sx={{ color: "text.secondary" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: "rgba(255,255,255,0.1)", py: 3 }}>
          {selectedGroup.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {selectedGroup.description}
            </Typography>
          )}

          <Grid container spacing={1.5}>
            {gItems.map((itemId) => {
              const item = itemMap.get(itemId);
              const isCollected = collectedIds.has(itemId);

              return (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={itemId}>
                  <Box sx={{ position: "relative", height: "100%" }}>
                    {item ? (
                      <ItemCard
                        item={item}
                        gameId={gameId || ""}
                        variant="compact"
                        sx={
                          isCollected
                            ? {
                                background: alpha(theme.palette.success.light, 0.1),
                              }
                            : undefined
                        }
                      />
                    ) : (
                      <Card sx={{ p: 1, height: "100%", display: "flex", alignItems: "center" }}>
                        <Typography variant="caption">{itemId}</Typography>
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
                        color: isCollected ? "success.main" : "rgba(255,255,255,0.2)",
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
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={entityId}>
                  <Box sx={{ position: "relative", height: "100%" }}>
                    {entity ? (
                      <EntityCard
                        entity={entity}
                        variant="compact"
                        onClick={() => navigate(`/game/${gameId}/entity/view/${entity.id}`)}
                      />
                    ) : (
                      <Card sx={{ p: 1, height: "100%", display: "flex", alignItems: "center" }}>
                        <Typography variant="caption">{entityId}</Typography>
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
                        color: isCollected ? "success.main" : "rgba(255,255,255,0.2)",
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
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSelectedGroup(null)} variant="outlined" color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

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
          sx={{ flexWrap: "wrap", gap: 1 }}
        >
          <Stack alignItems={"center"} spacing={2} direction={"row"} flex={1} justifyContent={!isMobile ? "start" : "space-between"}>
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

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, nextMode) => {
                if (nextMode) handleViewModeChange(nextMode);
              }}
              size="small"
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                "& .MuiToggleButton-root": {
                  border: "none",
                  color: "rgba(255, 255, 255, 0.5)",
                  px: 1.5,
                  py: 0.5,
                  "&.Mui-selected": {
                    color: "primary.main",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  },
                },
              }}
            >
              <Tooltip title="Lista de Grupos">
                <ToggleButton value="list">
                  <ViewList sx={{ fontSize: 20 }} />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Grade de Grupos">
                <ToggleButton value="grid">
                  <GridView sx={{ fontSize: 20 }} />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          </Stack>

          <Stack direction={"row"} alignItems={"center"} justifyContent={!isMobile ? "end" : "space-between"} flex={1} spacing={1}>
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
        </Stack>
      }
    >
      {viewMode === "grid" ? renderConjuntosGrid() : renderConjuntosList()}
      {renderGroupDialog()}

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
