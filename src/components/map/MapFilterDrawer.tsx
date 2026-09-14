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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useState } from "react";
import type { LocationDocument, MapMarker, MarkerOccupant } from "../../api/content";
import { mediaUrl } from "../../api/references";

export const SPAWN_TYPE = "spawn";
export const UNCATEGORIZED = "desconhecido";

const TYPE_LABELS: Record<string, string> = {
  spawn: "Pontos de spawn",
  region: "Regiões",
  biome: "Biomas",
  poi: "Pontos de interesse",
  location: "Localizações",
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function locationTypeOf(location: LocationDocument): string {
  return location.locationType ?? "region";
}

/** Categoria usada no filtro: a primeira do ocupante. */
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
  categories: [string, { count: number; entities: Record<string, FilterEntity> }][];
}

/** Tipos (spawn e tipos de local) e categorias com os ocupantes de cada uma, com as contagens. */
export function computeFilterStats(markers: MapMarker[], locations: LocationDocument[]): FilterStats {
  const typeCount: Record<string, number> = {};
  if (markers.length > 0) typeCount[SPAWN_TYPE] = markers.length;
  locations.forEach((location) => {
    const type = locationTypeOf(location);
    typeCount[type] = (typeCount[type] ?? 0) + 1;
  });

  const categories: Record<string, { count: number; entities: Record<string, FilterEntity> }> = {};
  markers.forEach((marker) =>
    marker.occupants.forEach((occupant) => {
      const category = occupantCategory(occupant);
      if (!categories[category]) categories[category] = { count: 0, entities: {} };
      const group = categories[category];
      group.count++;
      if (!group.entities[occupant.extId]) {
        group.entities[occupant.extId] = { count: 0, name: occupant.name ?? occupant.extId, iconMediaId: occupant.iconMediaId };
      }
      group.entities[occupant.extId].count++;
    }),
  );

  return {
    types: Object.entries(typeCount).sort((a, b) => b[1] - a[1]),
    categories: Object.entries(categories).sort((a, b) => b[1].count - a[1].count),
  };
}

