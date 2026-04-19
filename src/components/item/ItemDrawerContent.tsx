import { Box, Typography, Stack } from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import { DataCard } from "../common/DataCard";
import type { Theme } from "@mui/material/styles";

import type { Entity, Item } from "../../types/gameModels";
import { getPublicUrl } from "../../utils/pathUtils";

interface ItemDrawerContentProps {
  itemId: string;
  currentItemData: Item | undefined;
  droppedBy: Entity[];
  theme: Theme & { designTokens: any };
  onPush: (item: { type: "entity" | "item"; id: string }) => void;
}

export const ItemDrawerContent = ({
  itemId,
  currentItemData,
  droppedBy,
  theme,
  onPush,
}: ItemDrawerContentProps) => {
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
          {currentItemData?.icon ? (
            <img
              src={getPublicUrl(currentItemData.icon)}
              alt={currentItemData.name}
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
            {(Array.isArray(currentItemData?.category)
              ? currentItemData?.category
              : [currentItemData?.category]
            )
              .filter(Boolean)
              .map((cat) => `#${cat}`)
              .join(" ") ||
              "Item"}
          </Typography>
          <Typography variant="h4" sx={{ mt: 0, lineHeight: 1.1 }}>
            {currentItemData?.name || itemId}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block",
              fontFamily: "monospace",
            }}
          >
            ID: {itemId}
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
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <TravelExploreIcon sx={{ color: "primary.main", fontSize: 20 }} />
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
                    flexShrink: 0,
                  }}
                >
                  {entity.icon ? (
                    <img
                      src={getPublicUrl(entity.icon)}
                      style={{
                        width: "85%",
                        height: "85%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <InventoryIcon sx={{ fontSize: 18, opacity: 0.3 }} />
                  )}
                </Box>
                <Stack alignItems={"start"}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {entity.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {(Array.isArray(entity.category)
                      ? entity.category
                      : [entity.category]
                    )
                      .map((cat) => `#${cat}`)
                      .join(" ")}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto' }}>
                  {(() => {
                    const drop = entity.drops?.find(d => d.itemId === itemId);
                    if (!drop) return null;
                    return (
                      <>
                        <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
                          {(drop.chance * 100).toFixed(0)}%
                        </Typography>
                        <Box sx={{ 
                          px: 0.8, 
                          py: 0.2, 
                          borderRadius: 0.5, 
                          bgcolor: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '10px' }}>
                            {drop.maxQuant ? `${drop.quant}-${drop.maxQuant}` : `x${drop.quant}`}
                          </Typography>
                        </Box>
                      </>
                    );
                  })()}
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
  );
};
