import { useMemo, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
} from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import type { ItemDocument, ItemRelated, Reference, SpawnPointDocument } from "../../api/content";
import { contentRoute, currentMedia, ReferenceIndex, resolvedFrom, sameTarget } from "../../api/references";
import { useAttributeDefinitions, useContentDetails, useRarities } from "../../api/useContent";
import { usePlatform } from "../../hooks/usePlatform";
import { formatAmount, formatChance, formatDate, formatRange, formatReset } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";
import { DetainContainer } from "../common/DetainContainer";
import { DetainItem } from "../common/DetainItem";
import { StyledContainer } from "../common/StyledContainer";
import { ApiRecipeCard } from "../recipe/ApiRecipeCard";
import { attributeLabel } from "./ApiItemRenderers";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
      {children}
    </Stack>
  );
}

/** Pontos de spawn agrupados por mapa, com atalho para o mapa filtrado pelo item. */
function PointsByMap({
  points,
  itemId,
  references,
}: {
  points: SpawnPointDocument[];
  itemId: string;
  references: ReferenceIndex;
}) {
  const navigate = useNavigate();
  const { gameId = "" } = useParams<{ gameId: string }>();
  const groups = new Map<string, SpawnPointDocument[]>();
  points.forEach((point) => groups.set(point.map ?? "", [...(groups.get(point.map ?? "") ?? []), point]));

  return (
    <Grid container spacing={1}>
      {[...groups.entries()].map(([map, list]) => (
        <Grid size={{ xs: 12, md: 6 }} key={map || "sem-mapa"}>
          <DataCard
            onClick={
              map
                ? () => navigate(`/game/${gameId}/map/${encodeURIComponent(map)}?item=${encodeURIComponent(itemId)}`)
                : undefined
            }
            sx={{ p: 1.5, gap: 2 }}
          >
            <MapIcon color="primary" />
            <Stack>
              <Typography variant="body2" fontWeight={700}>
                {map ? references.name({ kind: "map", extId: map }) : "Sem mapa"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {list.length} {list.length === 1 ? "ocorrência" : "ocorrências"}
              </Typography>
            </Stack>
          </DataCard>
        </Grid>
      ))}
    </Grid>
  );
}

/** Detalhe de item, lido do agregado /items/{id}/details da API. */
export function ItemDetailsPage() {
  const { gameId = "", itemId = "" } = useParams<{ gameId: string; itemId: string }>();
  const navigate = useNavigate();
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
  const today = new Date().toISOString().slice(0, 10);

  const offers = related.soldIn.content.flatMap((category) =>
    category.items
      .map((offer, index) => ({ category, offer, index }))
      .filter(({ offer }) => sameTarget(offer.target, self)),
  );

  return (
    <StyledContainer
      title={item.name}
      label={`Detalhes e origens do item ${item.extId}`}
      actionsStart={
        <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
          <Link to={`/game/${gameId}`}>Dashboard</Link>
          <Link to={`/game/${gameId}/items/list`}>Itens</Link>
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
              <Field label="Categorias">
                <ChipRow>
                  {item.categories.map((id) => {
                    const target = { kind: "category", extId: id };
                    return <ContentChip key={id} target={target} resolved={references.find(target)} size="small" />;
                  })}
                </ChipRow>
              </Field>
            )}

            {(item.summary || item.description) && (
              <Field label="Descrição">
                {item.summary && <Typography variant="body2">{item.summary}</Typography>}
                {item.description && (
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                )}
              </Field>
            )}

            {(item.baseBuyPrice !== null || item.baseSellPrice !== null) && (
              <Field label="Preços base">
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
              </Field>
            )}

            {Object.keys(item.attributes).length > 0 && (
              <Field label="Atributos">
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {Object.entries(item.attributes).map(([key, value]) => (
                    <DataChip key={key} label={attributeLabel(key, value, definitions.get(key))} />
                  ))}
                </Stack>
              </Field>
            )}

            {item.variantOf && (
              <Field label="Variante de">
                <ChipRow>
                  <ContentChip
                    target={{ kind: "item", extId: item.variantOf }}
                    resolved={references.find({ kind: "item", extId: item.variantOf })}
                    size="medium"
                  />
                </ChipRow>
              </Field>
            )}

            {item.events.length > 0 && (
              <Field label="Eventos">
                <ChipRow>
                  {item.events.map((id) => {
                    const target = { kind: "event", extId: id };
                    return <ContentChip key={id} target={target} resolved={references.find(target)} size="small" />;
                  })}
                </ChipRow>
              </Field>
            )}

            {related.collectionGroups.content.length > 0 && (
              <Field label="Coleções">
                <Stack spacing={1}>
                  {related.collectionGroups.content.map((group) => (
                    <DataCard
                      key={group.extId}
                      onClick={
                        group.collections[0]
                          ? () => navigate(contentRoute(gameId, "collection", group.collections[0])!)
                          : undefined
                      }
                      sx={{ p: 1.5, flexDirection: "column", alignItems: "stretch", gap: 0.5 }}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {group.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.collections.map((id) => references.name({ kind: "collection", extId: id })).join(", ")}
                      </Typography>
                    </DataCard>
                  ))}
                </Stack>
              </Field>
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

        <DetainItem
          size={isMobile ? undefined : 6}
          startIcon={<Bolt color="primary" />}
          label="Dropado por"
          count={related.droppedBy.total}
        >
          {related.droppedBy.content.length > 0 && (
            <Stack spacing={1}>
              {related.droppedBy.content.map((entity) => (
                <DataCard
                  key={entity.extId}
                  onClick={() => navigate(contentRoute(gameId, "entity", entity.extId)!)}
                  sx={{ p: 1.5, gap: 2 }}
                >
                  <ContentChip
                    target={{ kind: "entity", extId: entity.extId }}
                    resolved={resolvedFrom("entity", entity)}
                    size="medium"
                    disableLink
                  />
                  <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {entity.name}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {entity.drops
                        .filter((drop) => sameTarget(drop.target, self))
                        .map((drop, index) => (
                          <DataChip
                            key={index}
                            label={`${formatRange(drop.amount, drop.maxAmount)}x · ${formatChance(drop.chance)}`}
                          />
                        ))}
                    </Stack>
                  </Stack>
                </DataCard>
              ))}
            </Stack>
          )}
        </DetainItem>

        <DetainItem
          size={isMobile ? undefined : 6}
          startIcon={<Storefront color="primary" />}
          label="Vendido em"
          count={offers.length}
        >
          {offers.length > 0 && (
            <Stack spacing={1}>
              {offers.map(({ category, offer, index }) => (
                <DataCard
                  key={`${category.extId}-${index}`}
                  onClick={category.shop ? () => navigate(contentRoute(gameId, "shop", category.shop!)!) : undefined}
                  sx={{ p: 1.5, gap: 2, justifyContent: "space-between" }}
                >
                  <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {category.shop ? references.name({ kind: "shop", extId: category.shop }) : category.name}
                    </Typography>
                    {category.shop && (
                      <Typography variant="caption" color="text.secondary">
                        {category.name}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {offer.quantity !== null && offer.quantity > 1 && <DataChip label={`Pacote com ${offer.quantity}`} />}
                      {offer.purchaseLimit !== null && <DataChip label={`Limite ${offer.purchaseLimit}`} />}
                      {(offer.resetType ?? category.resetType) && (
                        <DataChip label={formatReset((offer.resetType ?? category.resetType)!)} />
                      )}
                    </Stack>
                  </Stack>
                  {offer.price !== null &&
                    (offer.currency ? (
                      <ContentChip
                        target={offer.currency}
                        resolved={references.find(offer.currency)}
                        amount={offer.price}
                        size="medium"
                      />
                    ) : (
                      <Typography variant="body2" fontWeight={800}>
                        {formatAmount(offer.price)}
                      </Typography>
                    ))}
                </DataCard>
              ))}
            </Stack>
          )}
        </DetainItem>

        <DetainItem startIcon={<MapIcon color="primary" />} label="Locais de drop" count={related.dropPoints.total}>
          {related.dropPoints.content.length > 0 && (
            <PointsByMap points={related.dropPoints.content} itemId={item.extId} references={references} />
          )}
        </DetainItem>

        <DetainItem startIcon={<Place color="primary" />} label="Onde aparece" count={related.spawnPoints.total}>
          {related.spawnPoints.content.length > 0 && (
            <PointsByMap points={related.spawnPoints.content} itemId={item.extId} references={references} />
          )}
        </DetainItem>

        <DetainItem
          size={isMobile ? undefined : 6}
          startIcon={<Rule color="primary" />}
          label="Exigido para coletar"
          count={related.requiredBy.total}
        >
          {related.requiredBy.content.length > 0 && (
            <ChipRow>
              {related.requiredBy.content.map((entity) => {
                const requirement = entity.requirements.find((candidate) => sameTarget(candidate.target, self));
                return (
                  <ContentChip
                    key={entity.extId}
                    target={{ kind: "entity", extId: entity.extId }}
                    resolved={resolvedFrom("entity", entity)}
                    amount={requirement?.amount}
                    notConsumed={requirement?.notConsumed}
                  />
                );
              })}
            </ChipRow>
          )}
        </DetainItem>

        <DetainItem
          size={isMobile ? undefined : 6}
          startIcon={<Redeem color="primary" />}
          label="Códigos de resgate"
          count={related.rewardOf.total}
        >
          {related.rewardOf.content.length > 0 && (
            <Stack spacing={1}>
              {related.rewardOf.content.map((code) => {
                const reward = code.rewards.find((candidate) => sameTarget(candidate.target, self));
                const expired = code.expiresOn !== null && code.expiresOn < today;
                return (
                  <DataCard
                    key={code.extId}
                    onClick={() => navigate(contentRoute(gameId, "redemption_code", code.extId)!)}
                    sx={{ p: 1.5, gap: 1, justifyContent: "space-between" }}
                  >
                    <Stack>
                      <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                        {code.extId}
                      </Typography>
                      <Typography variant="caption" color={expired ? "error" : "text.secondary"}>
                        {code.expiresOn
                          ? `${expired ? "Expirou" : "Expira"} em ${formatDate(code.expiresOn)}`
                          : "Sem validade"}
                      </Typography>
                    </Stack>
                    {reward && <DataChip label={`${formatAmount(reward.amount)}x`} />}
                  </DataCard>
                );
              })}
            </Stack>
          )}
        </DetainItem>
      </DetainContainer>
    </StyledContainer>
  );
}
