import { Box, Chip, Stack, Tooltip } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { RecipeDocument, Reference } from "../../api/content";
import { contentRoute, sameTarget, type ReferenceIndex } from "../../api/references";
import { listRowSx } from "../../theme/listRowSx";
import { formatAmount } from "../../utils/format";
import { ContentLabel } from "../common/ContentLabel";
import { recipeTitle } from "../recipe/ApiRecipeCard";
import { upgradeStep } from "./itemLevels";

interface ApiUpgradeUsesProps {
  gameId: string;
  /** O material da página. */
  target: Reference;
  /** Melhorias de outros itens que gastam o material. */
  recipes: RecipeDocument[];
  references: ReferenceIndex;
}

interface UpgradeUse {
  item: Reference;
  levels: { level: number; amount: number; recipe: RecipeDocument }[];
}

/** Agrupa pelo item melhorado, com os níveis em ordem e quanto do material cada um gasta. */
function groupByItem(recipes: RecipeDocument[], target: Reference): UpgradeUse[] {
  const groups = new Map<string, UpgradeUse>();
  for (const recipe of recipes) {
    const step = upgradeStep(recipe);
    if (!step) continue;
    const amount = recipe.inputs.filter((input) => sameTarget(input.target, target)).reduce((sum, input) => sum + input.amount, 0);
    const key = `${step.target.kind ?? ""}:${step.target.extId}`;
    const group = groups.get(key) ?? { item: step.target, levels: [] };
    group.levels.push({ level: step.to, amount, recipe });
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ ...group, levels: group.levels.sort((a, b) => a.level - b.level) }));
}

/**
 * Onde o material entra nas melhorias de outros itens: uma linha por item melhorado, com um selo por nível
 * ("nível 3 · ×20") que leva à receita. Troca dezenas de cartões de receita por uma linha cada.
 */
export function ApiUpgradeUses({ gameId, target, recipes, references }: ApiUpgradeUsesProps) {
  const uses = groupByItem(recipes, target).sort((a, b) => references.name(a.item).localeCompare(references.name(b.item)));
  if (uses.length === 0) return null;

  return (
    <Box sx={{ border: 1, borderColor: "divider" }}>
      {uses.map((use, index) => (
        <Stack
          key={`${use.item.kind ?? ""}:${use.item.extId}`}
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={1}
          sx={[listRowSx({ index }), { px: 1.5, py: 1 }]}
        >
          <Box sx={{ width: { sm: 260 }, flexShrink: 0, minWidth: 0 }}>
            <ContentLabel target={use.item} resolved={references.find(use.item)} />
          </Box>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
            {use.levels.map(({ level, amount, recipe }) => (
              <Tooltip key={recipe.extId} title={recipeTitle(recipe, references)}>
                <Chip
                  size="small"
                  variant="outlined"
                  clickable
                  component={RouterLink}
                  to={contentRoute(gameId, "recipe", recipe.extId) ?? ""}
                  label={`nível ${level} · ×${formatAmount(amount)}`}
                />
              </Tooltip>
            ))}
          </Stack>
        </Stack>
      ))}
    </Box>
  );
}
