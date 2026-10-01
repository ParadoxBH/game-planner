import {
  Box,
  Typography,
  Stack,
  IconButton,
  Checkbox,
  FormControlLabel,
  Divider,
  Button,
  Chip,
  List,
  ListItem,
  Slide,
  Paper,
  Collapse,
  Tooltip,
  darken,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import DeselectIcon from "@mui/icons-material/Deselect";
import { useState } from "react";
import type {
  LocationDocument,
  MapMarker,
  MarkerOccupant,
} from "../../api/content";
import { mediaUrl } from "../../api/references";
import { MapFilterDrawerItem } from "./MapFilterDrawerItem";
import { listRowSx } from "../../theme/listRowSx";

export const SPAWN_TYPE = "spawn";
export const UNCATEGORIZED = "desconhecido";

const TYPE_LABELS: Record<string, string> = {
  spawn: "Pontos de spawn",
  region: "Regiões",
  biome: "Biomas",
  poi: "Pontos de interesse",
  dungeon: "Masmorras",
  spawner: "Geradores de criaturas",
  location: "Localizações",
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function locationTypeOf(location: LocationDocument): string {
  return location.locationType ?? "region";
}

/** Chave do filtro de uma categoria de local dentro de um tipo: "region|rio". */
export function locationCategoryKey(type: string, category: string): string {
  return `${type}|${category}`;
}

/** Chaves de filtro de um local: uma por categoria, ou a de "sem categoria". */
export function locationFilterKeys(location: LocationDocument): string[] {
  const type = locationTypeOf(location);
  const categories = location.categories ?? [];
  return categories.length > 0
    ? categories.map((category) => locationCategoryKey(type, category))
    : [locationCategoryKey(type, UNCATEGORIZED)];
}

/** Categoria usada no filtro: a principal do ocupante (a API a manda primeiro), ou a primeira. */
export function occupantCategory(occupant: MarkerOccupant): string {
  return occupant.categories[0] ?? UNCATEGORIZED;
}

export interface FilterEntity {
  count: number;
  name: string;
  iconMediaId: string | null;
}

export interface FilterStats {
  types: [string, number][];
  /**
   * Categorias dos locais de cada tipo, com as contagens. Só aparece o tipo em que algum local tem
   * categoria; os sem categoria entram como UNCATEGORIZED.
   */
  locationCategories: Record<string, [string, number][]>;
  categories: [
    string,
    { count: number; entities: Record<string, FilterEntity> },
  ][];
}

/** Tipos (spawn e tipos de local) e categorias com os ocupantes de cada uma, com as contagens. */
export function computeFilterStats(
  markers: MapMarker[],
  locations: LocationDocument[],
): FilterStats {
  const typeCount: Record<string, number> = {};
  if (markers.length > 0) typeCount[SPAWN_TYPE] = markers.length;
  const typeCategories: Record<string, Record<string, number>> = {};
  locations.forEach((location) => {
    const type = locationTypeOf(location);
    typeCount[type] = (typeCount[type] ?? 0) + 1;
    const counts = (typeCategories[type] ??= {});
    const categories = location.categories ?? [];
    (categories.length > 0 ? categories : [UNCATEGORIZED]).forEach(
      (category) => {
        counts[category] = (counts[category] ?? 0) + 1;
      },
    );
  });
  const locationCategories: Record<string, [string, number][]> = {};
  Object.entries(typeCategories).forEach(([type, counts]) => {
    if (Object.keys(counts).some((category) => category !== UNCATEGORIZED)) {
      locationCategories[type] = Object.entries(counts).sort(
        (a, b) => b[1] - a[1],
      );
    }
  });

  const categories: Record<
    string,
    { count: number; entities: Record<string, FilterEntity> }
  > = {};
  markers.forEach((marker) =>
    marker.occupants.forEach((occupant) => {
      const category = occupantCategory(occupant);
      if (!categories[category])
        categories[category] = { count: 0, entities: {} };
      const group = categories[category];
      group.count++;
      if (!group.entities[occupant.extId]) {
        group.entities[occupant.extId] = {
          count: 0,
          name: occupant.name ?? occupant.extId,
          iconMediaId: occupant.iconMediaId,
        };
      }
      group.entities[occupant.extId].count++;
    }),
  );

  return {
    types: Object.entries(typeCount).sort((a, b) => b[1] - a[1]),
    locationCategories,
    categories: Object.entries(categories).sort(
      (a, b) => b[1].count - a[1].count,
    ),
  };
}

interface MapFilterDrawerProps {
  stats: FilterStats;
  categoryNames: Map<string, string>;
  visibleTypes: string[];
  setVisibleTypes: (types: string[]) => void;
  /** Chaves de locationCategoryKey visíveis. */
  visibleLocationCategories: string[];
  setVisibleLocationCategories: (keys: string[]) => void;
  visibleCategories: string[];
  setVisibleCategories: (categories: string[]) => void;
  visibleEntities: string[];
  setVisibleEntities: (entities: string[]) => void;
  hideCollected: boolean;
  setHideCollected: (hide: boolean) => void;
}

export const MapFilterDrawer = ({
  stats,
  categoryNames,
  visibleTypes,
  setVisibleTypes,
  visibleLocationCategories,
  setVisibleLocationCategories,
  visibleCategories,
  setVisibleCategories,
  visibleEntities,
  setVisibleEntities,
  hideCollected,
  setHideCollected,
}: MapFilterDrawerProps) => {
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>(
    {},
  );

  const categoryLabel = (category: string) =>
    categoryNames.get(category) ?? category.replace(/_/g, " ");

  const locationCategoryLabel = (category: string) =>
    category === UNCATEGORIZED ? "Sem categoria" : categoryLabel(category);
  const childKeysOf = (type: string) =>
    (stats.locationCategories[type] ?? []).map(([category]) =>
      locationCategoryKey(type, category),
    );

  const toggleType = (type: string) => {
    const childKeys = childKeysOf(type);
    if (visibleTypes.includes(type)) {
      setVisibleTypes(visibleTypes.filter((t) => t !== type));
      setVisibleLocationCategories(
        visibleLocationCategories.filter((key) => !childKeys.includes(key)),
      );
    } else {
      setVisibleTypes([...visibleTypes, type]);
      setVisibleLocationCategories(
        Array.from(new Set([...visibleLocationCategories, ...childKeys])),
      );
    }
  };

  const toggleLocationCategory = (type: string, key: string) => {
    const next = visibleLocationCategories.includes(key)
      ? visibleLocationCategories.filter((other) => other !== key)
      : [...visibleLocationCategories, key];
    setVisibleLocationCategories(next);

    // O tipo acompanha as categorias: marcado se alguma está visível.
    const anyVisible = childKeysOf(type).some((childKey) =>
      next.includes(childKey),
    );
    if (anyVisible && !visibleTypes.includes(type))
      setVisibleTypes([...visibleTypes, type]);
    else if (!anyVisible && visibleTypes.includes(type))
      setVisibleTypes(visibleTypes.filter((t) => t !== type));
  };

  const toggleCategory = (category: string) => {
    const categoryData = stats.categories.find(([cat]) => cat === category);
    if (!categoryData) return;
    const childEntityIds = Object.keys(categoryData[1].entities);

    if (visibleCategories.includes(category)) {
      setVisibleCategories(visibleCategories.filter((c) => c !== category));
      setVisibleEntities(
        visibleEntities.filter((id) => !childEntityIds.includes(id)),
      );
    } else {
      setVisibleCategories([...visibleCategories, category]);
      setVisibleEntities(
        Array.from(new Set([...visibleEntities, ...childEntityIds])),
      );
    }
  };

  const toggleEntity = (entityId: string, parentCategory: string) => {
    const next = visibleEntities.includes(entityId)
      ? visibleEntities.filter((id) => id !== entityId)
      : [...visibleEntities, entityId];
    setVisibleEntities(next);

    // A categoria acompanha os filhos: marcada se algum está visível.
    const categoryData = stats.categories.find(
      ([cat]) => cat === parentCategory,
    );
    if (categoryData) {
      const anyVisible = Object.keys(categoryData[1].entities).some((id) =>
        next.includes(id),
      );
      if (anyVisible && !visibleCategories.includes(parentCategory)) {
        setVisibleCategories([...visibleCategories, parentCategory]);
      } else if (!anyVisible && visibleCategories.includes(parentCategory)) {
        setVisibleCategories(
          visibleCategories.filter((c) => c !== parentCategory),
        );
      }
    }
  };

  const selectAll = () => {
    setVisibleTypes(stats.types.map((t) => t[0]));
    setVisibleLocationCategories(
      stats.types.flatMap(([type]) => childKeysOf(type)),
    );
    setVisibleCategories(stats.categories.map((c) => c[0]));
    setVisibleEntities(
      Array.from(
        new Set(
          stats.categories.flatMap(([, data]) => Object.keys(data.entities)),
        ),
      ),
    );
  };

  const clearAll = () => {
    setVisibleTypes([]);
    setVisibleLocationCategories([]);
    setVisibleCategories([]);
    setVisibleEntities([]);
  };

  return (
    <>
      <Tooltip title="Filtros" placement="left">
        <Button
          sx={{
            position: "absolute",
            left: 10,
            top: 10,
            height: 34,
            width: 34,
            minHeight: "auto",
            minWidth: "auto",
            color: "black",
            zIndex: 1100,
            bgcolor: "rgba(255,255,255)",
            borderRadius: 0.5,
            p: 0.5,
            border: "2px solid rgba(0, 0, 0, 0.2)",
            backgroundClip: "padding-box",
            "&:hover": { bgcolor: darken("rgba(255,255,255)", 0.1) },
          }}
          onClick={() => setOpen(true)}
          variant="contained"
          color="inherit"
        >
          <FilterListIcon />
        </Button>
      </Tooltip>
      <Slide direction="right" in={open} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: { xs: "100%", sm: 320 },
            maxWidth: "100%",
            height: "100%",
            zIndex: 1200,
            backgroundColor: "designTokens.colors.glassBg",
            backdropFilter: "blur(24px)",
            borderRight: 1,
            borderRadius: 0,
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterListIcon color="primary" />
              <Typography variant="h6" sx={{ fontSize: "1rem" }}>
                Filtros
              </Typography>
            </Stack>
            <IconButton onClick={() => setOpen(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Divider />

          <Stack direction="row" spacing={1} sx={{ p: 1.5 }}>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<SelectAllIcon />}
              onClick={selectAll}
              sx={{ fontSize: "0.7rem" }}
            >
              Todos
            </Button>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<DeselectIcon />}
              onClick={clearAll}
              sx={{ fontSize: "0.7rem" }}
            >
              Nenhum
            </Button>
          </Stack>

          <Divider />

          <Box sx={{ px: 2, py: 1.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={hideCollected}
                  onChange={(event) => setHideCollected(event.target.checked)}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                  Ocultar coletados
                </Typography>
              }
            />
          </Box>

          <Divider />

          <Box sx={{ flexGrow: 1, overflowY: "auto", p: 1.5 }}>
            <Typography
              variant="subtitle2"
              color="primary"
              gutterBottom
              sx={{
                textTransform: "uppercase",
                fontSize: "0.65rem",
                mb: 1.5,
                opacity: 0.7,
                ml: 1,
              }}
            >
              Tipos
            </Typography>
            <List dense disablePadding sx={{ mb: 3 }}>
              {stats.types.map(([type, count], index) => {
                const children = stats.locationCategories[type] ?? [];
                const childKeys = childKeysOf(type);
                const visibleChildren = childKeys.filter((key) =>
                  visibleLocationCategories.includes(key),
                );
                const hasChildren = children.length > 0;
                const isExpanded = !!expandedTypes[type];

                return (
                  <MapFilterDrawerItem
                    key={type}
                    onExpand={() =>
                      setExpandedTypes((prev) => ({
                        ...prev,
                        [type]: !prev[type],
                      }))
                    }
                    isExpanded={isExpanded}
                    sx={listRowSx({ index })}
                    max={childKeys.length}
                    count={hasChildren ? visibleChildren?.length : visibleTypes.includes(type) ? 1 : 0}
                    onClick={() => toggleType(type)}
                    label={typeLabel(type)}
                    chip={count}
                  >
                    {hasChildren && (
                      <List dense disablePadding>
                        {children.map(([category, categoryCount], childIndex) => {
                          const key = locationCategoryKey(type, category);
                          return (
                            <MapFilterDrawerItem
                              key={key}
                              onExpand={() =>
                                setExpandedTypes((prev) => ({
                                  ...prev,
                                  [type]: !prev[type],
                                }))
                              }
                              isExpanded={isExpanded}
                              count={
                                visibleLocationCategories.includes(key)
                                  ? categoryCount
                                  : 0
                              }
                              onClick={() => toggleLocationCategory(type, key)}
                              sx={
                                {
                                  fontStyle:
                                    category === UNCATEGORIZED
                                      ? "italic"
                                      : undefined,
                                }
                              }
                              label={locationCategoryLabel(category)}
                              max={categoryCount}
                              chip={count}
                            />
                          );
                        })}
                      </List>
                    )}
                  </MapFilterDrawerItem>
                );
              })}
            </List>

            <Typography
              variant="subtitle2"
              color="primary"
              gutterBottom
              sx={{
                textTransform: "uppercase",
                fontSize: "0.65rem",
                mb: 1.5,
                opacity: 0.7,
                ml: 1,
              }}
            >
              Categorias e ocupantes
            </Typography>
            <List dense disablePadding>
              {stats.categories.map(([category, data], index) => {
                const children = Object.keys(data.entities);
                const visibleChildren = children.filter((id) =>
                  visibleEntities.includes(id),
                );
                const isExpanded = !!expandedCategories[category];

                return (
                  <MapFilterDrawerItem
                    key={category}
                    onExpand={() =>
                      setExpandedCategories((prev) => ({
                        ...prev,
                        [category]: !prev[category],
                      }))
                    }
                    isExpanded={isExpanded}
                    max={children.length}
                    count={visibleChildren.length}
                    chip={data.count}
                    label={categoryLabel(category)}
                    sx={[
                      listRowSx({ index }),
                      {
                        fontStyle:
                          category === UNCATEGORIZED ? "italic" : undefined,
                      },
                    ]}
                    onClick={() => toggleCategory(category)}
                  >
                    <Box
                      sx={{
                        p: 1,
                        pl: 2,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 1,
                      }}
                    >
                      {Object.entries(data.entities).map(
                        ([entityId, entity]) => {
                          const isVisible = visibleEntities.includes(entityId);
                          return (
                            <Tooltip
                              key={entityId}
                              title={`${entity.name} (${entity.count})`}
                              arrow
                            >
                              <Box
                                onClick={() => toggleEntity(entityId, category)}
                                sx={{
                                  width: 42,
                                  height: 42,
                                  borderRadius: 1,
                                  border: 1,
                                  borderColor: isVisible
                                    ? "primary.main"
                                    : "divider",
                                  bgcolor: isVisible
                                    ? "rgba(255, 68, 0, 0.15)"
                                    : "rgba(255,255,255,0.03)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  position: "relative",
                                  transition: "all 0.2s",
                                  "&:hover": {
                                    transform: "translateY(-2px)",
                                  },
                                }}
                              >
                                {entity.iconMediaId ? (
                                  <img
                                    src={mediaUrl(entity.iconMediaId)}
                                    style={{
                                      width: "75%",
                                      height: "75%",
                                      objectFit: "contain",
                                      filter: isVisible
                                        ? "none"
                                        : "grayscale(100%) opacity(0.6)",
                                    }}
                                  />
                                ) : (
                                  <Box
                                    sx={{
                                      width: "60%",
                                      height: "60%",
                                      borderRadius: "50%",
                                      bgcolor: "divider",
                                    }}
                                  />
                                )}
                                <Box
                                  sx={{
                                    position: "absolute",
                                    bottom: -4,
                                    right: -4,
                                    bgcolor: isVisible
                                      ? "primary.main"
                                      : "grey.800",
                                    color: "white",
                                    fontSize: "0.6rem",
                                    px: 0.6,
                                    borderRadius: 1,
                                    fontWeight: 800,
                                    zIndex: 1,
                                  }}
                                >
                                  {entity.count}
                                </Box>
                              </Box>
                            </Tooltip>
                          );
                        },
                      )}
                    </Box>
                  </MapFilterDrawerItem>
                );
              })}
            </List>
          </Box>

          <Divider />

          <Box sx={{ p: 1.5, bgcolor: "rgba(0,0,0,0.2)", textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              {visibleEntities.length} ocupantes ativos no filtro
            </Typography>
          </Box>
        </Paper>
      </Slide>
    </>
  );
};
