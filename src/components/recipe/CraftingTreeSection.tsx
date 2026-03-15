import { useMemo, useState } from "react";
import { Box, Paper } from "@mui/material";
import { CraftingTreeCard } from "./CraftingTreeCard";
import { GameDataSelector } from "../common/GameDataSelector";
import { useApi } from "../../hooks/useApi";
import type { Item, Entity, Recipe } from "../../types/gameModels";

interface CraftingTreeSectionProps {
  gameId: string;
  itemId: string;
  type?: string;
}

export function CraftingTreeSection({ gameId, itemId, type = "item" }: CraftingTreeSectionProps) {
  const { raw } = useApi(gameId);
  const [categoryChoices, setCategoryChoices] = useState<Record<string, string>>({});
  const [activeCategorySelection, setActiveCategorySelection] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const treeOptions = useMemo(() => {
    const itemMap = new Map<string, Item>();
    raw?.items?.forEach((i) => itemMap.set(i.id, i));

    const entityMap = new Map<string, Entity>();
    raw?.entities?.forEach((e) => entityMap.set(e.id, e));

    const recipeMapByProduct = new Map<string, Recipe>();
    raw?.recipes?.forEach((r) => {
      if (r.itemId) recipeMapByProduct.set(r.itemId, r);
      r.products?.forEach((p) => recipeMapByProduct.set(p.id, r));
    });

    const shopMap = new Map<string, string>();
    const shopNames = new Map<string, string>();
    raw?.shops?.forEach((shop) => {
      shopNames.set(shop.id, shop.name);
      shop.groups.forEach((group) => {
        group.items.forEach((item) => {
          shopMap.set(item.id, shop.id);
        });
      });
    });

    return {
      itemMap,
      entityMap,
      recipeMapByProduct,
      shopMap,
      shopNames,
      categoryChoices,
    };
  }, [raw, categoryChoices]);

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3 }}>
        <CraftingTreeCard
          itemId={itemId}
          amount={1}
          type={type}
          options={treeOptions}
          onSelectCategory={(catId) => {
            setActiveCategorySelection(catId);
            setIsDialogOpen(true);
          }}
        />
      </Paper>

      <GameDataSelector
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setActiveCategorySelection(null);
        }}
        onConfirm={(selection) => {
          if (activeCategorySelection) {
            setCategoryChoices((prev) => ({
              ...prev,
              [activeCategorySelection]: selection.id,
            }));
          }
          setIsDialogOpen(false);
          setActiveCategorySelection(null);
        }}
        gameId={gameId}
        activeCategory={activeCategorySelection || undefined}
        initialSelectionId={
          activeCategorySelection ? categoryChoices[activeCategorySelection] : undefined
        }
      />
    </Box>
  );
}
