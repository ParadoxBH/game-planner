import { useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Construction,
  FiberManualRecord,
  KeyboardArrowDown,
  KeyboardArrowRight,
  ShoppingCart,
  SwapHoriz,
} from "@mui/icons-material";
import {
  referenceParam,
  type CraftAmount,
  type CraftTotals,
  type CraftTreeNode,
  type RecipeDocument,
  type Reference,
  type ResolvedReference,
} from "../../api/content";
import { ReferenceIndex } from "../../api/references";
import { useContentList, useCraftingTree } from "../../api/useContent";
import { formatAmount, formatDuration } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";
import { ChipRow, DetailField } from "../common/DetailField";
import { StyledDialog } from "../common/StyledDialog";
import { ApiRecipeCard } from "./ApiRecipeCard";

/** Escolhas do usuário na árvore: membro de cada categoria e, por alvo ("tipo:id"), "buy", "base" ou o código da receita. */
export interface TreeChoices {
  categories: Record<string, Reference>;
  products: Record<string, string>;
}

export const NO_CHOICES: TreeChoices = { categories: {}, products: {} };

function choiceParams(choices: TreeChoices): string[] {
  return [
    ...Object.entries(choices.categories).map(([category, member]) => `category:${category}=${referenceParam(member)}`),
    ...Object.entries(choices.products).map(([target, choice]) => `${target}=${choice}`),
  ];
}

/** O nó traz nome e ícone quando o alvo está cadastrado. */
function resolvedOf(target: Reference, name?: string | null, iconMediaId?: string | null): ResolvedReference {
  return {
    kind: target.kind ?? null,
    extId: target.extId,
    resolvedKind: name ? target.kind ?? "item" : null,
    name: name ?? null,
    iconMediaId: iconMediaId ?? null,
  };
}

interface TreeActions {
  chooseCategory: (category: string, options: ResolvedReference[]) => void;
  chooseRecipe: (target: Reference) => void;
  setProduct: (target: string, choice: string | null) => void;
}

function SourceBadges({ node }: { node: CraftTreeNode }) {
  switch (node.source) {
    case "recipe":
      return node.recipe ? (
        <>
          <DataChip label={`${formatAmount(node.recipe.batches)} ${node.recipe.batches === 1 ? "lote" : "lotes"}`} />
          {node.recipe.craftTimeSeconds ? <DataChip label={formatDuration(node.recipe.craftTimeSeconds)} /> : null}
          {node.recipe.stations.map((station) => (
            <ContentChip key={station.extId} target={{ kind: "entity", extId: station.extId }} resolved={station} size="small" />
          ))}
        </>
      ) : null;
    case "shop":
      return node.purchase ? (
        <>
          <DataChip
            label={`${formatAmount(node.purchase.packs)} ${node.purchase.packs === 1 ? "pacote" : "pacotes"}${
              node.purchase.packSize > 1 ? ` de ${formatAmount(node.purchase.packSize)}` : ""
            }`}
          />
          {!node.purchase.currency && <DataChip label={`Custo ${formatAmount(node.purchase.cost)}`} />}
        </>
      ) : null;
    case "price":
      return node.price && !node.price.currency ? <DataChip label={`Custo ${formatAmount(node.price.cost)}`} /> : null;
    case "base":
      return <DataChip label="Recurso base" />;
    case "stock":
      return <DataChip label="Do estoque" color="success" />;
    case "category":
      return <DataChip label="Categoria em aberto" color="warning" />;
    case "cycle":
      return <DataChip label="Ciclo" color="error" />;
    default:
      return null;
  }
}

