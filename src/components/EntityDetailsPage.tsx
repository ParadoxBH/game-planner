import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Divider,
  Breadcrumbs,
  Tooltip,
} from "@mui/material";
import {
  NavigateNext,
  Map as MapIcon,
  Inventory,
  EmojiEvents,
  List as ListIcon,
  Construction,
  Storefront
} from "@mui/icons-material";
import { useApi } from "../hooks/useApi";
import { StyledContainer } from "./common/StyledContainer";
import { ItemChip } from "./common/ItemChip";
import { RecipeCard } from "./recipes/RecipeCard";
import { useMemo } from "react";
import type { MapMetadata, Spawn, GameInfo, GameDataTypes } from "../types/gameModels";
import { MiniMap } from "./common/MiniMap";
import { DataCard } from "./common/DataCard";
import { DataChip } from "./common/DataChip";

export function EntityDetailsPage() {
  const { gameId, entityId = "" } = useParams<{ gameId: string; entityId: string }>();
  const navigate = useNavigate();

  const { loading, getEntityDetails, raw } = useApi(gameId);

  const entityDetails = useMemo(() => getEntityDetails(entityId), [getEntityDetails, entityId]);

  const gameInfo = raw?.gameInfo as GameInfo | undefined;

  const groupedSpawns = useMemo(() => {
    if (!entityDetails?.spawns) return new Map<string, Spawn[]>();
    const map = new Map<string, Spawn[]>();
    entityDetails.spawns.forEach((s: any) => {
      const mapId = s.mapId || "Mundo Aberto";
      if (!map.has(mapId)) map.set(mapId, []);
      map.get(mapId)!.push(s);
    });
    return map;
  }, [entityDetails?.spawns]);

  const getMapMetadata = (mapId: string): MapMetadata | undefined => {
    return gameInfo?.maps?.find(m => m.id === mapId);
  };

  const eventsMap = useMemo(() => {
    const map = new Map<string, string>();
    if (raw?.events) raw.events.forEach((e) => map.set(e.id, e.name));
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

  if (!entityDetails) {
    return (
      <StyledContainer
        title="Entidade não encontrada"
        label="A entidade solicitada não existe no banco de dados."
      >
        <Typography>Verifique o ID ou retorne à lista de entidades.</Typography>
      </StyledContainer>
    );
  }

  const { entity, drops, recipes } = entityDetails;
  const sizeEntityCard = 300;

  return (
    <StyledContainer
      title={entity.name}
      label={`Detalhes e localizações`}
      actionsStart={
        <Box>
          <Breadcrumbs
            separator={<NavigateNext fontSize="small" />}
          >
            <Link
              to={`/game/${gameId}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Dashboard
            </Link>
            <Link
              to={`/game/${gameId}/entity/list`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              Entidades
            </Link>
            <Typography color="primary">{entity.name}</Typography>
          </Breadcrumbs>
        </Box>
      }
    >
      <Stack direction="row" spacing={4} flex={1} overflow="hidden">
        <Stack 
          spacing={2} 
          sx={{
            overflowY: "auto", 
            overflowX: "hidden", 
            width: sizeEntityCard,
            minWidth: sizeEntityCard,
            height: "100%",
            pr: 1
          }}
        >
          {/* Info Principal */}
          <Paper elevation={0} sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <Box sx={{ 
                    width: 120, 
                    height: 120, 
                    borderRadius: 2, 
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden'
                }}>
                    {entity.icon ? (
                        <img 
                          src={entity.icon} 
                          alt={entity.name} 
                          style={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                        />
                    ) : (
                        <EmojiEvents sx={{ fontSize: 64, color: 'rgba(255, 255, 255, 0.1)' }} />
                    )}
                </Box>
            </Box>
            <Typography 
              variant="h5" 
              fontWeight={800} 
              color="primary.main"
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 1.5,
                lineHeight: 1.2
              }}
            >
              {entity.name}
              {entityDetails.shop && (
                <Tooltip title="Este NPC possui uma loja">
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    backgroundColor: 'rgba(255, 68, 0, 0.15)', 
                    p: 0.5, 
                    borderRadius: 1,
                    animation: 'pulse-glow 2s infinite ease-in-out',
                    '@keyframes pulse-glow': {
                      '0%': { boxShadow: '0 0 0 0 rgba(255, 68, 0, 0.4)' },
                      '70%': { boxShadow: '0 0 0 6px rgba(255, 68, 0, 0)' },
                      '100%': { boxShadow: '0 0 0 0 rgba(255, 68, 0, 0)' }
                    }
                  }}>
                    <Storefront sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
                  </Box>
                </Tooltip>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              ID: {entity.id}
            </Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={1.5} textAlign="left">
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Categoria
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {Array.isArray(entity.category)
                    ? entity.category.join(", ")
                    : entity.category || "N/A"}
                </Typography>
              </Box>
              
              {/* @ts-ignore */}
              {entity.description && (
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Descrição
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                    {/* @ts-ignore */}
                    {entity.description}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Seção de Loja */}
          {entityDetails.shop && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Storefront color="primary" sx={{ fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={800}>Possui Loja</Typography>
              </Stack>
              
              <DataCard
                onClick={() => navigate(`/game/${gameId}/shops/list/${entityDetails.shop?.id}`)}
                sx={{
                  justifyContent: "space-between",
                  p: 1.5,
                  "&:hover": {
                    backgroundColor: "rgba(255, 68, 0, 0.1)",
                  },
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      bgcolor: "rgba(255, 68, 0, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Storefront sx={{ fontSize: 20, color: "primary.main" }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {entityDetails.shop.name || "Visitar Loja"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Produtos Disponíveis
                    </Typography>
                  </Box>
                </Stack>
                <DataChip label="Abrir" color="primary" />
              </DataCard>
            </Paper>
          )}

          {/* Requisitos */}
          {entity.requirements && entity.requirements.length > 0 && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <ListIcon color="primary" sx={{ fontSize: 18 }} />
                    <Typography variant="subtitle2" fontWeight={800}>Requisitos</Typography>
                </Stack>
                <Stack spacing={1}>
                    {entity.requirements.map((req, idx) => (
                        <Box 
                          key={idx} 
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            p: 1,
                            borderRadius: 1,
                            bgcolor: 'rgba(255,255,255,0.02)'
                          }}
                        >
                            <ItemChip id={req.itemId} size="small" />
                            <Typography variant="body2" fontWeight={800} color="primary.main">x{req.quant}</Typography>
                        </Box>
                    ))}
                </Stack>
            </Paper>
          )}
        </Stack>

        <Stack spacing={2} overflow={"auto"} flex={1}>
          {/* Drops */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Inventory color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Drops
              </Typography>
            </Stack>
            {drops && drops.length > 0 ? (
              <Grid container spacing={2}>
                {drops.map((drop, idx) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                    <Box sx={{ 
                        p: 1.5, 
                        backgroundColor: 'rgba(255,255,255,0.02)', 
                        borderRadius: 2, 
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5
                    }}>
                        <ItemChip id={drop.item?.id || ""} icon={drop.item?.icon} size="medium" />
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                {drop.item?.name || drop.item?.id || "Item Desconhecido"}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                    Qtde: {drop.quant}{drop.maxQuant ? `-${drop.maxQuant}` : ''}
                                </Typography>
                                <Typography variant="caption" color="primary.main" fontWeight={800}>
                                    ({(drop.chance * 100).toFixed(0)}%)
                                </Typography>
                            </Stack>
                        </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Esta entidade não possui drops conhecidos.
              </Typography>
            )}
          </Paper>

          {/* Como Fabricar */}
          {recipes && recipes.length > 0 && (
            <Paper elevation={0} sx={{ p: 2 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Construction color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Como Fabricar
                </Typography>
              </Stack>
              <Grid container spacing={2}>
                {recipes.map((recipe) => (
                  <Grid size={{ xs: 12, lg: 6 }} key={recipe.id}>
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
            </Paper>
          )}

          {/* Localizações (Spawns) */}
          <Paper elevation={0} sx={{ p: 2 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <MapIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Localizações
              </Typography>
            </Stack>
            {groupedSpawns.size > 0 ? (
              <Grid container spacing={3}>
                {Array.from(groupedSpawns.entries()).map(([mapId, mapSpawns]) => {
                  const meta = getMapMetadata(mapId);

                  return (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={mapId}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          backgroundColor: 'rgba(255,255,255,0.02)', 
                          borderRadius: 2, 
                          border: '1px solid rgba(255,255,255,0.05)',
                          overflow: 'hidden'
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                                    {meta?.name || mapId}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {mapSpawns.length} Ocorrência(s)
                                </Typography>
                            </Box>
                            <MapIcon sx={{ opacity: 0.3 }} />
                        </Stack>

                        <Box sx={{ 
                            height: 200, 
                            width: '100%', 
                            borderRadius: 1, 
                            border: '1px solid rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                            position: 'relative',
                            cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/game/${gameId}/map?entity=${entity.id}&mapId=${mapId}`)}
                        >
                        <Box sx={{ flexGrow: 1 }}>
                          {meta ? (
                            <MiniMap 
                                meta={meta}
                                markers={mapSpawns.map(s => ({
                                    id: s.id,
                                    position: gameId === 'satisfactory' ? [s.position[0], s.position[1]] : s.position as [number, number],
                                    color: '#ff4400'
                                }))}
                                onClick={() => navigate(`/game/${gameId}/map?entity=${entity.id}&mapId=${mapId}`)}
                                height={200}
                            />
                          ) : (
                            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary">Mapa não encontrado</Typography>
                            </Box>
                          )}
                        </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma localização de spawn encontrada para esta entidade.
              </Typography>
            )}
          </Paper>
        </Stack>
      </Stack>
    </StyledContainer>
  );
}
