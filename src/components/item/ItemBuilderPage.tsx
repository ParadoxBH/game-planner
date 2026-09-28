import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { Box, Button, Checkbox, Chip, CircularProgress, Grid, Paper, Slider, Stack, Typography } from "@mui/material";
import { Build, SwapHoriz } from "@mui/icons-material";
import type { AttributeDefinition, ItemDocument, ItemRelated, Reference } from "../../api/content";
import { contentRoute, ReferenceIndex } from "../../api/references";
import { useAttributeDefinitions, useContentDetails } from "../../api/useContent";
import { listRowSx } from "../../theme/listRowSx";
import { ApiContentSelector } from "../common/ApiContentSelector";
import { attributeDelta, attributeName, formatAttributeValue, formatDelta, modifierText } from "../common/attributes";
import { ContentChip } from "../common/ContentChip";
import { ContentLabel } from "../common/ContentLabel";
import { DetailField } from "../common/DetailField";
import { StyledContainer } from "../common/StyledContainer";
import { recipeTitle } from "../recipe/ApiRecipeCard";
import { buildItem, levelsOf, levelTable, modifiersFor } from "./itemLevels";

/** Chaves na ordem das definições (grupo e posição), as sem definição por último. */
function byDefinition(definitions: Map<string, AttributeDefinition>) {
  const order = [...definitions.keys()];
  return (a: string, b: string) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia < 0 ? Number.MAX_SAFE_INTEGER : ia) - (ib < 0 ? Number.MAX_SAFE_INTEGER : ib) || a.localeCompare(b);
  };
}

/**
 * Montar item: escolhe o item, o nível (pela cadeia de melhorias) e os extras que o modificam (acessórios, pente), e
 * vê os atributos finais com a diferença para o item cadastrado e o custo somado de todas as receitas.
 */
