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
import { useMemo, useState } from "react";
import type { ReferencePoints, Entity, Item } from "../../types/gameModels";
import { getPublicUrl } from "../../utils/pathUtils";

interface MapFilterDrawerProps {
  referencePoints: ReferencePoints[];
  entities: Entity[];
  items: Item[];
  visibleTypes: string[];
  setVisibleTypes: (types: string[]) => void;
  visibleCategories: string[];
  setVisibleCategories: (categories: string[]) => void;
  visibleEntities: string[];
  setVisibleEntities: (entities: string[]) => void;
}

export const MapFilterDrawer = ({
  referencePoints,
  entities,
  items,
  visibleTypes,
  setVisibleTypes,
  visibleCategories,
  setVisibleCategories,
  visibleEntities,
  setVisibleEntities,
}: MapFilterDrawerProps) => {
  const [open, setOpen] = useState<boolean>();

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  const entityLookup = useMemo(() => {
    const lookup: Record<string, Entity | Item> = {};
    entities.forEach((e) => (lookup[e.id] = e));
    items.forEach((i) => (lookup[i.id] = i));
    return lookup;
  }, [entities, items]);

  const stats = useMemo(() => {
    const typeCount: Record<string, number> = {};
    const categoryMap: Record<
      string,
      {
        count: number;
        entities: Record<
          string,
          { count: number; name: string; icon?: string }
        >;
      }
    > = {};

    referencePoints.forEach((p) => {
      // Count types
      typeCount[p.type] = (typeCount[p.type] || 0) + 1;

      // Hierarchical grouping
      const entity = entityLookup[p.entityId];
      const category = entity?.category
        ? Array.isArray(entity.category)
          ? entity.category[0]
          : entity.category
        : "desconhecido";

      if (!categoryMap[category])
        categoryMap[category] = { count: 0, entities: {} };
      categoryMap[category].count++;

      if (!categoryMap[category].entities[p.entityId]) {
        categoryMap[category].entities[p.entityId] = {
          count: 0,
          name: entity?.name || p.entityId,
          icon: entity?.icon,
        };
      }
      categoryMap[category].entities[p.entityId].count++;
    });

    return {
      types: Object.entries(typeCount).sort((a, b) => b[1] - a[1]),
      categories: Object.entries(categoryMap).sort(
        (a, b) => b[1].count - a[1].count,
      ),
    };
  }, [referencePoints, entityLookup]);

  const toggleType = (type: string) => {
    if (visibleTypes.includes(type))
      setVisibleTypes(visibleTypes.filter((t) => t !== type));
    else setVisibleTypes([...visibleTypes, type]);
  };

  const toggleCategory = (category: string) => {
    const categoryData = stats.categories.find(([cat]) => cat === category);
    if (!categoryData) return;

    const childEntityIds = Object.keys(categoryData[1].entities);
    const isCurrentlySelected = visibleCategories.includes(category);

    if (isCurrentlySelected) {
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
    const isVisible = visibleEntities.includes(entityId);
    let newVisibleEntities: string[];

    if (isVisible) {
      newVisibleEntities = visibleEntities.filter((id) => id !== entityId);
    } else {
      newVisibleEntities = [...visibleEntities, entityId];
    }

    setVisibleEntities(newVisibleEntities);

    // Update parent category based on children
    const categoryData = stats.categories.find(
      ([cat]) => cat === parentCategory,
    );
    if (categoryData) {
      const children = Object.keys(categoryData[1].entities);
      const anyVisible = children.some((id) => newVisibleEntities.includes(id));
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
    setVisibleCategories(stats.categories.map((c) => c[0]));
    const allEntityIds: string[] = [];
    stats.categories.forEach(([_, data]) =>
      allEntityIds.push(...Object.keys(data.entities)),
    );
    setVisibleEntities(Array.from(new Set(allEntityIds)));
  };

  const clearAll = () => {
    setVisibleTypes([]);
    setVisibleCategories([]);
    setVisibleEntities([]);
  };

  const toggleExpand = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
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
            "&:hover": {
              bgcolor: darken("rgba(255,255,255)",0.1),
            }
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
            width: 320,
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
          {/* Header */}
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

          {/* Action Buttons */}
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

          {/* Content */}
          <Box sx={{ flexGrow: 1, overflowY: "auto", p: 1.5 }}>
            {/* Point Types */}
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
              Tipos de Ponto
            </Typography>
            <List dense disablePadding sx={{ mb: 3 }}>
              {stats.types.map(([type, count]) => (
                <ListItem key={type} disablePadding sx={{ mb: 0.5 }}>
                  <FormControlLabel
                    sx={{
                      width: "100%",
                      ml: 0,
                      mr: 0,
                      px: 1,
                      borderRadius: 1,
                      "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                    }}
                    control={
                      <Checkbox
                        size="small"
                        checked={visibleTypes.includes(type)}
                        onChange={() => toggleType(type)}
                      />
                    }
                    label={
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ width: "100%", ml: 1 }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            textTransform: "capitalize",
                            fontSize: "0.85rem",
                          }}
                        >
                          {type}
                        </Typography>
                        <Chip
                          label={count}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.6rem",
                            bgcolor: "rgba(255,255,255,0.1)",
                          }}
                        />
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
              sx={{
                textTransform: "uppercase",
                fontSize: "0.65rem",
                mb: 1.5,
                opacity: 0.7,
                ml: 1,
              }}
            >
              Categorias & Entidades
            </Typography>
            <List dense disablePadding>
              {stats.categories.map(([cat, data]) => {
                const children = Object.keys(data.entities);
                const visibleChildren = children.filter((id) =>
                  visibleEntities.includes(id),
                );
                const allSelected =
                  children.length > 0 &&
                  visibleChildren.length === children.length;
                const someSelected = visibleChildren.length > 0 && !allSelected;
                const isExpanded = !!expandedCategories[cat];

                return (
                  <Box key={cat} sx={{ mb: 0.5 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      sx={{
                        px: 1,
                        borderRadius: 1,
                        "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => toggleExpand(cat)}
                        sx={{ p: 0.5, mr: 0.5 }}
                      >
                        {isExpanded ? (
                          <ExpandMoreIcon fontSize="small" />
                        ) : (
                          <ChevronRightIcon fontSize="small" />
                        )}
                      </IconButton>
                      <FormControlLabel
                        sx={{ flexGrow: 1, ml: 0, mr: 0 }}
                        control={
                          <Checkbox
                            size="small"
                            checked={allSelected}
                            indeterminate={someSelected}
                            onChange={() => toggleCategory(cat)}
                          />
                        }
                        label={
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ ml: 1 }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                textTransform: "capitalize",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                              }}
                            >
                              {cat.replace(/_/g, " ")}
                            </Typography>
                            <Chip
                              label={data.count}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: "0.6rem",
                                bgcolor: "rgba(255,255,255,0.1)",
                              }}
                            />
                          </Stack>
                        }
                      />
                    </Stack>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
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
                          ([entityId, entityInfo]) => {
                            const isVisible =
                              visibleEntities.includes(entityId);
                            return (
                              <Tooltip
                                key={entityId}
                                title={`${entityInfo.name} (${entityInfo.count})`}
                                arrow
                              >
                                <Box
                                  onClick={() => toggleEntity(entityId, cat)}
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
                                      bgcolor: isVisible
                                        ? "rgba(255, 68, 0, 0.25)"
                                        : "rgba(255,255,255,0.08)",
                                      borderColor: isVisible
                                        ? "primary.main"
                                        : "rgba(255,255,255,0.3)",
                                      transform: "translateY(-2px)",
                                    },
                                    "&:active": { transform: "scale(0.95)" },
                                  }}
                                >
                                  {entityInfo.icon ? (
                                    <img
                                      src={getPublicUrl(entityInfo.icon)}
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
                                      boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                                      zIndex: 1,
                                    }}
                                  >
                                    {entityInfo.count}
                                  </Box>
                                </Box>
                              </Tooltip>
                            );
                          },
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </List>
          </Box>

          <Divider />

          {/* Footer */}
          <Box sx={{ p: 1.5, bgcolor: "rgba(0,0,0,0.2)", textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              {visibleEntities.length} entidades ativas no filtro
            </Typography>
          </Box>
        </Paper>
      </Slide>
    </>
  );
};
