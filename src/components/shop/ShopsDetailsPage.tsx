import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Box, CircularProgress, Divider, Paper, Stack, Typography } from "@mui/material";
import { Map as MapIcon, Storefront } from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import {
  MAX_PAGE_SIZE,
  type Reference,
  type ShopCategoryDocument,
  type ShopDocument,
  type ShopRelated,
  type SpawnPointDocument,
} from "../../api/content";
import { currentMedia, mediaUrl, ReferenceIndex, resolvedFrom } from "../../api/references";
import { useContentDetails, useContentList, useRarities } from "../../api/useContent";
import { and, rule } from "../../api/query";
import { useEventFilter } from "../../context/EventFilterContext";
import { useViewMode } from "../../hooks/useViewMode";
import { formatReset } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { DataChip } from "../common/DataChip";
import { DetailField, ReferenceChips } from "../common/DetailField";
import { DetainContainer } from "../common/DetainContainer";
import { DetainItem } from "../common/DetainItem";
import { ListingDataView } from "../common/ListingDataView";
import { SpawnPointsByMap } from "../common/SpawnPointsByMap";
import { StyledContainer } from "../common/StyledContainer";
import { ViewModeSelector } from "../common/ViewModeSelector";
import {
  ApiShopItemCard,
  ApiShopItemIcon,
  shopItemListCells,
  shopItemRarityColor,
  type ShopItemView,
} from "./ApiShopItemRenderers";
import { ShopPicker } from "./ApiShopRenderers";

/** Categoria sem evento ou com algum evento ativo: a mesma regra do filtro activeEvents da API. */
function isAvailable(category: ShopCategoryDocument, activeEventIds: string[]): boolean {
  return category.events.length === 0 || category.events.some((id) => activeEventIds.includes(id));
}

interface ShopsDetailsPageProps {
  gameId: string;
  shopId: string;
}

