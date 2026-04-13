import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  Collapse,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  KeyboardArrowDown,
  KeyboardArrowRight,
  FiberManualRecord,
  Edit,
  Store,
} from "@mui/icons-material";
import { getCraftingTree } from "../../utils/craftingTree";
import type { CraftNode, TreeOptions } from "../../utils/craftingTree";
import { ItemChip } from "../common/ItemChip";
import { TimeChip } from "../common/TimeChip";
import { getPublicUrl } from "../../utils/pathUtils";

interface CraftingTreeCardProps {
  itemId: string;
  amount: number;
  type: string;
  options: TreeOptions;
  onSelectCategory?: (categoryId: string) => void;
}

const TreeNode = ({
  node,
  level = 0,
  onSelectCategory,
  originalId,
  originalType,
}: {
  node: CraftNode;
  level?: number;
  onSelectCategory?: (categoryId: string) => void;
  originalId?: string;
  originalType?: string;
}) => {
  const [open, setOpen] = React.useState(level < 2);
  const hasIngredients = node.ingredients.length > 0;

  const isCategory = originalType === "category";

  return (
    <Box sx={{ ml: level > 0 ? 2 : 0, mt: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        {hasIngredients ? (
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
            sx={{ p: 0.5 }}
          >
            {open ? (
              <KeyboardArrowDown fontSize="small" />
            ) : (
              <KeyboardArrowRight fontSize="small" />
            )}
          </IconButton>
        ) : (
          <Box sx={{ width: 28, display: "flex", justifyContent: "center" }}>
            <FiberManualRecord sx={{ fontSize: 8, opacity: 0.3 }} />
          </Box>
        )}

        <ItemChip
          id={node.id}
          icon={node.icon}
          amount={node.amount}
          size="small"
        />

        <Typography variant="body2" fontWeight={level === 0 ? 700 : 500}>
          {node.name}
        </Typography>

        {isCategory && onSelectCategory && (
          <IconButton
            size="small"
            color="primary"
            onClick={() => onSelectCategory(originalId!)}
            sx={{ ml: 0.5 }}
          >
            <Edit sx={{ fontSize: 14 }} />
          </IconButton>
        )}

        {node.buyPrice > 0 && (
          <Tooltip
            title={
              node.shopName
                ? `Vendido em: ${node.shopName}`
                : `Custo de compra unitário: ${node.buyPrice}`
            }
          >
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ opacity: 0.8 }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "primary.light" }}
              >
                {Math.round(node.buyPrice * node.amount).toLocaleString()}
              </Typography>
              <Box
                component="img"
                src={getPublicUrl("/img/heartopia/stats/ouro.png")}
                sx={{ width: 10, height: 10 }}
              />
              {node.shopName && (
                <>
                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{ mx: 0.5, height: 12, alignSelf: "center" }}
                  />
                  <Store sx={{ fontSize: 12, opacity: 0.6 }} />
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {node.shopName}
                  </Typography>
                </>
              )}
            </Stack>
          </Tooltip>
        )}

        {node.recipe?.stations && node.recipe.stations.length > 0 && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="caption"
              sx={{ opacity: 0.5, fontStyle: "italic" }}
            >
              ({node.recipe.stations[0]})
            </Typography>
            {node.recipe.craftTime && node.recipe.craftTime > 0 && (
              <TimeChip seconds={node.recipe.craftTime} size="small" />
            )}
          </Stack>
        )}
      </Stack>

      {hasIngredients && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box
            sx={{
              borderLeft: "1px dashed rgba(255,255,255,0.1)",
              ml: 1.7,
              pl: 1,
            }}
          >
            {node.ingredients.map((ing, idx) => {
              // We need to pass the original requirement info for categories
              const originalIng = node.recipe?.ingredients?.[idx];
              return (
                <TreeNode
                  key={`${ing.id}-${idx}`}
                  node={ing}
                  level={level + 1}
                  onSelectCategory={onSelectCategory}
                  originalId={originalIng?.id}
                  originalType={originalIng?.type}
                />
              );
            })}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export function CraftingTreeCard({
  itemId,
  amount,
  type,
  options,
  onSelectCategory,
}: CraftingTreeCardProps) {
  const tree = useMemo(() => {
    return getCraftingTree(itemId, amount, type, options);
  }, [itemId, amount, type, options]);

  return (
    <Box
      sx={{
        p: 1,
        backgroundColor: "rgba(255,255,255,0.02)",
        borderRadius: 1,
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <TreeNode
        node={tree}
        onSelectCategory={onSelectCategory}
        originalId={itemId}
        originalType={type}
      />
    </Box>
  );
}
