import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Breadcrumbs, Button, CircularProgress, Divider, Grid, Paper, Stack, Tooltip, Typography } from "@mui/material";
import {
  Architecture,
  Bolt,
  Construction,
  Edit,
  Handyman,
  Inventory,
  List as ListIcon,
  NavigateNext,
  Place,
  Redeem,
  Rule,
  Storefront,
  Style,
} from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import type { EntityDocument, EntityRelated, Reference } from "../../api/content";
import { contentRoute, currentMedia, ReferenceIndex } from "../../api/references";
import { useAttributeDefinitions, useContentDetails, useRarities } from "../../api/useContent";
import { useGameAdmin, useGameEditor } from "../../hooks/useGameAdmin";
import { usePlatform } from "../../hooks/usePlatform";
import { formatAmount, formatChance, formatDuration, formatLevelRequirement, formatRange } from "../../utils/format";
import {
  ApiCollectionGroups,
  ApiDroppedBy,
  ApiRequiredBy,
  ApiRewardCodes,
  ApiVariants,
} from "../common/ApiRelatedLists";
import { ContentChip } from "../common/ContentChip";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";
import { DetailField, ReferenceChips } from "../common/DetailField";
import { DetainContainer } from "../common/DetainContainer";
import { DetainItem } from "../common/DetainItem";
import { SpawnPointsByMap } from "../common/SpawnPointsByMap";
import { StyledContainer } from "../common/StyledContainer";
import { AttributeChips } from "../item/ApiItemRenderers";
import { ApiRecipeCard } from "../recipe/ApiRecipeCard";
import { ApiShopOffers, offersFor } from "../shop/ApiShopOffers";
import { EntityFormDialog } from "./EntityFormDialog";

