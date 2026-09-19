import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumbs, CircularProgress, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import {
  Architecture,
  Bolt,
  Construction,
  Map as MapIcon,
  NavigateNext,
  Place,
  Redeem,
  Rule,
  Storefront,
  Style,
} from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import type { ItemDocument, ItemRelated, Reference } from "../../api/content";
import { ReferenceIndex, resolvedFrom } from "../../api/references";
import { useAttributeDefinitions, useContentDetails, useRarities } from "../../api/useContent";
import { usePlatform } from "../../hooks/usePlatform";
import { formatAmount } from "../../utils/format";
import {
  ApiCollectionGroups,
  ApiDroppedBy,
  ApiRequiredBy,
  ApiRewardCodes,
  ApiVariants,
} from "../common/ApiRelatedLists";
import { ContentChip } from "../common/ContentChip";
import { DataChip } from "../common/DataChip";
import { DetailField, ReferenceChips } from "../common/DetailField";
import { DetainContainer } from "../common/DetainContainer";
import { DetainItem } from "../common/DetainItem";
import { SpawnPointsByMap } from "../common/SpawnPointsByMap";
import { StyledContainer } from "../common/StyledContainer";
import { ApiRecipeCard } from "../recipe/ApiRecipeCard";
import { ApiShopOffers, offersFor } from "../shop/ApiShopOffers";
import { AttributeChips } from "./ApiItemRenderers";