/** Loja lida do agregado /shops/{id}/details: o NPC, onde encontrá-lo e as categorias com os itens à venda. */
export function ShopsDetailsPage({ gameId, shopId }: ShopsDetailsPageProps) {
  const { activeEventIds } = useEventFilter();
  const [itemsViewMode, setItemsViewMode] = useViewMode("shop_items");

  const details = useContentDetails<ShopDocument, ShopRelated>(gameId, "shops", shopId);
  const rarities = useRarities(gameId);
  const references = useMemo(() => new ReferenceIndex(details.data?.references), [details.data]);

  const npc = details.data?.document.npc ?? null;
  const npcSpawns = useContentList<SpawnPointDocument>(
    gameId,
    "spawn-points",
    { size: MAX_PAGE_SIZE, where: and(rule("occupant", "equal", `entity:${npc}`)), references: true },
    { enabled: npc !== null },
  );
  const spawnReferences = useMemo(() => new ReferenceIndex(npcSpawns.data?.references), [npcSpawns.data]);

  const view = useMemo<ShopItemView>(
    () => ({ gameId, references, rarities: new Map((rarities.data ?? []).map((rarity) => [rarity.code, rarity])) }),
    [gameId, references, rarities.data],
  );

  const actions = (
    <Stack direction="row" spacing={1} justifyContent="space-between" flex={1} alignItems="center">
      <ShopPicker gameId={gameId} value={shopId} />
      <ViewModeSelector mode={itemsViewMode} onChange={setItemsViewMode} />
    </Stack>
  );

  if (details.isPending) {
    return (
      <StyledContainer title="Carregando..." label="Obtendo dados da loja" actionsStart={actions}>
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
        title={unregistered ? "Loja não cadastrada" : "Não foi possível abrir a loja"}
        label={unregistered ? `"${shopId}" é citada em outros conteúdos, mas ainda não foi cadastrada.` : details.error.message}
        actionsStart={actions}
      >
        <Typography variant="body2" color="text.secondary">
          Verifique o código ou volte para a <Link to={`/game/${gameId}/shops/list`}>lista de lojas</Link>.
        </Typography>
      </StyledContainer>
    );
  }

  const { document: shop, related } = details.data;
  const categories = related.categories.content;
  const available = categories.filter((category) => isAvailable(category, activeEventIds));
  const hiddenCount = categories.length - available.length;
  const bannerId = currentMedia(shop.media, "banner");
  const npcTarget: Reference | null = shop.npc ? { kind: "entity", extId: shop.npc } : null;

  return (
    <StyledContainer
      title={shop.name}
      label={npcTarget ? `Loja atendida por ${references.name(npcTarget)}` : `Detalhes da loja ${shop.extId}`}
      actionsStart={actions}
    >
      <DetainContainer>
        <Stack spacing={2}>
          <Paper elevation={0} sx={{ overflow: "hidden" }}>
            {bannerId && (
              <Box
                sx={{
                  height: 140,
                  backgroundImage: `url(${mediaUrl(bannerId, "thumb")})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
            <Stack alignItems="center" spacing={1} sx={{ p: 2 }}>
              {npcTarget ? (
                <ContentChip target={npcTarget} resolved={references.find(npcTarget)} size="extraLarge" />
              ) : (
                <ContentChip target={{ kind: "shop", extId: shop.extId }} resolved={resolvedFrom("shop", shop)} size="extraLarge" disableLink />
              )}
              <Typography variant="h5" fontWeight={800} color="primary.main" textAlign="center">
                {shop.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Código: {shop.extId}
              </Typography>
              {shop.resetType && <DataChip label={`Reset: ${formatReset(shop.resetType)}`} />}
            </Stack>

            <Divider />

            <Stack spacing={2} sx={{ p: 2 }}>
              <DetailField label="Atendida por">
                {npcTarget ? (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <ContentChip target={npcTarget} resolved={references.find(npcTarget)} size="medium" />
                    <Typography variant="body2" fontWeight={700}>
                      {references.name(npcTarget)}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Loja global, sem NPC
                  </Typography>
                )}
              </DetailField>

              {(shop.summary || shop.description) && (
                <DetailField label="Descrição">
                  {shop.summary && <Typography variant="body2">{shop.summary}</Typography>}
                  {shop.description && (
                    <Typography variant="body2" color="text.secondary">
                      {shop.description}
                    </Typography>
                  )}
                </DetailField>
              )}

              {shop.categories.length > 0 && (
                <DetailField label="Categorias">
                  <ReferenceChips targets={shop.categories.map((id) => ({ kind: "category", extId: id }))} references={references} />
                </DetailField>
              )}

              {shop.events.length > 0 && (
                <DetailField label="Eventos">
                  <ReferenceChips targets={shop.events.map((id) => ({ kind: "event", extId: id }))} references={references} />
                </DetailField>
              )}

              {hiddenCount > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {hiddenCount === 1
                    ? "1 categoria da loja está oculta porque o evento dela não está ativo."
                    : `${hiddenCount} categorias da loja estão ocultas porque os eventos delas não estão ativos.`}
                </Typography>
              )}
            </Stack>
          </Paper>

          {shop.npc && npcSpawns.data && npcSpawns.data.content.length > 0 && (
            <Paper elevation={0} sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <MapIcon color="primary" sx={{ fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={800}>
                  Onde encontrar
                </Typography>
              </Stack>
              <SpawnPointsByMap points={npcSpawns.data.content} filter={{ param: "entity", value: shop.npc }} references={spawnReferences} />
            </Paper>
          )}
        </Stack>

        {available.length === 0 ? (
          <DetainItem startIcon={<Storefront color="primary" />} label="Itens à venda">
            <Typography variant="body2" color="text.secondary">
              {categories.length === 0
                ? "Nenhuma categoria cadastrada para esta loja."
                : "Nenhuma categoria disponível com os eventos ativos."}
            </Typography>
          </DetainItem>
        ) : (
          available.map((category) => (
            <DetainItem
              key={category.extId}
              startIcon={<Storefront color="primary" />}
              label={category.name}
              count={category.items.length}
              actions={
                category.resetType || category.events.length > 0 ? (
                  <>
                    {category.resetType && <DataChip label={`Reset: ${formatReset(category.resetType)}`} />}
                    {category.events.map((id) => (
                      <DataChip key={id} label={references.name({ kind: "event", extId: id })} color="secondary" />
                    ))}
                  </>
                ) : undefined
              }
            >
              {category.items.length > 0 ? (
                <ListingDataView
                  data={category.items}
                  viewMode={itemsViewMode}
                  variant="compact"
                  cardMinWidth={200}
                  listHeader={[
                    { label: "Item", width: "50%" },
                    { label: "Preço", align: "right" as const, width: "25%" },
                    { label: "Limite / reset", align: "right" as const, width: "25%" },
                  ]}
                  getRowColor={(item) => shopItemRarityColor(view, item)}
                  renderCard={(item, variant) => <ApiShopItemCard item={item} variant={variant} view={view} />}
                  renderListItem={(item) => shopItemListCells(item, view)}
                  renderIconItem={(item) => <ApiShopItemIcon item={item} view={view} />}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhum item nesta categoria.
                </Typography>
              )}
            </DetainItem>
          ))
        )}
      </DetainContainer>
    </StyledContainer>
  );
}
