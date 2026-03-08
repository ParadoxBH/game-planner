import {
  Box,
  Typography,
  IconButton,
  Divider,
  Stack,
  Paper,
  Button,
  Tooltip,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InventoryIcon from "@mui/icons-material/Inventory";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import MapIcon from "@mui/icons-material/Map";
import { useMemo } from "react";
import type { NavigationItem } from "./MapView";

interface EntityDrop {
  itemId: string;
  chance: number;
  quant: number;
}

interface GameEntity {
  id: string;
  name: string;
  category: string;
  drops?: EntityDrop[];
}

interface GameItem {
  id: string;
  name: string;
  type: string;
  description: string;
  icon?: string;
}

interface Spawn {
  id: string;
  entityId: string;
  type: string;
  position: [number, number];
  mapId?: string;
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
  onClose 
}: EntityDrawerProps) => {
  const currentItem = stack[stack.length - 1];

  const currentEntity = useMemo(() => {
    if (currentItem?.type !== "entity") return null;
    return entities.find(e => e.id === currentItem.id);
  }, [currentItem, entities]);

  const currentItemData = useMemo(() => {
    if (currentItem?.type !== "item") return null;
    return items.find(i => i.id === currentItem.id);
  }, [currentItem, items]);

  const droppedBy = useMemo(() => {
    if (currentItem?.type !== "item") return [];
    return entities.filter(e => e.drops?.some(d => d.itemId === currentItem.id));
  }, [currentItem, entities]);

  // Cálculo de ocorrências por mapa
  const mapOccurrences = useMemo(() => {
    if (currentItem?.type !== "entity") return [];
    
    const relevantSpawns = spawns.filter(s => s.entityId === currentItem.id);
    const counts: Record<string, number> = {};
    
    relevantSpawns.forEach(s => {
      // Se o spawn não tem mapId, associamos ao primeiro mapa do jogo (fallback comum)
      const mapId = s.mapId || (maps.length > 0 ? maps[0].id : "default");
      counts[mapId] = (counts[mapId] || 0) + 1;
    });

    return Object.entries(counts).map(([mapId, count]) => {
      const mapInfo = maps.find(m => m.id === mapId);
      return {
        id: mapId,
        name: mapInfo?.name || (mapId === "default" ? "Mapa Principal" : mapId),
        count,
        thumbnail: mapInfo?.thumbnail
      };
    }).sort((a, b) => b.count - a.count);
  }, [currentItem, spawns, maps]);

  if (!currentItem) return null;

  return (
    <Box
      sx={{
        width: 380,
        height: "100%",
        backgroundColor: "#0d0d0d",
        borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        flexDirection: "column",
        color: "white",
        animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "@keyframes slideIn": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "rgba(255,255,255,0.03)" }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {stack.length > 1 && (
            <Tooltip title="Voltar">
              <IconButton onClick={onPop} size="small" sx={{ color: "primary.main", mr: 1 }}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            {currentItem.type === "entity" ? "Entidade" : "Item"}
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: "rgba(255,255,255,0.6)" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

      {/* Content */}
      <Box sx={{ p: 3, flexGrow: 1, overflowY: "auto" }}>
        {currentItem.type === "entity" ? (
          /* ENTITY VIEW */
          <Stack spacing={4}>
            <Box>
              <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "1px" }}>
                {currentEntity?.category || "Geral"}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, lineHeight: 1.1 }}>
                {currentEntity?.name || currentItem.id}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", mt: 1, fontFamily: "monospace" }}>
                ID: {currentItem.id}
              </Typography>
            </Box>

            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <InventoryIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
                  DROPS / RECURSOS
                </Typography>
              </Stack>

              {currentEntity?.drops && currentEntity.drops.length > 0 ? (
                <Stack spacing={1}>
                  {currentEntity.drops.map((drop, index) => (
                    <Paper
                      key={`${drop.itemId}-${index}`}
                      onClick={() => onPush({ type: "item", id: drop.itemId })}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        bgcolor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                          bgcolor: "rgba(255, 68, 0, 0.08)",
                          borderColor: "rgba(255, 68, 0, 0.4)",
                          transform: "translateX(6px)",
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: "4px", 
                          bgcolor: "rgba(255,255,255,0.05)",
                          overflow: "hidden",
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {(() => {
                            const itemData = items.find(i => i.id === drop.itemId);
                            return itemData?.icon ? (
                              <img src={itemData.icon} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                              <InventoryIcon sx={{ fontSize: 18, opacity: 0.3 }} />
                            );
                          })()}
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {items.find(i => i.id === drop.itemId)?.name || drop.itemId.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                            Chance: {(drop.chance * 100).toFixed(0)}%
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main" }}>
                        x{drop.quant}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic", color: "rgba(255,255,255,0.3)" }}>
                  Nenhum registro de drop encontrado.
                </Typography>
              )}
            </Box>

            {/* Map Occurrences Section */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <MapIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
                  MAPAS / OCORRÊNCIAS
                </Typography>
              </Stack>
              
              {mapOccurrences.length > 0 ? (
                <Stack spacing={1}>
                  {mapOccurrences.map((occurrence) => (
                    <Paper
                      key={occurrence.id}
                      elevation={0}
                      onClick={() => onSelectMap(occurrence.id)}
                      sx={{
                        p: 1.5,
                        bgcolor: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                          bgcolor: "rgba(255, 68, 0, 0.08)",
                          borderColor: "rgba(255, 68, 0, 0.4)",
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: "4px", 
                          bgcolor: "rgba(255,255,255,0.05)",
                          overflow: "hidden"
                        }}>
                          {occurrence.thumbnail ? (
                            <img src={occurrence.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <MapIcon sx={{ fontSize: 16, opacity: 0.3 }} />
                            </Box>
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {occurrence.name}
                        </Typography>
                      </Stack>
                      <Chip 
                        label={`${occurrence.count}x`}
                        size="small"
                        sx={{ 
                          bgcolor: "rgba(255,255,255,0.1)", 
                          color: "white", 
                          fontWeight: 700,
                          height: 20,
                          fontSize: "0.7rem"
                        }} 
                      />
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                  Nenhuma localização registrada.
                </Typography>
              )}
            </Box>
          </Stack>
        ) : (
          /* ITEM VIEW */
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "1px" }}>
                {currentItemData?.type || "Item"}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, lineHeight: 1.1 }}>
                {currentItemData?.name || currentItem.id}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", mt: 1, fontFamily: "monospace" }}>
                ID: {currentItem.id}
              </Typography>
            </Box>

            <Box sx={{ p: 2, bgcolor: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Typography variant="subtitle2" sx={{ color: "primary.main", fontSize: "10px", fontWeight: 800, mb: 1, textTransform: "uppercase" }}>
                Descrição
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
                {currentItemData?.description || "Sem descrição disponível para este item."}
              </Typography>
            </Box>

            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <TravelExploreIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
                  ONDE ENCONTRAR (DROPPED BY)
                </Typography>
              </Stack>

              {droppedBy.length > 0 ? (
                <Stack spacing={1}>
                  {droppedBy.map((entity) => (
                    <Paper
                      key={entity.id}
                      onClick={() => onPush({ type: "entity", id: entity.id })}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        bgcolor: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        "&:hover": {
                          bgcolor: "rgba(255, 68, 0, 0.08)",
                          borderColor: "rgba(255, 68, 0, 0.4)",
                          transform: "translateX(6px)",
                        },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {entity.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.4)", textTransform: "capitalize" }}>
                        {entity.category}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic", color: "rgba(255,255,255,0.3)" }}>
                  Nenhuma fonte conhecida registrada para este item.
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </Box>

      {/* Footer Navigation */}
      <Box sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.05)", bgcolor: "rgba(255,255,255,0.02)" }}>
        <Stack direction="row" spacing={1}>
          {stack.length > 1 && (
            <Button 
              fullWidth 
              variant="outlined" 
              size="small" 
              startIcon={<ArrowBackIcon />}
              onClick={onPop}
              sx={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
            >
              Voltar
            </Button>
          )}
          <Button 
            fullWidth 
            variant="contained" 
            size="small"
            onClick={onClose}
            sx={{ boxShadow: "none" }}
          >
            Fechar Tudo
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};