export function ItemBuilderPage() {
  const { gameId = "", itemId } = useParams<{ gameId: string; itemId?: string }>();
  const navigate = useNavigate();
  const [choosing, setChoosing] = useState(false);
  const [level, setLevel] = useState<number | null>(null);
  const [extras, setExtras] = useState<Set<string>>(new Set());

  const details = useContentDetails<ItemDocument, ItemRelated>(gameId, "items", itemId);
  const attributeDefinitions = useAttributeDefinitions(gameId);
  const references = useMemo(() => new ReferenceIndex(details.data?.references), [details.data]);
  const definitions = useMemo(
    () => new Map((attributeDefinitions.data ?? []).map((definition) => [definition.key, definition])),
    [attributeDefinitions.data],
  );

  const item = details.data?.document;
  const upgrades = useMemo(() => details.data?.related.upgrades?.content ?? [], [details.data]);
  const modifiedBy = useMemo(() => details.data?.related.modifiedBy?.content ?? [], [details.data]);
  const levels = useMemo(
    () => (item ? levelsOf(levelTable(item, upgrades, definitions.values())) : []),
    [item, upgrades, definitions],
  );
  const built = useMemo(
    () =>
      item
        ? buildItem(
            item,
            upgrades,
            modifiedBy.filter((recipe) => extras.has(recipe.extId)),
            definitions.values(),
            level,
          )
        : null,
    [item, upgrades, modifiedBy, extras, definitions, level],
  );

  const choose = (extId: string) => {
    setChoosing(false);
    setLevel(null);
    setExtras(new Set());
    navigate(`/game/${gameId}/items/build/${encodeURIComponent(extId)}`, { replace: Boolean(itemId) });
  };

  const self: Reference | null = item ? { kind: "item", extId: item.extId } : null;
  const changed = new Set(built?.changes.map((change) => change.key));
  const order = byDefinition(definitions);
  const otherKeys = item ? Object.keys(built?.attributes ?? {}).filter((key) => !changed.has(key)).sort(order) : [];
  const changedKeys = [...changed].sort(order);

  return (
    <StyledContainer
      prefix={<Build sx={{ height: 60, width: 60, color: "primary.main" }} />}
      title="Montar item"
      label="Escolha o item, o nível e os extras, e veja como ficam os atributos e quanto custa chegar lá."
    >
      <Grid container spacing={2} sx={{ overflowY: "auto" }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Stack spacing={2.5}>
              <DetailField label="Item">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {self ? (
                      <ContentLabel target={self} resolved={references.find(self)} variant="outlined" size="medium" fullWidth />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum item escolhido.
                      </Typography>
                    )}
                  </Box>
                  <Button startIcon={<SwapHoriz />} onClick={() => setChoosing(true)} sx={{ textTransform: "none", flexShrink: 0 }}>
                    {self ? "Trocar" : "Escolher item"}
                  </Button>
                </Stack>
              </DetailField>

              {itemId && details.isPending && (
                <Stack alignItems="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </Stack>
              )}
              {details.isError && (
                <Typography variant="body2" color="error">
                  Não foi possível abrir o item: {details.error.message}
                </Typography>
              )}

              {item && built && (
                <>
                  <DetailField label="Nível">
                    {levels.length > 1 ? (
                      <Box sx={{ px: 1.5 }}>
                        <Slider
                          value={built.level ?? levels[0]}
                          min={levels[0]}
                          max={levels[levels.length - 1]}
                          step={null}
                          marks={levels.map((value) => ({ value, label: String(value) }))}
                          valueLabelDisplay="auto"
                          onChange={(_, value) => setLevel(value as number)}
                        />
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        O item não tem melhorias.
                      </Typography>
                    )}
                  </DetailField>

                  <DetailField label="Extras">
                    {modifiedBy.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nada muda este item além das melhorias.
                      </Typography>
                    ) : (
                      <Box sx={{ border: 1, borderColor: "divider", textAlign: "left" }}>
                        {modifiedBy.map((recipe, index) => {
                          const product = recipe.outputs[0]?.target;
                          const checked = extras.has(recipe.extId);
                          return (
                            <Stack
                              key={recipe.extId}
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              onClick={() => {
                                const next = new Set(extras);
                                if (checked) next.delete(recipe.extId);
                                else next.add(recipe.extId);
                                setExtras(next);
                              }}
                              sx={[listRowSx({ index, selected: checked, clickable: true }), { pr: 1.5, py: 0.5 }]}
                            >
                              <Checkbox size="small" checked={checked} />
                              <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                                {product && (
                                  <ContentLabel target={product} resolved={references.find(product)} label={recipeTitle(recipe, references)} disableLink />
                                )}
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                  {modifiersFor(recipe, self!).map((modifier, modifierIndex) => (
                                    <Chip
                                      key={modifierIndex}
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      label={modifierText(modifier, definitions.get(modifier.attribute))}
                                    />
                                  ))}
                                </Stack>
                              </Stack>
                            </Stack>
                          );
                        })}
                      </Box>
                    )}
                  </DetailField>
                </>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          {item && built && (
            <Stack spacing={2}>
              <Paper elevation={0} sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                  Atributos {built.level !== null ? `no nível ${built.level}` : ""}
                </Typography>
                {changedKeys.length + otherKeys.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    O item não tem atributos cadastrados.
                  </Typography>
                ) : (
                  <Box sx={{ border: 1, borderColor: "divider", textAlign: "left" }}>
                    {[...changedKeys, ...otherKeys].map((key, index) => {
                      const definition = definitions.get(key);
                      const before = item.attributes?.[key];
                      const after = built.attributes[key];
                      const delta = changed.has(key) ? attributeDelta(before, after) : null;
                      return (
                        <Stack
                          key={key}
                          direction="row"
                          alignItems="center"
                          spacing={2}
                          sx={[listRowSx({ index }), { px: 1.5, py: 0.75, opacity: changed.has(key) ? 1 : 0.6 }]}
                        >
                          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                            {attributeName(key, definition)}
                          </Typography>
                          {changed.has(key) && (
                            <Typography variant="body2" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                              {before === undefined ? "—" : formatAttributeValue(before, definition)}
                            </Typography>
                          )}
                          <Typography variant="body2" sx={{ fontWeight: changed.has(key) ? 800 : 400, minWidth: 64, textAlign: "right" }}>
                            {formatAttributeValue(after, definition)}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={delta !== null && delta < 0 ? "error.main" : "success.main"}
                            sx={{ minWidth: 48, textAlign: "right" }}
                          >
                            {delta !== null ? formatDelta(delta) : ""}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Box>
                )}
              </Paper>

              <Paper elevation={0} sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                  Custo total
                </Typography>
                {built.recipes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    O item como sai da fabricação: nenhuma melhoria ou extra escolhido.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                      {built.cost.map((entry) => (
                        <ContentChip
                          key={`${entry.notConsumed}:${entry.target.kind ?? ""}:${entry.target.extId}`}
                          target={entry.target}
                          resolved={references.find(entry.target)}
                          amount={entry.amount}
                          notConsumed={entry.notConsumed}
                          size="medium"
                        />
                      ))}
                      {built.cost.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          Sem materiais.
                        </Typography>
                      )}
                    </Stack>
                    {built.stations.length > 0 && (
                      <DetailField label="Bancadas">
                        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                          {built.stations.map((station) => {
                            const target = { kind: station.kind, extId: station.extId };
                            return (
                              <ContentChip
                                key={`${station.kind ?? ""}:${station.extId}`}
                                target={target}
                                resolved={references.find(target)}
                                level={station.level}
                                levelOperator="min"
                                size="medium"
                              />
                            );
                          })}
                        </Stack>
                      </DetailField>
                    )}
                    <DetailField label="Receitas">
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        {built.recipes.map((recipe) => (
                          <Chip
                            key={recipe.extId}
                            size="small"
                            clickable
                            component={RouterLink}
                            to={contentRoute(gameId, "recipe", recipe.extId) ?? ""}
                            label={recipeTitle(recipe, references)}
                          />
                        ))}
                      </Stack>
                    </DetailField>
                  </Stack>
                )}
              </Paper>
            </Stack>
          )}
        </Grid>
      </Grid>

      {choosing && (
        <ApiContentSelector open modal gameId={gameId} kinds={["items"]} title="Escolher item para montar" onClose={() => setChoosing(false)} onConfirm={(selection) => choose(selection.extId)} />
      )}
    </StyledContainer>
  );
}