function TreeNodeView({ node, level, actions }: { node: CraftTreeNode; level: number; actions: TreeActions }) {
  const [open, setOpen] = useState(level < 2);
  const children = node.children ?? [];
  const productKey = referenceParam(node.target);
  const hasAlternatives = (node.alternatives?.length ?? 0) > 1;

  return (
    <Box sx={{ ml: level > 0 ? 2 : 0, mt: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        {children.length > 0 ? (
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
          </IconButton>
        ) : (
          <Stack sx={{ width: 34 }} alignItems="center">
            <FiberManualRecord sx={{ fontSize: 8, color: "text.disabled" }} />
          </Stack>
        )}
        <ContentChip
          target={node.target}
          resolved={resolvedOf(node.target, node.name, node.iconMediaId)}
          amount={node.amount}
          notConsumed={node.notConsumed}
          size="small"
        />
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={level === 0 ? 700 : 500}>
            {node.name ?? node.target.extId}
          </Typography>
          <SourceBadges node={node} />
          {node.fromStock && node.source !== "stock" ? <DataChip label={`${formatAmount(node.fromStock)} do estoque`} /> : null}
          {node.leftover ? <DataChip label={`Sobra ${formatAmount(node.leftover)}`} color="info" /> : null}
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {node.source === "category" && (
            <Button size="small" onClick={() => actions.chooseCategory(node.target.extId, node.options ?? [])}>
              Escolher
            </Button>
          )}
          {node.category && (
            <Tooltip title="Trocar a opção da categoria">
              <IconButton size="small" onClick={() => actions.chooseCategory(node.category!, node.options ?? [])}>
                <SwapHoriz fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {node.source === "recipe" && hasAlternatives && (
            <Tooltip title="Trocar a receita">
              <IconButton size="small" onClick={() => actions.chooseRecipe(node.target)}>
                <Construction fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {node.source === "recipe" && node.buyable && (
            <Tooltip title="Comprar em vez de craftar">
              <IconButton size="small" onClick={() => actions.setProduct(productKey, "buy")}>
                <ShoppingCart fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {node.source === "shop" && (node.alternatives?.length ?? 0) > 0 && (
            <Tooltip title="Craftar em vez de comprar">
              <IconButton size="small" onClick={() => actions.setProduct(productKey, null)}>
                <Construction fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {children.length > 0 && (
        <Collapse in={open} unmountOnExit>
          <Box sx={{ ml: 2, pl: 1, borderLeft: 1, borderLeftStyle: "dashed", borderColor: "divider" }}>
            {children.map((child, index) => (
              <TreeNodeView key={`${child.target.extId}-${index}`} node={child} level={level + 1} actions={actions} />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

function AmountChips({ amounts }: { amounts: CraftAmount[] }) {
  return (
    <ChipRow>
      {amounts.map((amount) => (
        <ContentChip
          key={`${amount.target.kind ?? ""}:${amount.target.extId}`}
          target={amount.target}
          resolved={resolvedOf(amount.target, amount.name, amount.iconMediaId)}
          amount={amount.amount}
          size="medium"
        />
      ))}
    </ChipRow>
  );
}

/** O que juntar, o que comprar, o que sobra e o que ficou em aberto. */
function TotalsView({ totals }: { totals: CraftTotals }) {
  const batches = totals.recipes.reduce((sum, recipe) => sum + recipe.batches, 0);
  return (
    <Stack spacing={2}>
      {totals.baseResources.length > 0 && (
        <DetailField label="Recursos base">
          <AmountChips amounts={totals.baseResources} />
        </DetailField>
      )}
      {totals.purchases.length > 0 && (
        <DetailField label="Compras">
          <Stack spacing={1}>
            {totals.purchases.map((purchase, index) => (
              <DataCard key={index} sx={{ p: 1, gap: 1.5, justifyContent: "space-between" }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <ContentChip target={purchase.target} resolved={resolvedOf(purchase.target, purchase.name)} size="small" />
                  <Typography variant="caption" color="text.secondary">
                    {formatAmount(purchase.packs)} {purchase.packs === 1 ? "pacote" : "pacotes"}
                  </Typography>
                </Stack>
                {purchase.currency ? (
                  <ContentChip target={purchase.currency} resolved={resolvedOf(purchase.currency)} amount={purchase.cost} size="small" />
                ) : (
                  <Typography variant="body2" fontWeight={800}>
                    {formatAmount(purchase.cost)}
                  </Typography>
                )}
              </DataCard>
            ))}
          </Stack>
        </DetailField>
      )}
      {totals.tools.length > 0 && (
        <DetailField label="Ferramentas (não são gastas)">
          <AmountChips amounts={totals.tools} />
        </DetailField>
      )}
      {totals.leftovers.length > 0 && (
        <DetailField label="Sobra">
          <AmountChips amounts={totals.leftovers} />
        </DetailField>
      )}
      {totals.recipes.length > 0 && (
        <DetailField label="Receitas">
          <Typography variant="body2">
            {totals.recipes.length} {totals.recipes.length === 1 ? "receita" : "receitas"}, {formatAmount(batches)}{" "}
            {batches === 1 ? "lote" : "lotes"}
          </Typography>
        </DetailField>
      )}
      {totals.stations.length > 0 && (
        <DetailField label="Bancadas">
          <ChipRow>
            {totals.stations.map((station) => (
              <ContentChip key={station.extId} target={{ kind: "entity", extId: station.extId }} resolved={station} size="small" />
            ))}
          </ChipRow>
        </DetailField>
      )}
      {totals.craftTimeSeconds > 0 && (
        <DetailField label="Tempo total">
          <Typography variant="body2">{formatDuration(totals.craftTimeSeconds)}</Typography>
        </DetailField>
      )}
      {totals.openCategories.length > 0 && (
        <DetailField label="Categorias em aberto">
          <AmountChips amounts={totals.openCategories} />
        </DetailField>
      )}
      {totals.cycles.length > 0 && (
        <DetailField label="Ciclos (alvo que depende de si mesmo)">
          <Typography variant="body2">{totals.cycles.map((cycle) => cycle.extId).join(", ")}</Typography>
        </DetailField>
      )}
      {totals.costWithoutCurrency !== undefined && (
        <DetailField label="Custo sem moeda informada">
          <Typography variant="body2">{formatAmount(totals.costWithoutCurrency)}</Typography>
        </DetailField>
      )}
    </Stack>
  );
}

function CategoryChoiceDialog({
  state,
  selected,
  onClose,
  onChoose,
}: {
  state: { category: string; options: ResolvedReference[] } | null;
  selected?: Reference;
  onClose: () => void;
  onChoose: (member: Reference) => void;
}) {
  return (
    <StyledDialog open={state !== null} onClose={onClose} title={`Escolher opção de ${state?.category ?? ""}`}>
      <Stack spacing={1}>
        {state?.options.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Nenhum item ou entidade cadastrado nesta categoria.
          </Typography>
        )}
        {state?.options.map((option) => {
          const target = { kind: option.kind, extId: option.extId };
          return (
            <DataCard key={referenceParam(target)} onClick={() => onChoose(target)} sx={{ p: 1.5, gap: 2 }}>
              <ContentChip
                target={target}
                resolved={option}
                size="medium"
                highlight={selected?.extId === option.extId}
                disableLink
              />
              <Typography variant="body2" fontWeight={700}>
                {option.name ?? option.extId}
              </Typography>
            </DataCard>
          );
        })}
      </Stack>
    </StyledDialog>
  );
}

function RecipeChoiceDialog({
  gameId,
  target,
  selected,
  onClose,
  onChoose,
}: {
  gameId: string;
  target: Reference | null;
  selected?: string;
  onClose: () => void;
  onChoose: (recipe: string) => void;
}) {
  const recipes = useContentList<RecipeDocument>(
    gameId,
    "recipes",
    { size: 50, filters: { produces: target ? referenceParam(target) : undefined, references: "true" } },
    { enabled: target !== null },
  );
  const references = useMemo(() => new ReferenceIndex(recipes.data?.references), [recipes.data]);

  return (
    <StyledDialog open={target !== null} onClose={onClose} title="Escolher receita" maxWidth="md">
      {recipes.isPending ? (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : (
        <Stack spacing={1}>
          {recipes.data?.content.map((recipe) => (
            <Box key={recipe.extId} sx={{ borderRadius: 1, border: 1, borderColor: selected === recipe.extId ? "primary.main" : "transparent" }}>
              <ApiRecipeCard recipe={recipe} references={references} highlight={target ?? undefined} onClick={() => onChoose(recipe.extId)} />
            </Box>
          ))}
        </Stack>
      )}
    </StyledDialog>
  );
}

interface ApiCraftingTreeProps {
  gameId: string;
  target: Reference;
  choices: TreeChoices;
  onChoicesChange: (choices: TreeChoices) => void;
  /** Escolhas de partida, ex.: a receita da página para o produto. "Limpar escolhas" volta a elas. */
  initialChoices?: TreeChoices;
}

/** Árvore de produção calculada no servidor, com escolhas e totais. Lotes e pacotes são inteiros. */
export function ApiCraftingTree({ gameId, target, choices, onChoicesChange, initialChoices = NO_CHOICES }: ApiCraftingTreeProps) {
  const [amount, setAmount] = useState(1);
  const [categoryDialog, setCategoryDialog] = useState<{ category: string; options: ResolvedReference[] } | null>(null);
  const [recipeDialog, setRecipeDialog] = useState<Reference | null>(null);
  const tree = useCraftingTree(gameId, referenceParam(target), amount, choiceParams(choices));
  const hasChoices = JSON.stringify(choices) !== JSON.stringify(initialChoices);

  const actions: TreeActions = {
    chooseCategory: (category, options) => setCategoryDialog({ category, options }),
    chooseRecipe: (node) => setRecipeDialog(node),
    // Sem escolha (craftar de novo), vale a de partida, se houver.
    setProduct: (key, choice) => {
      const products = { ...choices.products };
      const next = choice ?? initialChoices.products[key];
      if (next === undefined) delete products[key];
      else products[key] = next;
      onChoicesChange({ ...choices, products });
    },
  };

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ minHeight: 0, flex: 1 }}>
      <Paper elevation={0} sx={{ p: 2, flex: 2, overflow: "auto" }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
          <TextField
            label="Quantidade"
            type="number"
            size="small"
            value={amount}
            onChange={(event) => setAmount(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
            sx={{ width: 140 }}
          />
          {hasChoices && (
            <Button size="small" onClick={() => onChoicesChange(initialChoices)}>
              Limpar escolhas
            </Button>
          )}
          {tree.isFetching && <CircularProgress size={18} color="primary" />}
        </Stack>
        {tree.isPending ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress color="primary" />
          </Stack>
        ) : tree.isError ? (
          <Typography color="error">{tree.error.message}</Typography>
        ) : (
          <TreeNodeView node={tree.data.root} level={0} actions={actions} />
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 2, flex: 1, overflow: "auto" }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          Total
        </Typography>
        {tree.data && <TotalsView totals={tree.data.totals} />}
      </Paper>

      <CategoryChoiceDialog
        state={categoryDialog}
        selected={categoryDialog ? choices.categories[categoryDialog.category] : undefined}
        onClose={() => setCategoryDialog(null)}
        onChoose={(member) => {
          if (categoryDialog) {
            onChoicesChange({ ...choices, categories: { ...choices.categories, [categoryDialog.category]: member } });
          }
          setCategoryDialog(null);
        }}
      />
      <RecipeChoiceDialog
        gameId={gameId}
        target={recipeDialog}
        selected={recipeDialog ? choices.products[referenceParam(recipeDialog)] : undefined}
        onClose={() => setRecipeDialog(null)}
        onChoose={(recipe) => {
          if (recipeDialog) {
            onChoicesChange({ ...choices, products: { ...choices.products, [referenceParam(recipeDialog)]: recipe } });
          }
          setRecipeDialog(null);
        }}
      />
    </Stack>
  );
}
