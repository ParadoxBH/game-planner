import type { RecipeDocument } from "../../api/content";
import type { ReferenceIndex } from "../../api/references";
import type { ContentChipProps } from "../common/ContentChip";

/** Bancadas da receita (entidade ou ferramenta), com o nível mínimo, prontas para ContentChip/ContentLabel. */
export function stationEntries(recipe: RecipeDocument, references: ReferenceIndex, disableLink = false): ContentChipProps[] {
  return recipe.stations.map((station) => {
    const target = { kind: station.kind, extId: station.extId };
    return { target, resolved: references.find(target), level: station.level, levelOperator: "min", disableLink };
  });
}
