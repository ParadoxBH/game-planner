import {
  Typography,
  Grid,
  Stack,
  Button,
  Avatar,
  Tooltip,
  Box,
  CircularProgress,
} from "@mui/material";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Entity,
  Item,
  ReferencePoints,
  Shop,
  MapMetadata,
} from "../../types/gameModels";
import { useApi } from "../../hooks/useApi";
import { useTheme } from "@mui/material/styles";
import MapIcon from "@mui/icons-material/Map";
import GroupsIcon from "@mui/icons-material/Groups";
import ExploreIcon from "@mui/icons-material/Explore";
import StorefrontIcon from "@mui/icons-material/Storefront";
import InventoryIcon from "@mui/icons-material/Inventory";
import { StyledContainer } from "../common/StyledContainer";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";
import { itemRepository } from "../../repositories/ItemRepository";
import { entityRepository } from "../../repositories/EntityRepository";
import { shopRepository } from "../../repositories/ShopRepository";
import { mapRepository } from "../../repositories/MapRepository";
import { referencePointRepository } from "../../repositories/ReferencePointRepository";
import { categoryRepository } from "../../repositories/CategoryRepository";
import { getPublicUrl } from "../../utils/pathUtils";
import { usePlatform } from "../../hooks/usePlatform";
import { DetainItem } from "../common/DetainItem";
import { useEventFilter } from "../../context/EventFilterContext";

interface MapDashboardProps {
  gameId: string;
  selectedMapId: string;
  availableViews?: string[];
  onSelectEntity: (entityId: string) => void;
  onSwitchToMap: () => void;
}

