import {
  Box,
  Typography,
  IconButton,
  Divider,
  Stack,
  Button,
  Tooltip,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InventoryIcon from "@mui/icons-material/Inventory";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import MapIcon from "@mui/icons-material/Map";
import { DataCard } from "./common/DataCard";
import { DataChip } from "./common/DataChip";
import { useMemo } from "react";
import type { NavigationItem } from "./MapView";

interface EntityDrop {
  itemId: string;
  chance: number;
  quant: number;
  maxQuant?: number;
}

interface GameEntity {
  id: string;
  name: string;
  category: string | string[];
  icon?: string;
  requirements?: {
    itemId: string;
    quant: number;
    maxQuant?: number;
  }[];
  drops?: EntityDrop[];
}

interface GameItem {
  id: string;
  name: string;
  type?: string;
  category?: string | string[];
  description: string;
  icon?: string;
}

interface Spawn {
  id: string;
  entityId: string;
  type?: "position" | "range" | "geom";
  mode?: "once" | "respawn";
  position: [number, number];
  mapId?: string;
  respawnDelay?: number;
}

interface MapMetadata {
  id: string;
  name: string;
  thumbnail?: string;
}

interface EntityDrawerProps {
  stack: NavigationItem[];
  entities: GameEntity[];
  items: GameItem[];
  spawns: Spawn[];
  maps: MapMetadata[];
  onSelectMap: (mapId: string) => void;
  onPush: (item: NavigationItem) => void;
  onPop: () => void;
  onClose: () => void;
}

export const EntityDrawer = ({
  stack,
  entities,
  items,
  spawns,
  maps,
  onSelectMap,
  onPush,
  onPop,
  onClose,
}: EntityDrawerProps) => {
  const theme = useTheme();
  const currentItem = stack[stack.length - 1];

  const currentEntity = useMemo(() => {
    if (currentItem?.type !== "entity") return null;
    return entities.find((e) => e.id === currentItem.id);
  }, [currentItem, entities]);

  const currentItemData = useMemo(() => {
    if (currentItem?.type !== "item") return null;
    return items.find((i) => i.id === currentItem.id);
  }, [currentItem, items]);

  const droppedBy = useMemo(() => {
    if (currentItem?.type !== "item") return [];
    return entities.filter((e) =>
      e.drops?.some((d) => d.itemId === currentItem.id),
    );
  }, [currentItem, entities]);

  // Cálculo de ocorrências por mapa
  const mapOccurrences = useMemo(() => {
    if (currentItem?.type !== "entity") return [];

    const relevantSpawns = spawns.filter((s) => s.entityId === currentItem.id);
    const counts: Record<string, number> = {};

    relevantSpawns.forEach((s) => {
      // Se o spawn não tem mapId, associamos ao primeiro mapa do jogo (fallback comum)
      const mapId = s.mapId || (maps.length > 0 ? maps[0].id : "default");
      counts[mapId] = (counts[mapId] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([mapId, count]) => {
        const mapInfo = maps.find((m) => m.id === mapId);
        return {
          id: mapId,
          name:
            mapInfo?.name || (mapId === "default" ? "Mapa Principal" : mapId),
          count,
          thumbnail: mapInfo?.thumbnail,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [currentItem, spawns, maps]);

  if (!currentItem) return null;

  return (
    <Box
      sx={{
        width: 380,
        height: "100%",
        bgcolor: "background.paper",
        borderLeft: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        color: "text.primary",
        animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "@keyframes slideIn": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "rgba(255,255,255,0.02)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          {stack.length > 1 && (
            <Tooltip title="Voltar">
              <IconButton
                onClick={onPop}
                size="small"
                sx={{ color: "primary.main", mr: 1 }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="h6" sx={{ fontSize: "1.1rem" }}>
            {currentItem.type === "entity" ? "Entidade" : "Item"}
          </Typography>
        </Stack>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: "text.secondary" }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Content */}
      <Box sx={{ p: 3, flexGrow: 1, overflowY: "auto" }}>
        {currentItem.type === "entity" ? (
          /* ENTITY VIEW */
          <Stack spacing={theme.designTokens.spacing.sectionGap}>
            <Stack direction="row" spacing={2} alignItems="center">
              <DataCard
                sx={{
                  width: 80,
                  height: 80,
                  p: 0,
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: "rgba(0,0,0,0.2)",
                }}
              >
                {currentEntity?.icon ? (
                  <img
                    src={currentEntity.icon}
                    alt={currentEntity.name}
                    style={{
                      width: "85%",
                      height: "85%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <InventoryIcon
                    sx={{ fontSize: 40, color: "text.disabled" }}
                  />
                )}
              </DataCard>
              <Stack spacing={0.5}>
                <Typography
                  variant="overline"
                  sx={{
                    color: "primary.main",
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "none",
                  }}
                >
                  {(Array.isArray(currentEntity?.category) ? currentEntity?.category : [currentEntity?.category]).filter(Boolean).map(cat => `#${cat}`).join(' ') || "Geral"}
                </Typography>
                <Typography variant="h4" sx={{ mt: 0, lineHeight: 1.1 }}>
                  {currentEntity?.name || currentItem.id}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    display: "block",
                    fontFamily: "monospace",
                  }}
                >
                  ID: {currentItem.id}
                </Typography>
              </Stack>
            </Stack>

            {currentEntity?.requirements && currentEntity.requirements.length > 0 && (
              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 2 }}
                >
                  <TravelExploreIcon sx={{ color: "primary.main", fontSize: 20 }} />
                  <Typography variant="subtitle2">Requisitos de Coleta</Typography>
                </Stack>
                <Stack spacing={theme.designTokens.spacing.itemGap}>
                  {currentEntity.requirements.map((req, index) => {
                    const itemData = items.find((i) => i.id === req.itemId);
                    return (
                      <DataCard
                        key={`${req.itemId}-${index}`}
                        onClick={() =>
                          onPush({ type: "item", id: req.itemId })
                        }
                        sx={{ justifyContent: "space-between" }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: 1,
                              bgcolor: "rgba(255,255,255,0.05)",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {itemData?.icon ? (
                              <img
                                src={itemData.icon}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                }}
                              />
                            ) : (
                              <InventoryIcon
                                sx={{ fontSize: 18, opacity: 0.3 }}
                              />
                            )}
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600 }}
                          >
                            {itemData?.name || req.itemId.replace(/_/g, " ")}
                          </Typography>
                        </Stack>
                        <DataChip
                          size="small"
                          label={req.maxQuant ? `${req.quant}-${req.maxQuant}` : `x${req.quant}`}
                        />
                      </DataCard>
                    );
                  })}
                </Stack>
              </Box>
            )}

            <Box>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 2 }}
              >
                <InventoryIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="subtitle2">Drops / Recursos</Typography>
              </Stack>

              {currentEntity?.drops && currentEntity.drops.length > 0 ? (
                <Stack spacing={theme.designTokens.spacing.itemGap}>
                  {currentEntity.drops.map((drop, index) => {
                    const itemData = items.find((i) => i.id === drop.itemId);
                    return (
                      <DataCard
                        key={`${drop.itemId}-${index}`}
                        onClick={() =>
                          onPush({ type: "item", id: drop.itemId })
                        }
                        sx={{ justifyContent: "space-between" }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: 1,
                              bgcolor: "rgba(255,255,255,0.05)",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {itemData?.icon ? (
                              <img
                                src={itemData.icon}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                }}
                              />
                            ) : (
                              <InventoryIcon
                                sx={{ fontSize: 18, opacity: 0.3 }}
                              />
                            )}
                          </Box>
                          <Stack alignItems={"start"}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              {itemData?.name || drop.itemId.replace(/_/g, " ")}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "text.secondary" }}
                            >
                              Chance: {(drop.chance * 100).toFixed(0)}%
                            </Typography>
                          </Stack>
                        </Stack>
                        <DataChip
                          size="small"
                          label={drop.maxQuant ? `${drop.quant}-${drop.maxQuant}` : `x${drop.quant}`}
                        />
                      </DataCard>
                    );
                  })}
                </Stack>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ mt: 1, fontStyle: "italic", color: "text.secondary" }}
                >
                  Nenhum registro de drop encontrado.
                </Typography>
              )}
            </Box>

            {/* Map Occurrences Section */}
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 2 }}
              >
                <MapIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography
                  variant="subtitle2"
                  sx={{ color: "rgba(255,255,255,0.8)" }}
                >
                  Mapas / Ocorrências
                </Typography>
              </Stack>

              {mapOccurrences.length > 0 ? (
                <Stack spacing={theme.designTokens.spacing.itemGap}>
                  {mapOccurrences.map((occurrence) => (
                    <DataCard
                      key={occurrence.id}
                      onClick={() => onSelectMap(occurrence.id)}
                      sx={{ justifyContent: "space-between" }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1,
                            bgcolor: "rgba(255,255,255,0.05)",
                            overflow: "hidden",
                          }}
                        >
                          {occurrence.thumbnail ? (
                            <img
                              src={occurrence.thumbnail}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <MapIcon sx={{ fontSize: 16, opacity: 0.3 }} />
                            </Box>
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {occurrence.name}
                        </Typography>
                      </Stack>
                      <DataChip
                        label={`${occurrence.count}x`}
                        size="small"
                      />
                    </DataCard>
                  ))}
                </Stack>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontStyle: "italic" }}
                >
                  Nenhuma localização registrada.
                </Typography>
              )}
            </Box>
          </Stack>
        ) : (
          /* ITEM VIEW */
          <Stack spacing={theme.designTokens.spacing.sectionGap}>
            <Stack direction="row" spacing={2} alignItems="center">
              <DataCard
                sx={{
                  width: 80,
                  height: 80,
                  p: 0,
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: "rgba(0,0,0,0.2)",
                }}
              >
                {currentItemData?.icon ? (
                  <img
                    src={currentItemData.icon}
                    alt={currentItemData.name}
                    style={{
                      width: "85%",
                      height: "85%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <InventoryIcon
                    sx={{ fontSize: 40, color: "text.disabled" }}
                  />
                )}
              </DataCard>
              <Stack spacing={0.5}>
                <Typography
                  variant="overline"
                  sx={{
                    color: "primary.main",
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "none",
                  }}
                >
                  {(Array.isArray(currentItemData?.category) ? currentItemData?.category : [currentItemData?.category]).filter(Boolean).map(cat => `#${cat}`).join(' ') || currentItemData?.type || "Item"}
                </Typography>
                <Typography variant="h4" sx={{ mt: 0, lineHeight: 1.1 }}>
                  {currentItemData?.name || currentItem.id}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    display: "block",
                    fontFamily: "monospace",
                  }}
                >
                  ID: {currentItem.id}
                </Typography>
              </Stack>
            </Stack>

            <Stack
              spacing={1}
              sx={{
                p: 2,
                bgcolor: "rgba(255,255,255,0.02)",
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ color: "primary.main", fontSize: "10px" }}
              >
                Descrição
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.primary", lineHeight: 1.6 }}
              >
                {currentItemData?.description ||
                  "Sem descrição disponível para este item."}
              </Typography>
            </Stack>

            <Box>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 2 }}
              >
                <TravelExploreIcon
                  sx={{ color: "primary.main", fontSize: 20 }}
                />
                <Typography variant="subtitle2">
                  Onde encontrar (Dropped by)
                </Typography>
              </Stack>

              {droppedBy.length > 0 ? (
                <Stack spacing={theme.designTokens.spacing.itemGap}>
                  {droppedBy.map((entity) => (
                    <DataCard
                      key={entity.id}
                      onClick={() => onPush({ type: "entity", id: entity.id })}
                      sx={{ gap: 1.5 }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                          bgcolor: "rgba(255,255,255,0.05)",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}
                      >
                        {entity.icon ? (
                          <img
                            src={entity.icon}
                            style={{
                              width: "85%",
                              height: "85%",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <InventoryIcon
                            sx={{ fontSize: 18, opacity: 0.3 }}
                          />
                        )}
                      </Box>
                      <Stack alignItems={"start"}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {entity.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {(Array.isArray(entity.category) ? entity.category : [entity.category]).map(cat => `#${cat}`).join(' ')}
                        </Typography>
                      </Stack>
                    </DataCard>
                  ))}
                </Stack>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ mt: 1, fontStyle: "italic", color: "text.secondary" }}
                >
                  Nenhuma fonte conhecida registrada para este item.
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </Box>

      {/* Footer Navigation */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,0.01)",
        }}
      >
        <Stack direction="row" spacing={1}>
          {stack.length > 1 && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={onPop}
              sx={{ borderColor: "divider", color: "text.secondary" }}
            >
              Voltar
            </Button>
          )}
          <Button fullWidth variant="contained" size="small" onClick={onClose}>
            Fechar Tudo
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};
