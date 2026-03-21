import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Button,
  Chip,
  Avatar,
  Tooltip,
  Divider,
  Paper,
  Badge,
} from "@mui/material";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Entity, Item, ReferencePoints, Shop } from "../types/gameModels";
import { useApi } from "../hooks/useApi";
import MapIcon from "@mui/icons-material/Map";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GroupsIcon from "@mui/icons-material/Groups";
import ExploreIcon from "@mui/icons-material/Explore";
import StorefrontIcon from "@mui/icons-material/Storefront";
import InventoryIcon from "@mui/icons-material/Inventory";

interface MapDashboardProps {
  gameId: string;
  selectedMapId: string;
  onSelectEntity: (entityId: string) => void;
  onSwitchToMap: () => void;
}

export const MapDashboard = ({
  gameId,
  selectedMapId,
  onSelectEntity,
  onSwitchToMap,
}: MapDashboardProps) => {
  const navigate = useNavigate();
  const { raw: data } = useApi(gameId);

  const entities = (data?.entities || []) as Entity[];
  const referencePoints = (data?.referencePoints || []) as ReferencePoints[];
  const shops = (data?.shops || []) as Shop[];
  const itemLookup = useMemo(() => {
    const lookup: Record<string, Item> = {};
    data?.items?.forEach((i: Item) => (lookup[i.id] = i));
    return lookup;
  }, [data]);

  // Filtro de Pontos deste mapa
  const mapPoints = useMemo(() => {
    return referencePoints.filter((s) => !s.mapId || s.mapId === selectedMapId);
  }, [referencePoints, selectedMapId]);

  // Contagem de Ocorrências por Entidade
  const entityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mapPoints.forEach((s) => {
      counts[s.entityId] = (counts[s.entityId] || 0) + 1;
    });
    return counts;
  }, [mapPoints]);

  // Regiões (Biomas, POIs, Zonas)
  const regions = useMemo(() => {
    return referencePoints.filter((p) => {
      return ["location", "biome", "poi", "zone", "region"].includes(
        p.type?.toLowerCase() || "",
      );
    });
  }, [referencePoints]);

  // Entidades presentes no mapa (através de spawns)
  const mapEntities = useMemo(() => {
    const entityIds = new Set(mapPoints.map((s) => s.entityId));
    return entities.filter((e) => entityIds.has(e.id));
  }, [entities, mapPoints]);

  // Lojas presentes no mapa (baseado nos NPCs que têm spawn no mapa)
  const mapShops = useMemo(() => {
    const mapNpcIds = new Set(
      mapEntities
        .filter((e) => {
          const cats = Array.isArray(e.category)
            ? e.category
            : [e.category || ""];
          return cats.includes("npc");
        })
        .map((e) => e.id),
    );

    return shops.filter((s) => mapNpcIds.has(s.npcId));
  }, [shops, mapEntities]);

  // Agrupamento Global (para Visão Plana)
  const globalCategories = useMemo(() => {
    const categories: Record<string, Entity[]> = {};

    // Adicionar Lojas como uma categoria se existirem
    if (mapShops.length > 0) {
      // Criamos entidades virtuais para as lojas para reaproveitar o layout de grid
      categories["Lojas & Comércio"] = mapShops.map(
        (s) =>
          ({
            id: s.id,
            name: s.name,
            category: "shop",
            icon:
              entities.find((e) => e.id === s.npcId)?.icon ||
              "/img/icons/shop.png",
            description: `Aberta por ${entities.find((e) => e.id === s.npcId)?.name || s.npcId}.`,
          }) as any,
      );
    }

    mapEntities.forEach((e) => {
      let cat = "Outros";
      const cats = Array.isArray(e.category) ? e.category : [e.category || ""];
      if (cats.includes("npc")) cat = "Habitantes & NPCs";
      else if (cats.includes("resource")) cat = "Recursos & Coletáveis";
      else if (
        cats.some((c) => ["station", "crafter", "generator"].includes(c))
      )
        cat = "Instalações & Máquinas";
      else if (cats.includes("monster") || cats.includes("enemy"))
        cat = "Ameaças & Criaturas";

      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(e);
    });
    return categories;
  }, [mapEntities, mapShops, entities]);

  // Estatísticas Rápidas
  const stats = useMemo(
    () => ({
      totalSpawns: mapPoints.length,
      uniqueEntities: mapEntities.length,
      npcs: mapEntities.filter((e) => {
        const cats = Array.isArray(e.category)
          ? e.category
          : [e.category || ""];
        return cats.includes("npc");
      }).length,
      shops: mapShops.length,
      regions: regions.length,
    }),
    [mapPoints, mapEntities, mapShops, regions],
  );

  const hasRegions = regions.length > 0;

  return (
    <Box
      sx={{
        p: 4,
        pt: 8,
        height: "100%",
        overflowY: "auto",
        color: "text.primary",
        bgcolor: "#0b0b0b",
      }}
    >
      {/* Cabeçalho Adaptativo */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: 6 }}
        spacing={3}
      >
        <Box>
          <Typography
            variant="h3"
            fontWeight={900}
            gutterBottom
            sx={{ letterSpacing: "-1.5px" }}
          >
            {data?.gameInfo?.maps?.find((m: any) => m.id === selectedMapId)
              ?.name || "Dashboard"}
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ fontWeight: 400, maxWidth: 600 }}
          >
            {hasRegions
              ? "Exploração detalhada por zonas geográficas e biomas."
              : "Visão analítica completa de todos os recursos, NPCs e lojas mapeadas."}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<MapIcon />}
          onClick={onSwitchToMap}
          size="large"
          sx={{
            borderRadius: 3,
            px: 4,
            py: 2,
            textTransform: "none",
            fontWeight: 800,
            fontSize: "1.1rem",
            boxShadow: "0 8px 32px rgba(255, 68, 0, 0.3)",
          }}
        >
          Voltar ao Mapa Geográfico
        </Button>
      </Stack>

      {/* Cards de Estatísticas */}
      <Grid container spacing={2} sx={{ mb: 6 }}>
        {[
          {
            label: "Ocorrências",
            value: stats.totalSpawns,
            icon: <ExploreIcon />,
            color: "#ff4400",
          },
          {
            label: "Tipos Ouro",
            value: stats.uniqueEntities,
            icon: <MapIcon />,
            color: "#4caf50",
          },
          {
            label: "Habitantes",
            value: stats.npcs,
            icon: <GroupsIcon />,
            color: "#2196f3",
          },
          {
            label: "Lojas",
            value: stats.shops,
            icon: <StorefrontIcon />,
            color: "#ffc107",
          },
        ].map((stat, i) => (
          <Grid size={{ xs: 6, md: 3 }} key={i}>
            <Paper
              sx={{
                p: 2.5,
                bgcolor: "rgba(255,255,255,0.02)",
                border: 1,
                borderColor: "divider",
                borderRadius: 3,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    bgcolor: `${stat.color}15`,
                    color: stat.color,
                    width: 48,
                    height: 48,
                  }}
                >
                  {stat.icon}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={900}>
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.6, fontWeight: 700 }}
                  >
                    {stat.label.toUpperCase()}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mb: 6 }} />

      {/* Conteúdo Adaptativo */}
      {hasRegions ? (
        <Grid container spacing={3}>
          {regions
            .filter((r) => !r.parentId)
            .map((region) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={region.id}>
                <Card
                  sx={{
                    height: "100%",
                    bgcolor: "designTokens.colors.glassBg",
                    backdropFilter: "blur(16px)",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 4,
                    transition: "all 0.3s",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      sx={{ mb: 3 }}
                    >
                      <Avatar
                        src={region.icon}
                        variant="rounded"
                        sx={{
                          width: 56,
                          height: 56,
                          border: 1,
                          borderColor: "divider",
                        }}
                      />
                      <Box>
                        <Typography variant="h6" fontWeight={800}>
                          {region.name}
                        </Typography>
                        <Chip
                          label={String(
                            region.type || "Região",
                          ).toUpperCase()}
                          size="small"
                          color="primary"
                          sx={{
                            fontSize: "0.6rem",
                            height: 18,
                            fontWeight: 900,
                          }}
                        />
                      </Box>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{ mb: 4, opacity: 0.7, minHeight: 48 }}
                    >
                      {region.description || "Sem descrição disponível."}
                    </Typography>
                    <Stack spacing={2}>
                      {region.data?.potentialSpawns &&
                        region.data.potentialSpawns.length > 0 && (
                          <Box>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              sx={{ mb: 1.5 }}
                            >
                              <Typography
                                variant="caption"
                                fontWeight={900}
                                sx={{ color: "designTokens.colors.fieldLabel" }}
                              >
                                CONTEÚDO DA ÁREA
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ opacity: 0.5 }}
                              >
                                {region.data.potentialSpawns.length} itens
                              </Typography>
                            </Stack>
                            <Stack
                              direction="row"
                              spacing={1}
                              flexWrap="wrap"
                              useFlexGap
                            >
                              {region.data.potentialSpawns.slice(0, 10).map((ps: any) => (
                                <Tooltip
                                  key={ps.entityId}
                                  title={`${entities.find((e) => e.id === ps.entityId)?.name || ps.entityId}`}
                                  arrow
                                >
                                  <Avatar
                                    src={
                                      entities.find((e) => e.id === ps.entityId)
                                        ?.icon || itemLookup[ps.entityId]?.icon
                                    }
                                    sx={{
                                      width: 32,
                                      height: 32,
                                      cursor: "pointer",
                                      border: 1,
                                      borderColor: "divider",
                                      "&:hover": {
                                        borderColor: "primary.main",
                                      },
                                    }}
                                    onClick={() => onSelectEntity(ps.entityId)}
                                  />
                                </Tooltip>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      <Button
                        fullWidth
                        variant="outlined"
                        endIcon={<ChevronRightIcon />}
                        onClick={() => onSelectEntity(region.id)}
                        sx={{ mt: 2 }}
                      >
                        Ver Detalhes
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      ) : (
        <Stack spacing={8}>
          {Object.entries(globalCategories).map(([catName, catItems]) => (
            <Box key={catName}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ mb: 4 }}
                justifyContent={"space-between"}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 4 }}
                >
                  <Avatar
                    sx={{ bgcolor: "primary.main", width: 32, height: 32 }}
                  >
                    {catName.includes("Loja") ? (
                      <StorefrontIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <InventoryIcon sx={{ fontSize: 18 }} />
                    )}
                  </Avatar>
                  <Typography variant="h5" fontWeight={800}>
                    {catName}
                  </Typography>
                </Stack>
                <Chip
                  label={`${catItems.length} tipos`}
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 800 }}
                />
              </Stack>
              <Grid container spacing={2}>
                {catItems.map((entity) => {
                  const count = entityCounts[entity.id];
                  const isShop = catName.includes("Loja");
                  
                  const handleNavigate = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (isShop) {
                      navigate(`/game/${gameId}/shops/list/${entity.id}`);
                    } else if (entity.category === "npc" || (Array.isArray(entity.category) && entity.category.includes("npc"))) {
                      navigate(`/game/${gameId}/entity/view/${entity.id}`);
                    } else {
                      // Tenta decidir se é entidade comum ou item
                      const isCommonEntity = entities.some(ent => ent.id === entity.id);
                      if (isCommonEntity) {
                        navigate(`/game/${gameId}/entity/view/${entity.id}`);
                      } else {
                        navigate(`/game/${gameId}/item/view/${entity.id}`);
                      }
                    }
                  };

                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={entity.id}>
                      <Card
                        onClick={handleNavigate}
                        sx={{
                          cursor: "pointer",
                          bgcolor: "rgba(255,255,255,0.02)",
                          border: 1,
                          borderColor: "divider",
                          transition: "all 0.2s",
                          "&:hover": {
                            bgcolor: "rgba(255,255,255,0.05)",
                            borderColor: "primary.main",
                            transform: "translateY(-4px)",
                          },
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                          >
                            <Badge
                              badgeContent={count > 1 ? `x${count}` : null}
                              color="primary"
                              sx={{
                                "& .MuiBadge-badge": {
                                  fontWeight: 900,
                                  fontSize: "0.6rem",
                                },
                              }}
                            >
                              <Avatar
                                src={entity.icon}
                                variant="rounded"
                                sx={{
                                  width: 44,
                                  height: 44,
                                  bgcolor: "rgba(255,255,255,0.05)",
                                  border: 1,
                                  borderColor: "divider",
                                }}
                              />
                            </Badge>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="subtitle2"
                                noWrap
                                fontWeight={700}
                              >
                                {entity.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ opacity: 0.5, display: "block" }}
                              >
                                {isShop
                                  ? "Aberto agora"
                                  : Array.isArray(entity.category)
                                    ? entity.category[0]
                                    : entity.category}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};
