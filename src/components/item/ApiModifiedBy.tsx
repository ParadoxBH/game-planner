import { Box, Chip, Stack } from "@mui/material";
import type { AttributeDefinition, RecipeDocument, Reference } from "../../api/content";
import { sameTarget, type ReferenceIndex } from "../../api/references";
import { listRowSx } from "../../theme/listRowSx";
import { modifierText } from "../common/attributes";
import { ContentChip } from "../common/ContentChip";
import { ContentLabel } from "../common/ContentLabel";
import { recipeTitle } from "../recipe/ApiRecipeCard";
import { modifiersFor } from "./itemLevels";

interface ApiModifiedByProps {
  /** O item da página. */
  target: Reference;
  /** Fabricações que mudam atributos do item (acessório, pente). */
  recipes: RecipeDocument[];
  definitions: Map<string, AttributeDefinition>;
  references: ReferenceIndex;
}

/**
 * O que muda o item sem subir o nível: uma linha por receita, com o produto (o acessório), o que ele muda no item
 * ("Munição por pente vira 17") e o custo, sem o próprio item.
 */
export function ApiModifiedBy({ target, recipes, definitions, references }: ApiModifiedByProps) {
  if (recipes.length === 0) return null;
  return (
    <Box sx={{ border: 1, borderColor: "divider" }}>
      {recipes.map((recipe, index) => {
        const product = recipe.outputs[0]?.target;
        return (
          <Stack
            key={recipe.extId}
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={1}
            sx={[listRowSx({ index }), { px: 1.5, py: 1 }]}
          >
            <Box sx={{ width: { md: 260 }, flexShrink: 0, minWidth: 0 }}>
              {product && <ContentLabel target={product} resolved={references.find(product)} label={recipeTitle(recipe, references)} />}
            </Box>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
              {modifiersFor(recipe, target).map((modifier, modifierIndex) => (
                <Chip key={modifierIndex} size="small" color="primary" variant="outlined" label={modifierText(modifier, definitions.get(modifier.attribute))} />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {recipe.inputs
                .filter((input) => !sameTarget(input.target, target))
                .map((input, inputIndex) => (
                  <ContentChip
                    key={inputIndex}
                    target={input.target}
                    resolved={references.find(input.target)}
                    amount={input.amount}
                    notConsumed={input.notConsumed}
                    size="small"
                  />
                ))}
            </Stack>
          </Stack>
        );
      })}
    </Box>
  );
}