interface MapFilterDrawerProps {
  stats: FilterStats;
  categoryNames: Map<string, string>;
  visibleTypes: string[];
  setVisibleTypes: (types: string[]) => void;
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
  visibleCategories,
  setVisibleCategories,
  visibleEntities,
  setVisibleEntities,
  hideCollected,
  setHideCollected,
}: MapFilterDrawerProps) => {
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const categoryLabel = (category: string) => categoryNames.get(category) ?? category.replace(/_/g, " ");

  const toggleType = (type: string) => {
    if (visibleTypes.includes(type)) setVisibleTypes(visibleTypes.filter((t) => t !== type));
    else setVisibleTypes([...visibleTypes, type]);
  };

  const toggleCategory = (category: string) => {
    const categoryData = stats.categories.find(([cat]) => cat === category);
    if (!categoryData) return;
    const childEntityIds = Object.keys(categoryData[1].entities);

    if (visibleCategories.includes(category)) {
      setVisibleCategories(visibleCategories.filter((c) => c !== category));
      setVisibleEntities(visibleEntities.filter((id) => !childEntityIds.includes(id)));
    } else {
      setVisibleCategories([...visibleCategories, category]);
      setVisibleEntities(Array.from(new Set([...visibleEntities, ...childEntityIds])));
    }
  };

  const toggleEntity = (entityId: string, parentCategory: string) => {
    const next = visibleEntities.includes(entityId)
      ? visibleEntities.filter((id) => id !== entityId)
      : [...visibleEntities, entityId];
    setVisibleEntities(next);

    // A categoria acompanha os filhos: marcada se algum está visível.
    const categoryData = stats.categories.find(([cat]) => cat === parentCategory);
    if (categoryData) {
      const anyVisible = Object.keys(categoryData[1].entities).some((id) => next.includes(id));
      if (anyVisible && !visibleCategories.includes(parentCategory)) {
        setVisibleCategories([...visibleCategories, parentCategory]);
      } else if (!anyVisible && visibleCategories.includes(parentCategory)) {
        setVisibleCategories(visibleCategories.filter((c) => c !== parentCategory));
      }
    }
  };

  const selectAll = () => {
    setVisibleTypes(stats.types.map((t) => t[0]));
    setVisibleCategories(stats.categories.map((c) => c[0]));
    setVisibleEntities(Array.from(new Set(stats.categories.flatMap(([, data]) => Object.keys(data.entities)))));
  };

  const clearAll = () => {
    setVisibleTypes([]);
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
          <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
            <Button fullWidth size="small" variant="outlined" startIcon={<SelectAllIcon />} onClick={selectAll} sx={{ fontSize: "0.7rem" }}>
              Todos
            </Button>
            <Button fullWidth size="small" variant="outlined" startIcon={<DeselectIcon />} onClick={clearAll} sx={{ fontSize: "0.7rem" }}>
              Nenhum
            </Button>
          </Stack>

          <Divider />

          <Box sx={{ px: 2, py: 1.5 }}>
            <FormControlLabel
              control={<Checkbox size="small" checked={hideCollected} onChange={(event) => setHideCollected(event.target.checked)} />}
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
              sx={{ textTransform: "uppercase", fontSize: "0.65rem", mb: 1.5, opacity: 0.7, ml: 1 }}
            >
              Tipos
            </Typography>
            <List dense disablePadding sx={{ mb: 3 }}>
              {stats.types.map(([type, count]) => (
                <ListItem key={type} disablePadding sx={{ mb: 0.5 }}>
                  <FormControlLabel
                    sx={{ width: "100%", ml: 0, mr: 0, px: 1, borderRadius: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.05)" } }}
                    control={<Checkbox size="small" checked={visibleTypes.includes(type)} onChange={() => toggleType(type)} />}
                    label={
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%", ml: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                          {typeLabel(type)}
                        </Typography>
                        <Chip label={count} size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(255,255,255,0.1)" }} />
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>

            <Typography
              variant="subtitle2"
              color="primary"
              gutterBottom
              sx={{ textTransform: "uppercase", fontSize: "0.65rem", mb: 1.5, opacity: 0.7, ml: 1 }}
            >
              Categorias e ocupantes
            </Typography>
            <List dense disablePadding>
              {stats.categories.map(([category, data]) => {
                const children = Object.keys(data.entities);
                const visibleChildren = children.filter((id) => visibleEntities.includes(id));
                const allSelected = children.length > 0 && visibleChildren.length === children.length;
                const someSelected = visibleChildren.length > 0 && !allSelected;
                const isExpanded = !!expandedCategories[category];

                return (
                  <Box key={category} sx={{ mb: 0.5 }}>
                    <Stack direction="row" alignItems="center" sx={{ px: 1, borderRadius: 1, "&:hover": { bgcolor: "rgba(255,255,255,0.05)" } }}>
                      <IconButton
                        size="small"
                        onClick={() => setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }))}
                        sx={{ p: 0.5, mr: 0.5 }}
                      >
                        {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                      </IconButton>
                      <FormControlLabel
                        sx={{ flexGrow: 1, ml: 0, mr: 0 }}
                        control={
                          <Checkbox size="small" checked={allSelected} indeterminate={someSelected} onChange={() => toggleCategory(category)} />
                        }
                        label={
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ ml: 1 }}>
                            <Typography variant="body2" sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                              {categoryLabel(category)}
                            </Typography>
                            <Chip label={data.count} size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(255,255,255,0.1)" }} />
                          </Stack>
                        }
                      />
                    </Stack>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ p: 1, pl: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {Object.entries(data.entities).map(([entityId, entity]) => {
                          const isVisible = visibleEntities.includes(entityId);
                          return (
                            <Tooltip key={entityId} title={`${entity.name} (${entity.count})`} arrow>
                              <Box
                                onClick={() => toggleEntity(entityId, category)}
                                sx={{
                                  width: 42,
                                  height: 42,
                                  borderRadius: 1,
                                  border: 1,
                                  borderColor: isVisible ? "primary.main" : "divider",
                                  bgcolor: isVisible ? "rgba(255, 68, 0, 0.15)" : "rgba(255,255,255,0.03)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  position: "relative",
                                  transition: "all 0.2s",
                                  "&:hover": { transform: "translateY(-2px)" },
                                }}
                              >
                                {entity.iconMediaId ? (
                                  <img
                                    src={mediaUrl(entity.iconMediaId)}
                                    style={{
                                      width: "75%",
                                      height: "75%",
                                      objectFit: "contain",
                                      filter: isVisible ? "none" : "grayscale(100%) opacity(0.6)",
                                    }}
                                  />
                                ) : (
                                  <Box sx={{ width: "60%", height: "60%", borderRadius: "50%", bgcolor: "divider" }} />
                                )}
                                <Box
                                  sx={{
                                    position: "absolute",
                                    bottom: -4,
                                    right: -4,
                                    bgcolor: isVisible ? "primary.main" : "grey.800",
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
                        })}
                      </Box>
                    </Collapse>
                  </Box>
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
