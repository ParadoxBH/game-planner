import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Grid,
  Stack,
  CircularProgress,
  Switch,
} from "@mui/material";
import {
  AutoAwesomeMosaic,
  Layers,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { useState, useMemo, useEffect } from "react";
import { StyledContainer } from "../common/StyledContainer";
import type { Conjunto, ConjuntoGroup } from "../../types/gameModels";
import { conjuntoRepository } from "../../repositories/ConjuntoRepository";
import { conjuntoGroupRepository } from "../../repositories/ConjuntoGroupRepository";
import { usePlatform } from "../../hooks/usePlatform";
import { getPublicUrl } from "../../utils/pathUtils";

export function ConjuntosPage() {
  const { gameId } = useParams<{
    gameId: string;
  }>();
  const navigate = useNavigate();

  const { loading: dbLoading, activeEventIds } = useApi(gameId);

  const [conjuntos, setConjuntos] = useState<Conjunto[]>([]);
  const [conjuntoGroups, setConjuntoGroups] = useState<ConjuntoGroup[]>([]);
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
    ])
      .then(([allConjuntos, allGroups]) => {
        if (!isMounted) return;
        setConjuntos(allConjuntos);
        setConjuntoGroups(allGroups);
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

  const filteredConjuntos = useMemo(() => {
    return conjuntos.filter((conjunto) => {
      // Get all groups for this set
      const groups = conjuntoGroups.filter((g) =>
        g.conjuntoIds?.includes(conjunto.id),
      );

      // 1. Search Filter (Set name OR any Group name)
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        const matchesSetName =
          conjunto.name.toLowerCase().includes(lower) ||
          conjunto.description?.toLowerCase().includes(lower);
        const matchesGroupName = groups.some((g) =>
          g.name.toLowerCase().includes(lower),
        );

        if (!matchesSetName && !matchesGroupName) return false;
      }

      // 2. Event Filter (Set must have at least one group matching active events)
      if (activeEventIds && activeEventIds.length > 0) {
        const matchesEvent = groups.some((group) => {
          if (!group.event || (Array.isArray(group.event) && group.event.length === 0)) return true;
          const eventArray = Array.isArray(group.event)
            ? group.event
            : [group.event];
          return eventArray.some((e) => activeEventIds.includes(e));
        });
        if (!matchesEvent) return false;
      }

      // 3. Hide Completed Filter
      if (hideCompleted) {
        let totalCount = 0;
        let collectedCount = 0;

        groups.forEach((group) => {
          const gItems = group.items || [];
          const gEntities = group.entitys || [];
          totalCount += gItems.length + gEntities.length;
          collectedCount += [...gItems, ...gEntities].filter((id) =>
            collectedIds.has(id),
          ).length;
        });

        if (totalCount > 0 && collectedCount === totalCount) return false;
      }

      return true;
    });
  }, [
    conjuntos,
    searchTerm,
    hideCompleted,
    collectedIds,
    activeEventIds,
    conjuntoGroups,
  ]);

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

  const renderConjuntoSelection = () => (
    <Grid container spacing={isMobile ? 1 : 2}>
      {filteredConjuntos.map((conjunto) => (
        <Grid size={{ xs: 6, sm: 6, md: 4, lg: 3 }} key={conjunto.id}>
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
              onClick={() => navigate(`/game/${gameId}/conjuntos/${conjunto.id}`)}
              sx={{ p: isMobile ? 2 : 4, height: 200 }}
            >
              <Stack alignItems={"center"} textAlign={"center"} spacing={1}>
                {conjunto.icon ? (
                  <Box sx={{ width: 48, height: 48, mb: 1 }}>
                    <img 
                      src={getPublicUrl(conjunto.icon)} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    />
                  </Box>
                ) : (
                  <Layers sx={{ fontSize: 48, color: "primary.main" }} />
                )}
                <Typography
                  variant={"subtitle2"}
                  fontSize={isMobile ? undefined : 20}
                  sx={{ fontWeight: 800 }}
                >
                  {conjunto.name}
                </Typography>
              </Stack>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <StyledContainer
      title="Conjuntos"
      label="Explore coleções e conjuntos de itens temáticos."
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar conjuntos..." }}
      actionsStart={
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
      }
    >
      {renderConjuntoSelection()}

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
