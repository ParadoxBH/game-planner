import { useMemo, useState, useEffect } from "react";
import { Box, Paper, Typography, Tab, Tabs } from "@mui/material";
import { ProductionFlow } from "./ProductionFlow";
import { GameDataSelector } from "../common/GameDataSelector";
import { useApi } from "../../hooks/useApi";
import type { Item, Entity, Recipe, Shop } from "../../types/gameModels";
import { getCraftingTree } from "../../utils/craftingTree";
import { AccountTree, Schema } from "@mui/icons-material";
import { CraftingTreeCard } from "../recipe/CraftingTreeCard";
import { StyledDialog } from "../common/StyledDialog";
import { ItemChip } from "../common/ItemChip";
import { Stack } from "@mui/material";

interface RecipeFlowSectionProps {
  gameId: string;
  itemId: string;
  type?: string;
}

export function RecipeFlowSection({
  gameId,
  itemId,
  type = "item",
}: RecipeFlowSectionProps) {
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


  const [categoryChoices, setCategoryChoices] = useState<
    Record<string, string>
  >({});
  const [recipeChoices, setRecipeChoices] = useState<Record<string, string>>(
    {},
  );
  const [activeCategorySelection, setActiveCategorySelection] = useState<
    string | null
  >(null);
  const [activeRecipeSelection, setActiveRecipeSelection] = useState<
    string | null
  >(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const treeOptions = useMemo(() => {
    const itemMap = new Map<string, Item>();
    items.forEach((i: Item) => itemMap.set(i.id, i));

    const entityMap = new Map<string, Entity>();
    entities.forEach((e: Entity) => entityMap.set(e.id, e));

    const recipeMapByProduct = new Map<string, Recipe>();
    const allRecipesByProduct = new Map<string, Recipe[]>();
    recipes.forEach((r: Recipe) => {
      if (r.itemId) {
        recipeMapByProduct.set(r.itemId, r);
        const current = allRecipesByProduct.get(r.itemId) || [];
        allRecipesByProduct.set(r.itemId, [...current, r]);
      }
      r.products?.forEach((p: any) => {
        recipeMapByProduct.set(p.id, r);
        const current = allRecipesByProduct.get(p.id) || [];
        allRecipesByProduct.set(p.id, [...current, r]);
      });
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
      allRecipesByProduct,
      shopMap,
      shopNames,
      categoryChoices,
      recipeChoices,
    };
  }, [items, entities, recipes, shops, categoryChoices, recipeChoices]);

  const tree = useMemo(() => {
    return getCraftingTree(itemId, 1, type, treeOptions);
  }, [itemId, type, treeOptions]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ minHeight: "auto", borderBottom: 1, borderColor: "divider", mb: 1 }}
        >
          <Tab
            icon={<Schema />}
            label="Fluxo de Produção"
            iconPosition="start"
          />
          <Tab
            icon={<AccountTree />}
            label="Árvore de Produção"
            iconPosition="start"
          />
        </Tabs>

        {activeTab === 1 ? (
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
        ) : (
          <ProductionFlow
            tree={tree}
            allRecipesByProduct={treeOptions.allRecipesByProduct}
            onSelectCategory={(catId) => {
              setActiveCategorySelection(catId);
              setIsDialogOpen(true);
            }}
            onSelectRecipe={(itemId) => {
              setActiveRecipeSelection(itemId);
              setIsRecipeDialogOpen(true);
            }}
          />
        )}
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
          activeCategorySelection
            ? categoryChoices[activeCategorySelection]
            : undefined
        }
      />

      {/* Recipe Selector Dialog */}
      <StyledDialog
        open={isRecipeDialogOpen}
        onClose={() => setIsRecipeDialogOpen(false)}
        title="Selecionar Receita Alternativa"
        maxWidth="sm"
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Escolha qual receita utilizar para produzir{" "}
            <strong>
              {activeRecipeSelection &&
                treeOptions.itemMap.get(activeRecipeSelection)?.name}
            </strong>
            :
          </Typography>
          <Stack spacing={2}>
            {activeRecipeSelection &&
              treeOptions.allRecipesByProduct
                ?.get(activeRecipeSelection)
                ?.map((recipe) => (
                  <Paper
                    key={recipe.id}
                    onClick={() => {
                      setRecipeChoices((prev) => ({
                        ...prev,
                        [activeRecipeSelection]: recipe.id,
                      }));
                      setIsRecipeDialogOpen(false);
                    }}
                    sx={{
                      p: 2,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor:
                        recipeChoices[activeRecipeSelection] === recipe.id
                          ? "primary.main"
                          : "divider",
                      backgroundColor:
                        recipeChoices[activeRecipeSelection] === recipe.id
                          ? "rgba(25, 118, 210, 0.1)"
                          : "transparent",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {recipe.name || `Receita ${recipe.id}`}
                    </Typography>
                    {recipe.stations && recipe.stations.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Estação: {recipe.stations.join(", ")}
                      </Typography>
                    )}
                    <Box
                      sx={{
                        mt: 1,
                        display: "flex",
                        gap: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      {recipe.ingredients?.map((ing: any, idx: number) => (
                        <ItemChip
                          key={idx}
                          id={ing.id}
                          amount={ing.amount}
                          size="small"
                          disableLink
                        />
                      ))}
                    </Box>
                  </Paper>
                ))}
          </Stack>
        </Box>
      </StyledDialog>
    </Box>
  );
}
