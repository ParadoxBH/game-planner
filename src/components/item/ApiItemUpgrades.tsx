import { Box, Chip, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { AttributeDefinition, ItemDocument, RecipeDocument, Reference } from "../../api/content";
import { contentRoute, type ReferenceIndex } from "../../api/references";
import { listRowSx } from "../../theme/listRowSx";
import { formatChance } from "../../utils/format";
import { attributeDelta, attributeName, formatAttributeValue, formatDelta } from "../common/attributes";
import { ContentChip } from "../common/ContentChip";
import { stationEntries } from "../recipe/recipeStations";
import { changedKeys, levelIncrements, levelTable, upgradeMaterials, wildcardUpgrade } from "./itemLevels";

interface ApiItemUpgradesProps {
  gameId: string;
  item: ItemDocument;
  upgrades: RecipeDocument[];
  /** Melhorias curinga pela categoria do item (Altar Ancestral): mais um nível, sem limite. */
  wildcards?: RecipeDocument[];
  definitions: Map<string, AttributeDefinition>;
  references: ReferenceIndex;
}

/**
 * Melhorias do item como tabela de níveis: em cada linha, o custo para chegar ao nível (materiais e bancada) e o
 * valor dos atributos que mudam, com a diferença para o nível anterior. O nível leva à receita. Depois, as melhorias
 * curinga: "nível +1" sem limite, com a chance e o quanto cada nível soma pelos metadados.
 */
export function ApiItemUpgrades({ gameId, item, upgrades, wildcards = [], definitions, references }: ApiItemUpgradesProps) {
  const self: Reference = { kind: "item", extId: item.extId };
  const rows = levelTable({ ...self, attributes: item.attributes }, upgrades, definitions.values());
  const keys = changedKeys(rows);
  if (rows.length === 0 && wildcards.length === 0) return null;

  // O que cada nível a mais soma no item, pelos metadados (dano cortante +6 por nível).
  const perLevel = [...levelIncrements(definitions.values())].flatMap(([incrementKey, targetKey]) => {
    const increment = item.attributes?.[incrementKey];
    return typeof increment === "number" && increment !== 0 ? [{ key: targetKey, increment }] : [];
  });

  return (
    <Box sx={{ border: 1, borderColor: "divider" }}>
      {rows.map((row, index) => {
        const route = row.recipe ? contentRoute(gameId, "recipe", row.recipe.extId) : null;
        const levelLabel = (
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <ContentChip target={self} resolved={references.find(self)} level={row.level} size="medium" disableLink />
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                Nível {row.level}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {row.recipe ? "melhoria" : "base"}
              </Typography>
            </Stack>
          </Stack>
        );
        return (
          <Stack
            key={row.recipe?.extId ?? "base"}
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={{ xs: 1, md: 2 }}
            sx={[listRowSx({ index }), { px: 1.5, py: 1 }]}
          >
            <Box sx={{ width: { md: 150 }, flexShrink: 0 }}>
              {route ? (
                <Link component={RouterLink} to={route} underline="none" color="inherit" sx={{ display: "block" }}>
                  {levelLabel}
                </Link>
              ) : (
                levelLabel
              )}
            </Box>

            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
              {row.recipe ? (
                <>
                  {upgradeMaterials(row.recipe, self).map((input, inputIndex) => (
                    <ContentChip
                      key={`input-${inputIndex}`}
                      target={input.target}
                      resolved={references.find(input.target)}
                      amount={input.amount}
                      notConsumed={input.notConsumed}
                      size="small"
                    />
                  ))}
                  {stationEntries(row.recipe, references).map((station, stationIndex) => (
                    <ContentChip key={`station-${stationIndex}`} {...station} size="small" />
                  ))}
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Como o item sai da fabricação.
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
              {keys.map((key) => {
                const value = row.attributes[key];
                if (value === undefined) return null;
                const change = row.changes.find((candidate) => candidate.key === key);
                const delta = change ? attributeDelta(change.before, change.after) : null;
                return (
                  <Stack key={key} sx={{ minWidth: 72 }}>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {attributeName(key, definitions.get(key))}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: change ? 700 : 400 }} noWrap>
                      {formatAttributeValue(value, definitions.get(key))}
                      {delta !== null && (
                        <Typography component="span" variant="caption" color={delta > 0 ? "success.main" : "error.main"} sx={{ ml: 0.5 }}>
                          {formatDelta(delta)}
                        </Typography>
                      )}
                    </Typography>
                  </Stack>
                );
              })}
              {keys.length === 0 && row.recipe?.summary && (
                <Typography variant="caption" color="text.secondary">
                  {row.recipe.summary}
                </Typography>
              )}
            </Stack>
          </Stack>
        );
      })}

      {wildcards.map((recipe, index) => {
        const category = wildcardUpgrade(recipe);
        const chance = recipe.outputs.find((output) => output.target.kind === "category")?.chance ?? null;
        const route = contentRoute(gameId, "recipe", recipe.extId);
        return (
          <Stack
            key={recipe.extId}
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={{ xs: 1, md: 2 }}
            sx={[listRowSx({ index: rows.length + index }), { px: 1.5, py: 1 }]}
          >
            <Box sx={{ width: { md: 150 }, flexShrink: 0 }}>
              <Link component={RouterLink} to={route ?? ""} underline="none" color="inherit" sx={{ display: "block" }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <ContentChip target={self} resolved={references.find(self)} size="medium" disableLink />
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      Nível +1
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      sem limite
                    </Typography>
                  </Stack>
                </Stack>
              </Link>
            </Box>

            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
              {(category ? upgradeMaterials(recipe, category) : recipe.inputs).map((input, inputIndex) => (
                <ContentChip
                  key={`input-${inputIndex}`}
                  target={input.target}
                  resolved={references.find(input.target)}
                  amount={input.amount}
                  notConsumed={input.notConsumed}
                  size="small"
                />
              ))}
              {stationEntries(recipe, references).map((station, stationIndex) => (
                <ContentChip key={`station-${stationIndex}`} {...station} size="small" />
              ))}
              {chance !== null && <Chip size="small" color="warning" variant="outlined" label={`${formatChance(chance)} de sucesso`} />}
            </Stack>

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
              {perLevel.length > 0
                ? perLevel.map(({ key, increment }) => (
                    <Stack key={key} sx={{ minWidth: 72 }}>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {attributeName(key, definitions.get(key))}
                      </Typography>
                      <Typography variant="body2" color="success.main" noWrap>
                        {formatDelta(increment)} por nível
                      </Typography>
                    </Stack>
                  ))
                : recipe.summary && (
                    <Typography variant="caption" color="text.secondary">
                      {recipe.summary}
                    </Typography>
                  )}
            </Stack>
          </Stack>
        );
      })}
    </Box>
  );
}
