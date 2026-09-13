import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Breadcrumbs,
  Button,
  ButtonGroup,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { AccountTree, AutoFixHigh, Construction, Info, Inventory, NavigateNext } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import {
  referenceParam,
  type RecipeDocument,
  type RecipeRelated,
  type Reference,
  type Requirement,
  type ResolvedReference,
} from "../../api/content";
import { ReferenceIndex } from "../../api/references";
import { useContentDetails } from "../../api/useContent";
import { usePlatform } from "../../hooks/usePlatform";
import { formatAmount, formatChance, formatDuration } from "../../utils/format";
import { ApiRewardCodes } from "../common/ApiRelatedLists";
import { ContentChip } from "../common/ContentChip";
import { DataCard } from "../common/DataCard";
import { DetailField, ReferenceChips } from "../common/DetailField";
import { DetainContainer } from "../common/DetainContainer";
import { DetainItem } from "../common/DetainItem";
import { StyledContainer } from "../common/StyledContainer";
import { ApiShopOffers, offersFor } from "../shop/ApiShopOffers";
import { ApiCraftingTree, NO_CHOICES, type TreeChoices } from "./ApiCraftingTree";
import { recipeTitle, unlockLabel } from "./ApiRecipeCard";

interface IngredientCardProps {
  input: Requirement;
  references: ReferenceIndex;
  /** Membros da categoria, quando o ingrediente é uma categoria. */
  members?: ResolvedReference[];
  chosen?: Reference;
  onChoose: (member: Reference) => void;
}