export const MapDashboard = ({
  gameId,
  selectedMapId,
  availableViews = ["map", "dashboard"],
  onSelectEntity,
  onSwitchToMap,
}: MapDashboardProps) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { loading: dbLoading } = useApi(gameId);
  const { activeEventIds } = useEventFilter();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [referencePoints, setReferencePoints] = useState<ReferencePoints[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [maps, setMaps] = useState<MapMetadata[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const { isMobile } = usePlatform();

  const { spacing: dtSpacing, borderRadius: dtRadius } = theme.designTokens;

  // Fetch all data
  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    Promise.all([
      entityRepository.getAll(),
      referencePointRepository.getAll(),
      shopRepository.getAll(),
      mapRepository.getAll(),
      itemRepository.getAll(),
      categoryRepository.getAll(),
    ])
      .then(([allEntities, allRefPoints, allShops, allMaps, allItems, allCategories]) => {
        if (!isMounted) return;
        setEntities(allEntities);
        setReferencePoints(allRefPoints);
        setShops(allShops);
        setMaps(allMaps);
        setItems(allItems);
        
        const catMap: Record<string, string> = {};
        allCategories.forEach(c => catMap[c.id] = c.name);
        setCategoriesMap(catMap);
        
        setDataLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching map dashboard data:", err);
        if (isMounted) setDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dbLoading]);

  const itemLookup = useMemo(() => {
    const lookup: Record<string, Item> = {};
    items.forEach((i: Item) => (lookup[i.id] = i));
    return lookup;
  }, [items]);

  const filteredReferencePoints = useMemo(() => {
    return referencePoints.filter(s => {
      if (s.event) {
        const eventArray = Array.isArray(s.event) ? s.event : [s.event];
        return eventArray.some(e => activeEventIds.includes(e));
      }
      return true;
    });
  }, [referencePoints, activeEventIds]);

  const currentMap = useMemo(
    () => maps.find((m) => m.id === selectedMapId),
    [maps, selectedMapId],
  );

  // Filtro de Pontos deste mapa
  const mapPoints = useMemo(() => {
    return filteredReferencePoints.filter((s) => !s.mapId || s.mapId === selectedMapId);
  }, [filteredReferencePoints, selectedMapId]);

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
    return filteredReferencePoints.filter((p) => {
      return ["location", "biome", "poi", "zone", "region"].includes(
        p.type?.toLowerCase() || "",
      );
    });
  }, [filteredReferencePoints]);

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

    if (mapShops.length > 0) {
      categories["Lojas & Comércio"] = mapShops.map(
        (s) =>
          ({
            id: s.id,
            name: s.name,
            category: "shop",
            icon:
              entities.find((e) => e.id === s.npcId)?.icon ||
              getPublicUrl("/img/icons/shop.png"),
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

  return (
    <StyledContainer
      title={currentMap?.name || "Dashboard"}
      label={
        hasRegions
          ? "Exploração detalhada por zonas geográficas e biomas."
          : "Visão analítica completa de todos os recursos, NPCs e lojas mapeadas."
      }
      actionsEnd={
        availableViews.includes("map") && (
          <Button
            variant="contained"
            startIcon={<MapIcon />}
            onClick={onSwitchToMap}
            size="small"
            sx={{
              borderRadius: 2,
              px: 3,
              textTransform: "none",
              fontWeight: 700,
              flex: isMobile ? 1 : undefined,
            }}
          >
            Voltar para o Mapa
          </Button>
        )
      }
    >
      <Stack flex={1} spacing={1} sx={{ overflowY: "auto" }}>
        {/* Cards de Estatísticas */}
        <Grid container spacing={dtSpacing.itemGap}>
          {[
            {
              label: "Ocorrências",
              value: stats.totalSpawns,
              icon: <ExploreIcon />,
              color: "primary.main",
            },
            {
              label: "Entidades",
              value: stats.uniqueEntities,
              icon: <MapIcon />,
              color: "success.main",
            },
            {
              label: "Habitantes",
              value: stats.npcs,
              icon: <GroupsIcon />,
              color: "info.main",
            },
            {
              label: "Lojas",
              value: stats.shops,
              icon: <StorefrontIcon />,
              color: "warning.main",
            },
          ].map((stat, i) => (
            <Grid size={{ xs: 6, md: 3 }} key={i}>
              <DataCard
                sx={{ p: dtSpacing.cardPadding, borderRadius: dtRadius }}
              >
                <Stack
                  direction="row"
                  spacing={dtSpacing.itemGap}
                  alignItems="center"
                >
                  <Avatar
                    sx={{
                      bgcolor: "rgba(255,255,255,0.03)",
                      color: stat.color,
                      width: 40,
                      height: 40,
                      border: 1,
                      borderColor: "divider",
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                  <Stack>
                    <Typography
                      variant="h6"
                      fontWeight={900}
                      sx={{ lineHeight: 1 }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ opacity: 0.5, fontWeight: 700, fontSize: "0.6rem" }}
                    >
                      {stat.label}
                    </Typography>
                  </Stack>
                </Stack>
              </DataCard>
            </Grid>
          ))}
        </Grid>
        {/* Conteúdo Adaptativo */}
            {Object.entries(globalCategories).map(([catName, catItems]) => (
              <DetainItem
                size={isMobile ? undefined : 6}
                startIcon={
                  <Avatar
                    sx={{
                      bgcolor: "rgba(255,255,255,0.03)",
                      width: 32,
                      height: 32,
                      border: 1,
                      borderColor: "divider",
                      color: "primary.main",
                    }}
                  >
                    {catName.includes("Loja") ? (
                      <StorefrontIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <InventoryIcon sx={{ fontSize: 18 }} />
                    )}
                  </Avatar>
                }
                label={catName}
                count={catItems.length}
              >
                <Grid container spacing={dtSpacing.itemGap}>
                  {catItems.map((entity) => {
                    const count = entityCounts[entity.id];
                    const isShop = catName.includes("Loja");

                    const handleNavigate = (e?: React.MouseEvent) => {
                      if (e) e.stopPropagation();
                      if (isShop) {
                        navigate(`/game/${gameId}/shops/list/${entity.id}`);
                      } else if (
                        entity.category === "npc" ||
                        (Array.isArray(entity.category) &&
                          entity.category.includes("npc"))
                      ) {
                        navigate(`/game/${gameId}/entity/view/${entity.id}`);
                      } else {
                        const isCommonEntity = entities.some(
                          (ent) => ent.id === entity.id,
                        );
                        if (isCommonEntity) {
                          navigate(`/game/${gameId}/entity/view/${entity.id}`);
                        } else {
                          navigate(`/game/${gameId}/item/view/${entity.id}`);
                        }
                      }
                    };

                    return (
                      <Grid
                        size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                        key={entity.id}
                      >
                        <DataCard
                          hoverable
                          onClick={() => handleNavigate()}
                          sx={{
                            p: dtSpacing.cardPadding,
                            overflow: "hidden",
                            borderRadius: dtRadius,
                          }}
                        >
                          {/* Background Icon Effect */}
                          <Stack
                            sx={{
                              position: "absolute",
                              right: -10,
                              bottom: -10,
                              width: 80,
                              height: 80,
                              opacity: 0.04,
                              filter: "grayscale(1) brightness(1.5)",
                              zIndex: 0,
                              pointerEvents: "none",
                              backgroundImage: `url(${getPublicUrl(entity.icon || entity.image)})`,
                              backgroundSize: "contain",
                              backgroundRepeat: "no-repeat",
                            }}
                          />

                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{ zIndex: 1, width: "100%" }}
                          >
                            <Avatar
                              src={getPublicUrl(entity.image || entity.icon!)}
                              variant="rounded"
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: "rgba(255,255,255,0.03)",
                                border: 1,
                                borderColor: "divider",
                              }}
                            />
                            <Stack sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                variant="subtitle2"
                                noWrap
                                fontWeight={700}
                                textAlign={"left"}
                                sx={{ lineHeight: 1.2 }}
                              >
                                {entity.name}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <Typography
                                  variant="caption"
                                  sx={{ opacity: 0.5, fontWeight: 500 }}
                                >
                                  {isShop
                                    ? "Disponível"
                                    : (() => {
                                        const rawCat = Array.isArray(entity.category) ? entity.category[0] : entity.category;
                                        return categoriesMap[rawCat || ""] || rawCat || "Geral";
                                      })()}
                                </Typography>
                                {count > 1 && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "primary.main",
                                      fontWeight: 800,
                                    }}
                                  >
                                    x{count}
                                  </Typography>
                                )}
                              </Stack>
                            </Stack>
                          </Stack>
                        </DataCard>
                      </Grid>
                    );
                  })}
                </Grid>
              </DetainItem>
            ))}
      </Stack>
    </StyledContainer>
  );
};
