import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Grid,
  Stack,
  Divider,
  Chip,
  CircularProgress,
} from "@mui/material";
import { AutoAwesomeMosaic, Layers, ArrowBack, CheckCircle, CheckCircleOutline } from "@mui/icons-material";
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

  // Load data
  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    Promise.all([
      conjuntoRepository.getAll(),
      itemRepository.getAll(),
      entityRepository.getAll()
    ]).then(([allConjuntos, allItems, allEntities]) => {
      if (!isMounted) return;
      setConjuntos(allConjuntos);
      setItems(allItems);
      setEntities(allEntities);
      setDataLoading(false);
    }).catch(err => {
      console.error("Error fetching conjuntos data:", err);
      if (isMounted) setDataLoading(false);
    });

    return () => { isMounted = false; };
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

  // Save to localStorage whenever collectedIds changes
  const toggleCollected = (id: string) => {
    setCollectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(`gp_collected_${gameId}`, JSON.stringify(Array.from(next)));
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

    return list;
  }, [conjuntos, urlCategory, searchTerm]);

  if (dbLoading || dataLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  const renderCategorySelection = () => (
    <Grid container spacing={3}>
      {categories.map((cat) => (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={cat}>
          <Card
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              backdropFilter: "blur(16px)",
              borderRadius: 2,
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
              sx={{ p: 4, textAlign: "center" }}
            >
              <Layers sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {cat}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mt: 1 }}
              >
                {conjuntos.filter((c) => c.category === cat).length}{" "}
                conjuntos
              </Typography>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderConjuntosList = () => (
    <Stack spacing={4}>
      {filteredConjuntos.map((conjunto) => {
        const totalCount = (conjunto.items?.length || 0) + (conjunto.entitys?.length || 0);
        const collectedCount = [
          ...(conjunto.items || []),
          ...(conjunto.entitys || [])
        ].filter(id => collectedIds.has(id)).length;

        return (
          <Stack key={conjunto.id} spacing={1}>
            <Stack direction="row" alignItems="center" spacing={2} justifyContent={"space-between"}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 900, color: "text.primary" }}
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
                      <Box sx={{ position: 'relative' }}>
                        <Typography>{itemId}</Typography>
                        <Checkbox
                          checked={isCollected}
                          onChange={() => toggleCollected(itemId)}
                          sx={{ position: 'absolute', top: 0, right: 0 }}
                        />
                      </Box>
                    </Grid>
                  );

                return (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={itemId}>
                    <Box sx={{ position: 'relative', height: '100%' }}>
                      <ItemCard
                        key={item.id}
                        item={item}
                        gameId={gameId || ""}
                        variant="compact"
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
                          position: 'absolute', 
                          top: 4, 
                          right: 4, 
                          zIndex: 10,
                          color: isCollected ? 'success.main' : 'rgba(255,255,255,0.2)',
                          '&.Mui-checked': {
                            color: 'success.main',
                          },
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          backdropFilter: 'blur(4px)',
                          padding: '4px',
                          '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.5)',
                          }
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
                       <Box sx={{ position: 'relative' }}>
                        <Typography>{entityId}</Typography>
                        <Checkbox
                          checked={isCollected}
                          onChange={() => toggleCollected(entityId)}
                          sx={{ position: 'absolute', top: 0, right: 0 }}
                        />
                      </Box>
                    </Grid>
                  );

                return (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={entityId}>
                    <Box sx={{ position: 'relative', height: '100%' }}>
                      <EntityCard
                        key={entity.id}
                        entity={entity}
                        variant="compact"
                        onClick={() => navigate(`/game/${gameId}/entity/view/${entity.id}`)}
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
                          position: 'absolute', 
                          top: 4, 
                          right: 4, 
                          zIndex: 10,
                          color: isCollected ? 'success.main' : 'rgba(255,255,255,0.2)',
                          '&.Mui-checked': {
                            color: 'success.main',
                          },
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          backdropFilter: 'blur(4px)',
                          padding: '4px',
                          '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.5)',
                          }
                        }}
                      />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
            <Divider sx={{ mt: 6, borderColor: "rgba(255,255,255,0.05)" }} />
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
      actionsEnd={
        urlCategory ? (
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <CardActionArea
              onClick={() => navigate(`/game/${gameId}/conjuntos`)}
              sx={{
                display: "flex",
                alignItems: "center",
                width: "auto",
                p: 1,
                borderRadius: 1,
              }}
            >
              <ArrowBack sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                VOLTAR PARA CATEGORIAS
              </Typography>
            </CardActionArea>
          </Box>
        ) : undefined
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