/** Ingrediente com nome e quantidade; categoria mostra as opções, e escolher uma vale para a árvore. */
function IngredientCard({ input, references, members, chosen, onChoose }: IngredientCardProps) {
  const isCategory = input.target.kind === "category";
  const chosenMember = chosen ? members?.find((member) => member.extId === chosen.extId) : undefined;
  const title = chosenMember
    ? chosenMember.name ?? chosenMember.extId
    : isCategory
      ? `Qualquer ${references.name(input.target)}`
      : references.name(input.target);

  return (
    <DataCard sx={{ p: 1.5, flexDirection: "column", alignItems: "stretch", gap: 1, height: "100%" }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <ContentChip
          target={chosen ?? input.target}
          resolved={chosenMember ?? references.find(input.target)}
          amount={input.amount}
          notConsumed={input.notConsumed}
        />
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Quantidade: {formatAmount(input.amount)}
            {input.notConsumed ? " · não é gasto" : ""}
          </Typography>
        </Stack>
      </Stack>
      {members && members.length > 0 && (
        <Stack spacing={0.5} sx={{ pt: 1, borderTop: 1, borderTopStyle: "dashed", borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary">
            Opções — escolha uma para a árvore de produção
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {members.map((member) => {
              const target = { kind: member.kind, extId: member.extId };
              return (
                <Stack key={referenceParam(target)} onClick={() => onChoose(target)} sx={{ cursor: "pointer" }}>
                  <ContentChip target={target} resolved={member} size="small" highlight={chosen?.extId === member.extId} disableLink />
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      )}
    </DataCard>
  );
}

/** Detalhe de receita, lido do agregado /recipes/{id}/details, com a árvore de produção do servidor. */
export function RecipeDetailsPage() {
  const { gameId = "", recipeId = "" } = useParams<{ gameId: string; recipeId: string }>();
  const { isMobile } = usePlatform();
  const [tab, setTab] = useState<"general" | "tree">("general");
  const [choices, setChoices] = useState<TreeChoices>(NO_CHOICES);

  const details = useContentDetails<RecipeDocument, RecipeRelated>(gameId, "recipes", recipeId);
  const references = useMemo(() => new ReferenceIndex(details.data?.references), [details.data]);

  // A árvore parte do produto; quando outra receita também o produz, esta é a escolhida.
  const loaded = details.data?.document;
  const initialChoices = useMemo<TreeChoices>(() => {
    const output = loaded?.outputs[0];
    return output && loaded ? { ...NO_CHOICES, products: { [referenceParam(output.target)]: loaded.extId } } : NO_CHOICES;
  }, [loaded]);
  useEffect(() => setChoices(initialChoices), [initialChoices]);

  if (details.isPending) {
    return (
      <StyledContainer title="Carregando..." label="Obtendo dados da receita">
        <Stack alignItems="center" sx={{ py: 10 }}>
          <CircularProgress color="primary" />
        </Stack>
      </StyledContainer>
    );
  }

  if (details.isError) {
    const unregistered = details.error instanceof ApiError && details.error.kind === "unregistered-content";
    return (
      <StyledContainer
        title={unregistered ? "Receita não cadastrada" : "Não foi possível abrir a receita"}
        label={unregistered ? `"${recipeId}" é citada em outros conteúdos, mas ainda não foi cadastrada.` : details.error.message}
      >
        <Typography variant="body2" color="text.secondary">
          Verifique o código ou volte para a <Link to={`/game/${gameId}/recipes/list`}>lista de receitas</Link>.
        </Typography>
      </StyledContainer>
    );
  }

  const { document: recipe, related, categoryMembers } = details.data;
  const self: Reference = { kind: "recipe", extId: recipe.extId };
  const title = recipeTitle(recipe, references);
  const mainOutput = recipe.outputs[0];
  const offers = offersFor(related.soldIn.content, self);

  return (
    <StyledContainer
      title={title}
      label={`Detalhes da receita ${recipe.extId}`}
      actionsStart={
        !isMobile ? (
          <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
            <Link to={`/game/${gameId}`}>Dashboard</Link>
            <Link to={`/game/${gameId}/recipes/list`}>Receitas</Link>
            <Typography color="primary">{title}</Typography>
          </Breadcrumbs>
        ) : undefined
      }
      actionsEnd={
        <ButtonGroup fullWidth={isMobile}>
          <Button variant={tab === "general" ? "contained" : "outlined"} startIcon={<Info />} onClick={() => setTab("general")}>
            Geral
          </Button>
          <Button variant={tab === "tree" ? "contained" : "outlined"} startIcon={<AccountTree />} onClick={() => setTab("tree")}>
            {isMobile ? "Árvore" : "Árvore de produção"}
          </Button>
        </ButtonGroup>
      }
    >
      {tab === "general" && (
        <DetainContainer>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Stack alignItems="center" spacing={1}>
              {mainOutput ? (
                <ContentChip target={mainOutput.target} resolved={references.find(mainOutput.target)} size="extraLarge" />
              ) : (
                <Construction sx={{ fontSize: 64, color: "text.disabled" }} />
              )}
              <Typography variant="h5" fontWeight={800} color="primary.main" textAlign="center">
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Código: {recipe.extId}
              </Typography>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={2}>
              <DetailField label="Bancadas">
                {recipe.stations.length > 0 ? (
                  <ReferenceChips
                    targets={recipe.stations.map((station) => ({ kind: "entity", extId: station }))}
                    references={references}
                    size="medium"
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Feita sem bancada
                  </Typography>
                )}
              </DetailField>

              {recipe.craftTimeSeconds ? (
                <DetailField label="Tempo de produção">
                  <Typography variant="body2">{formatDuration(recipe.craftTimeSeconds)}</Typography>
                </DetailField>
              ) : null}

              {recipe.unlock.length > 0 && (
                <DetailField label="Como desbloquear">
                  <Stack spacing={1}>
                    {recipe.unlock.map((unlock, index) => (
                      <Stack key={index} direction="row" spacing={1} alignItems="center">
                        <AutoFixHigh fontSize="small" color="primary" />
                        {unlock.target && <ContentChip target={unlock.target} resolved={references.find(unlock.target)} size="small" />}
                        <Typography variant="body2">{unlockLabel(unlock, references)}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </DetailField>
              )}

              {recipe.events.length > 0 && (
                <DetailField label="Eventos">
                  <ReferenceChips targets={recipe.events.map((id) => ({ kind: "event", extId: id }))} references={references} />
                </DetailField>
              )}

              {offers.length > 0 && (
                <DetailField label="Vendida em">
                  <ApiShopOffers offers={offers} references={references} />
                </DetailField>
              )}

              {related.rewardOf.content.length > 0 && (
                <DetailField label="Códigos de resgate">
                  <ApiRewardCodes codes={related.rewardOf.content} target={self} />
                </DetailField>
              )}
            </Stack>
          </Paper>

          <DetainItem startIcon={<Inventory color="primary" />} label="Ingredientes" count={recipe.inputs.length}>
            {recipe.inputs.length > 0 && (
              <Grid container spacing={1}>
                {recipe.inputs.map((input, index) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={index}>
                    <IngredientCard
                      input={input}
                      references={references}
                      members={input.target.kind === "category" ? categoryMembers[input.target.extId] ?? [] : undefined}
                      chosen={choices.categories[input.target.extId]}
                      onChoose={(member) =>
                        setChoices({ ...choices, categories: { ...choices.categories, [input.target.extId]: member } })
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </DetainItem>

          <DetainItem startIcon={<Construction color="primary" />} label="Produtos" count={recipe.outputs.length}>
            {recipe.outputs.length > 0 && (
              <Grid container spacing={1}>
                {recipe.outputs.map((output, index) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={index}>
                    <DataCard sx={{ p: 1.5, gap: 2 }}>
                      <ContentChip
                        target={output.target}
                        resolved={references.find(output.target)}
                        amount={output.amount}
                        level={output.level}
                        chance={output.chance}
                        product
                      />
                      <Stack sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {references.name(output.target)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Quantidade: {formatAmount(output.amount)}
                          {output.chance !== null ? ` · ${formatChance(output.chance)}` : ""}
                          {output.level ? ` · nível ${output.level}` : ""}
                        </Typography>
                      </Stack>
                    </DataCard>
                  </Grid>
                ))}
              </Grid>
            )}
          </DetainItem>
        </DetainContainer>
      )}

      {tab === "tree" &&
        (mainOutput ? (
          <ApiCraftingTree
            gameId={gameId}
            target={mainOutput.target}
            choices={choices}
            onChoicesChange={setChoices}
            initialChoices={initialChoices}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Esta receita não tem produto para montar a árvore.
          </Typography>
        ))}
    </StyledContainer>
  );
}
