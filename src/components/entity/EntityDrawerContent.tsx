import { Box, Typography, Stack } from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import MapIcon from "@mui/icons-material/Map";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";
import type { Theme } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";

import type { Entity, Item, Shop } from "../../types/gameModels";

interface MapOccurrence {
  id: string;
  name: string;
  count: number;
  thumbnail?: string;
}

interface EntityDrawerContentProps {
  entityId: string;
  currentEntity: Entity | null | undefined;
  items: Item[];
  theme: Theme & { designTokens: any };
  mapOccurrences: MapOccurrence[];
  shop?: Shop;
  onPush: (item: { type: "entity" | "item"; id: string }) => void;
  onSelectMap: (mapId: string) => void;
}

export const EntityDrawerContent = ({
  entityId,
  currentEntity,
  items,
  theme,
  mapOccurrences,
  shop,
  onPush,
  onSelectMap,
}: EntityDrawerContentProps) => {
  const { gameId } = useParams();
  const navigate = useNavigate();

  return (
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
            <InventoryIcon sx={{ fontSize: 40, color: "text.disabled" }} />
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
            {(Array.isArray(currentEntity?.category)
              ? currentEntity?.category
              : [currentEntity?.category]
            )
              .filter(Boolean)
              .map((cat) => `#${cat}`)
              .join(" ") || "Geral"}
          </Typography>
          <Typography variant="h4" sx={{ mt: 0, lineHeight: 1.1 }}>
            {currentEntity?.name || entityId}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block",
              fontFamily: "monospace",
            }}
          >
            ID: {entityId}
          </Typography>
        </Stack>
      </Stack>

      {shop && (
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <StorefrontIcon sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="subtitle2">Possui Loja</Typography>
          </Stack>
          <DataCard
            onClick={() => navigate(`/game/${gameId}/shops/list/${shop.id}`)}
            sx={{
              justifyContent: "space-between",
              "&:hover": {
                backgroundColor: "rgba(255, 68, 0, 0.05)",
                borderColor: "primary.main",
              },
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <StorefrontIcon sx={{ fontSize: 18, color: "primary.main" }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {shop.name || "Visitar Loja"}
              </Typography>
            </Stack>
            <DataChip label="Abrir" size="small" color="primary" />
          </DataCard>
        </Box>
      )}

      {currentEntity?.requirements && currentEntity.requirements.length > 0 && (
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <TravelExploreIcon sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="subtitle2">Requisitos de Coleta</Typography>
          </Stack>
          <Stack spacing={theme.designTokens.spacing.itemGap}>
            {currentEntity.requirements.map((req, index) => {
              const itemData = items.find((i) => i.id === req.itemId);
              return (
                <DataCard
                  key={`${req.itemId}-${index}`}
                  onClick={() => onPush({ type: "item", id: req.itemId })}
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
                        <InventoryIcon sx={{ fontSize: 18, opacity: 0.3 }} />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {itemData?.name || req.itemId.replace(/_/g, " ")}
                    </Typography>
                  </Stack>
                  <DataChip
                    size="small"
                    label={
                      req.maxQuant
                        ? `${req.quant}-${req.maxQuant}`
                        : `x${req.quant}`
                    }
                  />
                </DataCard>
              );
            })}
          </Stack>
        </Box>
      )}

      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
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
                  onClick={() => onPush({ type: "item", id: drop.itemId })}
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
                        <InventoryIcon sx={{ fontSize: 18, opacity: 0.3 }} />
                      )}
                    </Box>
                    <Stack alignItems={"start"}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
                    label={
                      drop.maxQuant
                        ? `${drop.quant}-${drop.maxQuant}`
                        : `x${drop.quant}`
                    }
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
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
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
                <DataChip label={`${occurrence.count}x`} size="small" />
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
  );
};