/** Detalhe de entidade, lido do agregado /entities/{id}/details da API. */
export function EntityDetailsPage() {
  const { gameId = "", entityId = "" } = useParams<{ gameId: string; entityId: string }>();
  const navigate = useNavigate();
  const { isMobile } = usePlatform();

  const details = useContentDetails<EntityDocument, EntityRelated>(gameId, "entities", entityId);
  const { canEdit } = useGameEditor(gameId);
  const { isAdmin } = useGameAdmin(gameId);
  const [editing, setEditing] = useState(false);
  const rarities = useRarities(gameId);
  const attributes = useAttributeDefinitions(gameId);
  const references = useMemo(() => new ReferenceIndex(details.data?.references), [details.data]);

  if (details.isPending) {
    return (
      <StyledContainer title="Carregando..." label="Obtendo dados da entidade">
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
        title={unregistered ? "Entidade não cadastrada" : "Não foi possível abrir a entidade"}
        label={
          unregistered
            ? `"${entityId}" é citada em outros conteúdos, mas ainda não foi cadastrada.`
            : details.error.message
        }
      >
        <Typography variant="body2" color="text.secondary">
          Verifique o código ou volte para a <Link to={`/game/${gameId}/entity/list`}>lista de entidades</Link>.
        </Typography>
      </StyledContainer>
    );
  }

  const { document: entity, related } = details.data;
  const self: Reference = { kind: "entity", extId: entity.extId };
  const rarity = entity.rarityCode ? rarities.data?.find((candidate) => candidate.code === entity.rarityCode) : undefined;
  const definitions = new Map((attributes.data ?? []).map((definition) => [definition.key, definition]));
  const offers = offersFor(related.soldIn.content, self);
  const hasShop = related.shops.total > 0;

  return (
    <StyledContainer
      title={entity.name}
      label={`Detalhes e localizações da entidade ${entity.extId}`}
      actionsStart={
        <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
          <Link to={`/game/${gameId}`}>Dashboard</Link>
          <Link to={`/game/${gameId}/entity`}>Entidades</Link>
          <Typography color="primary">{entity.name}</Typography>
        </Breadcrumbs>
      }
      actionsEnd={
        canEdit && (
          <Button variant="outlined" size="small" startIcon={<Edit />} onClick={() => setEditing(true)} sx={{ textTransform: "none" }}>
            Editar
          </Button>
        )
      }
    >
      <DetainContainer>
        <Stack spacing={2}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Stack alignItems="center" spacing={1}>
              <ContentChip
                target={self}
                resolved={{
                  kind: "entity",
                  extId: entity.extId,
                  resolvedKind: "entity",
                  name: entity.name,
                  iconMediaId: currentMedia(entity.media, "icon") ?? currentMedia(entity.media, "screenshot"),
                }}
                level={entity.level}
                rarityColor={rarity?.color}
                size="extraLarge"
                disableLink
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h5" fontWeight={800} textAlign="center" sx={{ color: rarity?.color ?? "primary.main" }}>
                  {entity.name}
                </Typography>
                {hasShop && (
                  <Tooltip title="Este NPC possui loja">
                    <Storefront color="primary" />
                  </Tooltip>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Código: {entity.extId}
              </Typography>
              {rarity && <DataChip label={rarity.name} sx={{ color: rarity.color }} />}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={2}>
              {entity.categories.length > 0 && (
                <DetailField label="Categorias">
                  <ReferenceChips
                    targets={entity.categories.map((id) => ({ kind: "category", extId: id }))}
                    references={references}
                  />
                </DetailField>
              )}

              {(entity.summary || entity.description) && (
                <DetailField label="Descrição">
                  {entity.summary && <Typography variant="body2">{entity.summary}</Typography>}
                  {entity.description && (
                    <Typography variant="body2" color="text.secondary">
                      {entity.description}
                    </Typography>
                  )}
                </DetailField>
              )}

              {(entity.baseBuyPrice !== null || entity.baseSellPrice !== null) && (
                <DetailField label="Preços base">
                  <Stack spacing={0.5}>
                    {entity.baseBuyPrice !== null && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Compra
                        </Typography>
                        <Typography variant="body2" fontWeight={800}>
                          {formatAmount(entity.baseBuyPrice)}
                        </Typography>
                      </Stack>
                    )}
                    {entity.baseSellPrice !== null && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Venda
                        </Typography>
                        <Typography variant="body2" fontWeight={800}>
                          {formatAmount(entity.baseSellPrice)}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </DetailField>
              )}

              {entity.respawnDelayMinutes !== null && (
                <DetailField label="Respawn">
                  <Typography variant="body2">{formatDuration(entity.respawnDelayMinutes * 60)}</Typography>
                </DetailField>
              )}

              {Object.keys(entity.attributes).length > 0 && (
                <DetailField label="Atributos">
                  <AttributeChips attributes={entity.attributes} definitions={definitions} />
                </DetailField>
              )}

              {entity.variantOf && (
                <DetailField label="Variante de">
                  <ReferenceChips
                    targets={[{ kind: "entity", extId: entity.variantOf }]}
                    references={references}
                    size="medium"
                  />
                </DetailField>
              )}

              {entity.events.length > 0 && (
                <DetailField label="Eventos">
                  <ReferenceChips targets={entity.events.map((id) => ({ kind: "event", extId: id }))} references={references} />
                </DetailField>
              )}

              {related.collectionGroups.content.length > 0 && (
                <DetailField label="Coleções">
                  <ApiCollectionGroups groups={related.collectionGroups.content} references={references} />
                </DetailField>
              )}
            </Stack>
          </Paper>

          {related.shops.content.length > 0 && (
            <Paper elevation={0} sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <Storefront color="primary" sx={{ fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={800}>
                  Loja
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {related.shops.content.map((shop) => (
                  <DataCard
                    key={shop.extId}
                    onClick={() => navigate(contentRoute(gameId, "shop", shop.extId)!)}
                    sx={{ p: 1.5, justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      {shop.name}
                    </Typography>
                    <DataChip label="Abrir" color="primary" />
                  </DataCard>
                ))}
              </Stack>
            </Paper>
          )}

          {entity.requirements.length > 0 && (
            <Paper elevation={0} sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <ListIcon color="primary" sx={{ fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={800}>
                  Requisitos para coletar
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
                {entity.requirements.map((requirement, index) => {
                  const level = formatLevelRequirement(requirement.level, requirement.levelOperator);
                  return (
                    <Stack key={index} alignItems="center" spacing={0.25}>
                      <ContentChip
                        target={requirement.target}
                        resolved={references.find(requirement.target)}
                        amount={requirement.amount}
                        notConsumed={requirement.notConsumed}
                        size="medium"
                      />
                      {level && (
                        <Typography variant="caption" color="text.secondary">
                          {level}
                        </Typography>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            </Paper>
          )}
        </Stack>

        <DetainItem startIcon={<Inventory color="primary" />} label="Drops" count={entity.drops.length}>
          {entity.drops.length > 0 && (
            <Grid container spacing={1}>
              {entity.drops.map((drop, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                  <DataCard sx={{ p: 1.5, gap: 1.5 }}>
                    <ContentChip target={drop.target} resolved={references.find(drop.target)} size="medium" />
                    <Stack sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {references.name(drop.target)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatRange(drop.amount, drop.maxAmount)}x · {formatChance(drop.chance)}
                      </Typography>
                    </Stack>
                  </DataCard>
                </Grid>
              ))}
            </Grid>
          )}
        </DetainItem>

        <DetainItem startIcon={<Construction color="primary" />} label="Como fabricar" count={related.producedBy.total}>
          {related.producedBy.content.length > 0 && (
            <Grid container spacing={1}>
              {related.producedBy.content.map((recipe) => (
                <Grid size={{ xs: 12, lg: 6 }} key={recipe.extId}>
                  <ApiRecipeCard recipe={recipe} references={references} highlight={self} />
                </Grid>
              ))}
            </Grid>
          )}
        </DetainItem>

        <DetainItem startIcon={<Handyman color="primary" />} label="Receitas feitas aqui" count={related.craftedHere.total}>
          {related.craftedHere.content.length > 0 && (
            <Grid container spacing={1}>
              {related.craftedHere.content.map((recipe) => (
                <Grid size={{ xs: 12, lg: 6 }} key={recipe.extId}>
                  <ApiRecipeCard recipe={recipe} references={references} />
                </Grid>
              ))}
            </Grid>
          )}
        </DetainItem>

        <DetainItem startIcon={<Architecture color="primary" />} label="Utilizado em" count={related.usedIn.total}>
          {related.usedIn.content.length > 0 && (
            <Grid container spacing={1}>
              {related.usedIn.content.map((recipe) => (
                <Grid size={{ xs: 12, lg: 6 }} key={recipe.extId}>
                  <ApiRecipeCard recipe={recipe} references={references} highlight={self} />
                </Grid>
              ))}
            </Grid>
          )}
        </DetainItem>

        <DetainItem startIcon={<Place color="primary" />} label="Onde aparece" count={related.spawnPoints.total}>
          {related.spawnPoints.content.length > 0 && (
            <SpawnPointsByMap
              points={related.spawnPoints.content}
              filter={{ param: "entity", value: entity.extId }}
              references={references}
            />
          )}
        </DetainItem>

        <DetainItem size={isMobile ? undefined : 6} startIcon={<Storefront color="primary" />} label="Vendido em" count={offers.length}>
          {offers.length > 0 && <ApiShopOffers offers={offers} references={references} />}
        </DetainItem>

        <DetainItem size={isMobile ? undefined : 6} startIcon={<Bolt color="primary" />} label="Dropado por" count={related.droppedBy.total}>
          {related.droppedBy.content.length > 0 && <ApiDroppedBy entities={related.droppedBy.content} target={self} />}
        </DetainItem>

        <DetainItem size={isMobile ? undefined : 6} startIcon={<Rule color="primary" />} label="Exigido para coletar" count={related.requiredBy.total}>
          {related.requiredBy.content.length > 0 && <ApiRequiredBy entities={related.requiredBy.content} target={self} />}
        </DetainItem>

        <DetainItem size={isMobile ? undefined : 6} startIcon={<Style color="primary" />} label="Variantes" count={related.variants.total}>
          {related.variants.content.length > 0 && <ApiVariants kind="entity" variants={related.variants.content} />}
        </DetainItem>

        <DetainItem size={isMobile ? undefined : 6} startIcon={<Redeem color="primary" />} label="Códigos de resgate" count={related.rewardOf.total}>
          {related.rewardOf.content.length > 0 && <ApiRewardCodes codes={related.rewardOf.content} target={self} />}
        </DetainItem>
      </DetainContainer>
      {editing && (
        <EntityFormDialog
          gameId={gameId}
          entity={entity}
          onClose={() => setEditing(false)}
          canDelete={isAdmin}
          onDeleted={() => navigate(`/game/${gameId}/entity`)}
        />
      )}
    </StyledContainer>
  );
}
