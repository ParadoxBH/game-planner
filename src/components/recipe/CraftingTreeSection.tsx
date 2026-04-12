import { useMemo, useState } from "react";
import { Box, Paper } from "@mui/material";
import { CraftingTreeCard } from "./CraftingTreeCard";
import { GameDataSelector } from "../common/GameDataSelector";
import { useApi } from "../../hooks/useApi";
import type { Item, Entity, Recipe, Shop } from "../../types/gameModels";
import { useEffect } from "react";

interface CraftingTreeSectionProps {
  gameId: string;
  itemId: string;
  type?: string;
}

export function CraftingTreeSection({ gameId, itemId, type = "item" }: CraftingTreeSectionProps) {
  const { getAllItems, getAllEntities, getAllRecipes, getAllShops } = useApi(gameId);
  const [items, setItems] = useState<Item[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);

  useEffect(() => {
    if (gameId && !items.length) {
      Promise.all([
        getAllItems(),
        getAllEntities(),
        getAllRecipes(),
        getAllShops()
      ]).then(([i, e, r, s]) => {
        setItems(i);
        setEntities(e);
        setRecipes(r);
        setShops(s);
      });
    }
  }, [gameId, getAllItems, getAllEntities, getAllRecipes, getAllShops, items.length]);
  const [categoryChoices, setCategoryChoices] = useState<Record<string, string>>({});
  const [activeCategorySelection, setActiveCategorySelection] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const treeOptions = useMemo(() => {
    const itemMap = new Map<string, Item>();
    items.forEach((i: Item) => itemMap.set(i.id, i));

    const entityMap = new Map<string, Entity>();
    entities.forEach((e: Entity) => entityMap.set(e.id, e));

    const recipeMapByProduct = new Map<string, Recipe>();
    recipes.forEach((r: Recipe) => {
      if (r.itemId) recipeMapByProduct.set(r.itemId, r);
      r.products?.forEach((p: any) => recipeMapByProduct.set(p.id, r));
    });

    const shopMap = new Map<string, string>();
    const shopNames = new Map<string, string>();
    shops.forEach((shop: Shop) => {
      shopNames.set(shop.id, shop.name);
      shop.groups.forEach((group: any) => {
        group.items.forEach((item: any) => {
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
  }, [items, entities, recipes, shops, categoryChoices]);

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
