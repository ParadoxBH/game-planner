import { Stack, Typography } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import type { RecipeDocument, RecipeUnlock, Reference } from "../../api/content";
import { contentRoute, sameTarget, type ReferenceIndex } from "../../api/references";
import { formatDuration } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";

const UNLOCK_LABELS: Record<string, string> = {
  event: "Evento",
  quest: "Quest",
  station_level: "Nível da bancada",
};

export function unlockLabel(unlock: RecipeUnlock, references: ReferenceIndex): string {
  const parts = [unlock.target ? references.name(unlock.target) : null, unlock.value].filter(Boolean);
  return `${UNLOCK_LABELS[unlock.type] ?? unlock.type}: ${parts.join(" · ")}`;
}

/** Nome de exibição: o da receita ou, sem ele, o do primeiro produto. */
export function recipeTitle(recipe: RecipeDocument, references: ReferenceIndex): string {
  const firstOutput = recipe.outputs[0];
  return recipe.name ?? (firstOutput ? references.find(firstOutput.target)?.name : null) ?? recipe.extId;
}

interface ApiRecipeCardProps {
  recipe: RecipeDocument;
  /** Referências resolvidas da tela onde o card aparece. */
  references: ReferenceIndex;
  /** Alvo destacado nos ingredientes e produtos, ex.: o item da página. */
  highlight?: Reference;
  /** Substitui a navegação para o detalhe, ex.: escolher a receita num diálogo. */
  onClick?: () => void;
}

/** Receita vinda da API: ingredientes, produtos, bancadas, desbloqueio e tempo. */
export function ApiRecipeCard({ recipe, references, highlight, onClick }: ApiRecipeCardProps) {
  const navigate = useNavigate();
  const { gameId = "" } = useParams<{ gameId: string }>();
  const isHighlight = (target: Reference) => Boolean(highlight && sameTarget(target, highlight));

  return (
    <DataCard
      onClick={onClick ?? (() => navigate(contentRoute(gameId, "recipe", recipe.extId)!))}
      sx={{ p: 1.5, flexDirection: "column", alignItems: "stretch", gap: 1.5, height: "100%" }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {recipeTitle(recipe, references)}
        </Typography>
        {recipe.craftTimeSeconds ? <DataChip label={formatDuration(recipe.craftTimeSeconds)} /> : null}
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ py: 0.5 }}>
        {recipe.inputs.map((input, index) => (
          <ContentChip
            key={`input-${index}`}
            target={input.target}
            resolved={references.find(input.target)}
            amount={input.amount}
            notConsumed={input.notConsumed}
            highlight={isHighlight(input.target)}
            size="medium"
            disableLink={Boolean(onClick)}
          />
        ))}
        <ArrowForward sx={{ color: "text.disabled" }} />
        {recipe.outputs.map((output, index) => (
          <ContentChip
            key={`output-${index}`}
            target={output.target}
            resolved={references.find(output.target)}
            amount={output.amount}
            level={output.level}
            chance={output.chance}
            highlight={isHighlight(output.target)}
            product
            size="medium"
            disableLink={Boolean(onClick)}
          />
        ))}
      </Stack>

      {(recipe.stations.length > 0 || recipe.unlock.length > 0) && (
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          {recipe.stations.map((station) => {
            const target = { kind: "entity", extId: station };
            return (
              <ContentChip key={station} target={target} resolved={references.find(target)} size="small" disableLink={Boolean(onClick)} />
            );
          })}
          {recipe.unlock.map((unlock, index) => (
            <DataChip key={`unlock-${index}`} label={unlockLabel(unlock, references)} />
          ))}
        </Stack>
      )}
    </DataCard>
  );
}
