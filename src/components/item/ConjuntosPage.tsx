import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Grid,
  Stack,
  Chip,
  CircularProgress,
  alpha,
  Switch,
  FormControlLabel,
  Button,
} from "@mui/material";
import {
  AutoAwesomeMosaic,
  Layers,
  ArrowBack,
  CheckCircle,
  CheckCircleOutline,
} from "@mui/icons-material";
import { ItemCard } from "./ItemCard";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { useState, useMemo, useEffect } from "react";
import { Checkbox } from "@mui/material";
import { StyledContainer } from "../common/StyledContainer";
import type { Conjunto, Item, Entity } from "../../types/gameModels";
import { EntityCard } from "../entity/EntityCard";
import { conjuntoRepository } from "../../repositories/ConjuntoRepository";
import { itemRepository } from "../../repositories/ItemRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { usePlatform } from "../../hooks/usePlatform";
import { theme } from "../../theme/theme";

export function ConjuntosPage() {
  const { gameId, category: urlCategory } = useParams<{
    gameId: string;
    category?: string;
  }>();
  const navigate = useNavigate();

  const { loading: dbLoading } = useApi(gameId);

  const [conjuntos, setConjuntos] = useState<Conjunto[]>([]);
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
      itemRepository.getAll(),
      entityRepository.getAll(),
    ])
      .then(([allConjuntos, allItems, allEntities]) => {
        if (!isMounted) return;
        setConjuntos(allConjuntos);
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

  const categories = useMemo(() => {
    const cats = new Set<string>();
    conjuntos.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats).sort();
  }, [conjuntos]);

  const filteredConjuntos = useMemo(() => {
    let list = [...conjuntos];

    if (urlCategory) {
      list = list.filter((c) => c.category === urlCategory);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.description?.toLowerCase().includes(lower),
      );
    }

    if (hideCompleted) {
      list = list.filter((conjunto) => {
        const items = conjunto.items || [];
        const entities = conjunto.entitys || [];
        const totalCount = items.length + entities.length;
        if (totalCount === 0) return true; // Keep empty sets? Or hide them? Usually keep them if they are work in progress.

        const collectedCount = [...items, ...entities].filter((id) =>
          collectedIds.has(id),
        ).length;

        return collectedCount < totalCount;
      });
    }

    return list;
  }, [conjuntos, urlCategory, searchTerm, hideCompleted, collectedIds]);

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

  const renderCategorySelection = () => (
    <Grid container spacing={isMobile ? 1 : 2}>
      {categories.map((cat) => (
        <Grid size={{ xs: 6, sm: 6, md: 4, lg: 3 }} key={cat}>
          <Card
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              backdropFilter: "blur(16px)",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "translateY(-6px)",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderColor: "primary.main",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              },
            }}
          >
            <CardActionArea
              onClick={() => navigate(`/game/${gameId}/conjuntos/${cat}`)}
              sx={{ p: isMobile ? 2 : 4 }}
            >
              <Stack alignItems={"center"} textAlign={"center"} spacing={1}>
                <Layers sx={{ fontSize: 48, color: "primary.main" }} />
                <Typography
                  variant={"subtitle2"}
                  fontSize={isMobile ? undefined : 24}
                  sx={{ fontWeight: 800 }}
                >
                  {cat}
                </Typography>
                <Typography
                  variant={"subtitle2"}
                  sx={{ color: "text.secondary" }}
                >
                  {conjuntos.filter((c) => c.category === cat).length} conjuntos
                </Typography>
              </Stack>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderConjuntosList = () => (
    <Stack spacing={isMobile ? 1 : 2}>
      {filteredConjuntos.map((conjunto) => {
        const totalCount =
          (conjunto.items?.length || 0) + (conjunto.entitys?.length || 0);
        const collectedCount = [
          ...(conjunto.items || []),
          ...(conjunto.entitys || []),
        ].filter((id) => collectedIds.has(id)).length;

        return (
          <Stack key={conjunto.id} spacing={isMobile ? 0.5 : 1}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              justifyContent={"space-between"}
            >
              <Typography
                variant={isMobile ? "h6" : "h5"}
                sx={{
                  fontWeight: 900,
                  color: "text.primary",
                  textAlign: "start",
                }}
              >
                {conjunto.name}
              </Typography>
              <Chip
                label={`${collectedCount} / ${totalCount}`}
                color={collectedCount === totalCount ? "success" : "primary"}
                variant={collectedCount === totalCount ? "filled" : "outlined"}
                sx={{ fontWeight: 800, borderRadius: 1 }}
              />
            </Stack>
            <Typography
              variant="body1"
              sx={{ color: "text.secondary", maxWidth: 800, mb: 1 }}
            >
              {conjunto.description}
            </Typography>

            <Grid container spacing={1}>
              {conjunto.items?.map((itemId) => {
                const item = itemMap.get(itemId);
                const isCollected = collectedIds.has(itemId);

                if (!item)
                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={itemId}>
                      <Card sx={{ p: 1 }}>
                        <Stack
                          flex={1}
                          spacing={1}
                          direction={"row"}
                          alignItems={"center"}
                          justifyContent={"space-between"}
                        >
                          <Typography variant="subtitle2">
                            {itemId.replaceAll("_", " ")}
                          </Typography>
                          <Checkbox
                            checked={isCollected}
                            onChange={() => toggleCollected(itemId)}
                          />
                        </Stack>
                      </Card>
                    </Grid>
                  );

                return (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={itemId}>
                    <Box sx={{ position: "relative", height: "100%" }}>
                      <ItemCard
                        key={item.id}
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
                          "&.Mui-checked": {
                            color: "success.main",
                          },
                          backgroundColor: "rgba(0,0,0,0.3)",
                          backdropFilter: "blur(4px)",
                          padding: "4px",
                          "&:hover": {
                            backgroundColor: "rgba(0,0,0,0.5)",
                          },
                        }}
                      />
                    </Box>
                  </Grid>
                );
              })}

              {conjunto.entitys?.map((entityId) => {
                const entity = entityMap.get(entityId);
                const isCollected = collectedIds.has(entityId);

                if (!entity)
                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={entityId}>
                      <Box sx={{ position: "relative" }}>
                        <Typography>{entityId}</Typography>
                        <Checkbox
                          checked={isCollected}
                          onChange={() => toggleCollected(entityId)}
                          sx={{ position: "absolute", top: 0, right: 0 }}
                        />
                      </Box>
                    </Grid>
                  );

                return (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={entityId}>
                    <Box sx={{ position: "relative", height: "100%" }}>
                      <EntityCard
                        key={entity.id}
                        entity={entity}
                        variant="compact"
                        onClick={() =>
                          navigate(`/game/${gameId}/entity/view/${entity.id}`)
                        }
                      />
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
                          "&.Mui-checked": {
                            color: "success.main",
                          },
                          backgroundColor: "rgba(0,0,0,0.3)",
                          backdropFilter: "blur(4px)",
                          padding: "4px",
                          "&:hover": {
                            backgroundColor: "rgba(0,0,0,0.5)",
                          },
                        }}
                      />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Stack>
        );
      })}
    </Stack>
  );

  return (
    <StyledContainer
      title={urlCategory ? `Conjuntos: ${urlCategory}` : "Conjuntos"}
      label={
        urlCategory
          ? `Explorando conjuntos de ${urlCategory}.`
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
          {!!urlCategory && (
            <Button
              sx={{ minWidth: "auto" }}
              startIcon={
                !isMobile ? <ArrowBack sx={{ fontSize: 20 }} /> : undefined
              }
            >
              {isMobile && <ArrowBack sx={{ fontSize: 20 }} />}
              {!isMobile && (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Voltar
                </Typography>
              )}
            </Button>
          )}
        </Stack>
      }
    >
      {urlCategory ? renderConjuntosList() : renderCategorySelection()}

      {filteredConjuntos.length === 0 && (
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