/** Detalhe de item, lido do agregado /items/{id}/details da API. */
export function ItemDetailsPage() {
  const { gameId = "", itemId = "" } = useParams<{ gameId: string; itemId: string }>();
  const { isMobile } = usePlatform();

  const details = useContentDetails<ItemDocument, ItemRelated>(gameId, "items", itemId);
  const rarities = useRarities(gameId);
  const attributes = useAttributeDefinitions(gameId);
  const references = useMemo(() => new ReferenceIndex(details.data?.references), [details.data]);

  if (details.isPending) {
    return (
      <StyledContainer title="Carregando..." label="Obtendo dados do item">
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
        title={unregistered ? "Item não cadastrado" : "Não foi possível abrir o item"}
        label={
          unregistered
            ? `"${itemId}" é citado em outros conteúdos, mas ainda não foi cadastrado.`
            : details.error.message
        }
      >
        <Typography variant="body2" color="text.secondary">
          Verifique o código ou volte para a <Link to={`/game/${gameId}/items/list`}>lista de itens</Link>.
        </Typography>
      </StyledContainer>
    );
  }

  const { document: item, related } = details.data;
  const self: Reference = { kind: "item", extId: item.extId };
  const rarity = item.rarityCode ? rarities.data?.find((candidate) => candidate.code === item.rarityCode) : undefined;
  const definitions = new Map((attributes.data ?? []).map((definition) => [definition.key, definition]));
  const offers = offersFor(related.soldIn.content, self);

  return (
    <StyledContainer
      title={item.name}
      label={`Detalhes e origens do item ${item.extId}`}
      actionsStart={
        <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
          <Link to={`/game/${gameId}`}>Dashboard</Link>
          <Link to={`/game/${gameId}/items`}>Itens</Link>
          <Typography color="primary">{item.name}</Typography>
        </Breadcrumbs>
      }
    >
      <DetainContainer>
        <Paper elevation={0} sx={{ p: 2 }}>
          <Stack alignItems="center" spacing={1}>
            <ContentChip
              target={self}
              resolved={resolvedFrom("item", item)}
              level={item.level}
              rarityColor={rarity?.color}
              size="extraLarge"
              disableLink
            />
            <Typography variant="h5" fontWeight={800} textAlign="center" sx={{ color: rarity?.color ?? "primary.main" }}>
              {item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Código: {item.extId}
            </Typography>
            {rarity && <DataChip label={rarity.name} sx={{ color: rarity.color }} />}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            {item.categories.length > 0 && (
              <DetailField label="Categorias">
                <ReferenceChips targets={item.categories.map((id) => ({ kind: "category", extId: id }))} references={references} />
              </DetailField>
            )}

            {(item.summary || item.description) && (
              <DetailField label="Descrição">
                {item.summary && <Typography variant="body2">{item.summary}</Typography>}
                {item.description && (
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                )}
              </DetailField>
            )}

            {(item.baseBuyPrice !== null || item.baseSellPrice !== null) && (
              <DetailField label="Preços base">
                <Stack spacing={1}>
                  {[
                    { label: "Compra", value: item.baseBuyPrice },
                    { label: "Venda", value: item.baseSellPrice },
                  ]
                    .filter((price) => price.value !== null)
                    .map((price) => (
                      <Stack key={price.label} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          {price.label}
                        </Typography>
                        {item.currency ? (
                          <ContentChip
                            target={item.currency}
                            resolved={references.find(item.currency)}
                            amount={price.value}
                            size="small"
                          />
                        ) : (
                          <Typography variant="body2" fontWeight={800}>
                            {formatAmount(price.value!)}
                          </Typography>
                        )}
                      </Stack>
                    ))}
                </Stack>
              </DetailField>
            )}

            {Object.keys(item.attributes).length > 0 && (
              <DetailField label="Atributos">
                <AttributeChips attributes={item.attributes} definitions={definitions} />
              </DetailField>
            )}

            {item.variantOf && (
              <DetailField label="Variante de">
                <ReferenceChips targets={[{ kind: "item", extId: item.variantOf }]} references={references} size="medium" />
              </DetailField>
            )}

            {item.events.length > 0 && (
              <DetailField label="Eventos">
                <ReferenceChips targets={item.events.map((id) => ({ kind: "event", extId: id }))} references={references} />
              </DetailField>
            )}

            {related.collectionGroups.content.length > 0 && (
              <DetailField label="Coleções">
                <ApiCollectionGroups groups={related.collectionGroups.content} references={references} />
              </DetailField>
            )}
          </Stack>
        </Paper>

        <DetainItem startIcon={<Construction color="primary" />} label="Produção" count={related.producedBy.total}>
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

        <DetainItem size={isMobile ? undefined : 6} startIcon={<Bolt color="primary" />} label="Dropado por" count={related.droppedBy.total}>
          {related.droppedBy.content.length > 0 && <ApiDroppedBy entities={related.droppedBy.content} target={self} />}
        </DetainItem>

        <DetainItem size={isMobile ? undefined : 6} startIcon={<Storefront color="primary" />} label="Vendido em" count={offers.length}>
          {offers.length > 0 && <ApiShopOffers offers={offers} references={references} />}
        </DetainItem>

        <DetainItem startIcon={<MapIcon color="primary" />} label="Locais de drop" count={related.dropPoints.total}>
          {related.dropPoints.content.length > 0 && (
            <SpawnPointsByMap points={related.dropPoints.content} filter={{ param: "item", value: item.extId }} references={references} />
          )}
        </DetainItem>

        <DetainItem startIcon={<Place color="primary" />} label="Onde aparece" count={related.spawnPoints.total}>
          {related.spawnPoints.content.length > 0 && (
            <SpawnPointsByMap points={related.spawnPoints.content} filter={{ param: "item", value: item.extId }} references={references} />
          )}
        </DetainItem>

        <DetainItem size={isMobile ? undefined : 6} startIcon={<Rule color="primary" />} label="Exigido para coletar" count={related.requiredBy.total}>
          {related.requiredBy.content.length > 0 && <ApiRequiredBy entities={related.requiredBy.content} target={self} />}
        </DetainItem>

        <DetainItem size={isMobile ? undefined : 6} startIcon={<Style color="primary" />} label="Variantes" count={related.variants.total}>
          {related.variants.content.length > 0 && <ApiVariants kind="item" variants={related.variants.content} />}
        </DetainItem>

        <DetainItem size={isMobile ? undefined : 6} startIcon={<Redeem color="primary" />} label="Códigos de resgate" count={related.rewardOf.total}>
          {related.rewardOf.content.length > 0 && <ApiRewardCodes codes={related.rewardOf.content} target={self} />}
        </DetainItem>
      </DetainContainer>
    </StyledContainer>
  );
}
