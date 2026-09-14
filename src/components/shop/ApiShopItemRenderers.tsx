import type { ReactNode } from "react";
import { Box, Card, Stack, Tooltip, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { Rarity, ShopItem } from "../../api/content";
import { contentRoute, type ReferenceIndex } from "../../api/references";
import { formatAmount, formatReset } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { ContentIcon } from "../common/ContentIcon";
import { DataChip } from "../common/DataChip";

/** O que os renderers de oferta precisam além dela. */
export interface ShopItemView {
  gameId: string;
  /** Referências resolvidas do detalhe da loja: alvos e moedas das ofertas. */
  references: ReferenceIndex;
  rarities: Map<string, Rarity>;
}

export function shopItemRarityColor(view: ShopItemView, item: ShopItem): string | undefined {
  return item.rarityCode ? view.rarities.get(item.rarityCode)?.color : undefined;
}

/** Tamanho do pacote, quando a oferta vende mais de uma unidade. */
function packSize(item: ShopItem): number | null {
  return item.quantity !== null && item.quantity > 1 ? item.quantity : null;
}

function unitPrice(item: ShopItem): string | null {
  const pack = packSize(item);
  return pack && item.price !== null ? `~${formatAmount(item.price / pack)}/un` : null;
}

/** Rota do alvo da oferta; nula quando não está cadastrado. */
function targetRoute(view: ShopItemView, item: ShopItem): string | null {
  const resolved = view.references.find(item.target);
  return resolved?.resolvedKind ? contentRoute(view.gameId, resolved.resolvedKind, item.target.extId) : null;
}

function OfferPrice({ item, view }: { item: ShopItem; view: ShopItemView }) {
  if (item.price === null) {
    return (
      <Typography variant="caption" color="text.secondary">
        Preço não informado
      </Typography>
    );
  }
  const unit = unitPrice(item);
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {item.currency && <ContentChip target={item.currency} resolved={view.references.find(item.currency)} size="small" />}
      <Typography variant="body2" fontWeight={800}>
        {formatAmount(item.price)}
      </Typography>
      {unit && (
        <Typography variant="caption" color="text.secondary">
          ({unit})
        </Typography>
      )}
    </Stack>
  );
}

/** Limite e reset próprios da oferta. O reset da categoria aparece no cabeçalho dela. */
function OfferTerms({ item, showUnlimited = false }: { item: ShopItem; showUnlimited?: boolean }) {
  if (item.purchaseLimit === null && !item.resetType && !showUnlimited) return null;
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent={showUnlimited ? "flex-end" : "flex-start"}>
      {item.purchaseLimit !== null ? (
        <DataChip label={`Limite ${formatAmount(item.purchaseLimit)}`} />
      ) : (
        showUnlimited && <DataChip label="Sem limite" variant="outlined" />
      )}
      {item.resetType && <DataChip label={formatReset(item.resetType)} />}
    </Stack>
  );
}

/** Card de uma oferta da loja: o alvo, pacote, preço na moeda, limite e reset. */
export function ApiShopItemCard({ item, variant, view }: { item: ShopItem; variant: "default" | "compact"; view: ShopItemView }) {
  const navigate = useNavigate();
  const resolved = view.references.find(item.target);
  const name = resolved?.name ?? item.target.extId;
  const color = shopItemRarityColor(view, item);
  const route = targetRoute(view, item);
  const pack = packSize(item);

  return (
    <Card
      onClick={route ? () => navigate(route) : undefined}
      sx={{
        height: "100%",
        cursor: route ? "pointer" : "default",
        borderRadius: 1,
        border: 1,
        borderColor: color ?? "divider",
        backgroundColor: color ? `${color}11` : undefined,
        transition: "all 0.3s",
        "&:hover": route ? { transform: "translateY(-4px)", borderColor: color ?? "primary.main" } : undefined,
      }}
    >
      {variant === "compact" ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 2, textAlign: "center" }}>
          <ContentChip target={item.target} resolved={resolved} amount={pack} rarityColor={color} size="large" disableLink />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, color: color ?? "text.primary" }}>
            {name}
          </Typography>
          <OfferPrice item={item} view={view} />
          <OfferTerms item={item} />
        </Stack>
      ) : (
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <ContentChip target={item.target} resolved={resolved} amount={pack} rarityColor={color} size="large" disableLink />
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: color ?? "text.primary" }}>
                {name}
              </Typography>
              {pack && (
                <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 800 }}>
                  Pacote com {formatAmount(pack)} unidades
                </Typography>
              )}
            </Stack>
          </Stack>
          <OfferPrice item={item} view={view} />
          <OfferTerms item={item} />
        </Stack>
      )}
    </Card>
  );
}

function OfferNameCell({ item, view }: { item: ShopItem; view: ShopItemView }) {
  const resolved = view.references.find(item.target);
  const color = shopItemRarityColor(view, item);
  const pack = packSize(item);
  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <ContentChip target={item.target} resolved={resolved} rarityColor={color} size="small" />
      <Typography variant="body2" sx={{ fontWeight: 700, color: color ?? "text.primary" }}>
        {resolved?.name ?? item.target.extId}
      </Typography>
      {pack && <DataChip label={`Pacote com ${formatAmount(pack)}`} color="primary" />}
    </Stack>
  );
}

/** Colunas da visão em lista: oferta, preço e limite/reset. */
export function shopItemListCells(item: ShopItem, view: ShopItemView): ReactNode[] {
  return [
    <OfferNameCell key="name" item={item} view={view} />,
    <Stack key="price" direction="row" justifyContent="flex-end">
      <OfferPrice item={item} view={view} />
    </Stack>,
    <OfferTerms key="terms" item={item} showUnlimited />,
  ];
}

export function ApiShopItemIcon({ item, view }: { item: ShopItem; view: ShopItemView }) {
  const navigate = useNavigate();
  const resolved = view.references.find(item.target);
  const name = resolved?.name ?? item.target.extId;
  const route = targetRoute(view, item);
  const pack = packSize(item);
  const details = [
    pack ? `pacote com ${formatAmount(pack)}` : null,
    item.price !== null ? `${formatAmount(item.price)}${item.currency ? ` ${view.references.name(item.currency)}` : ""}` : null,
    unitPrice(item),
    item.purchaseLimit !== null ? `limite ${formatAmount(item.purchaseLimit)}` : null,
    item.resetType ? formatReset(item.resetType) : null,
  ].filter(Boolean);

  return (
    <Tooltip title={details.length ? `${name} (${details.join(" · ")})` : name}>
      <Box
        onClick={route ? () => navigate(route) : undefined}
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 1,
          cursor: route ? "pointer" : "default",
        }}
      >
        <ContentIcon mediaId={resolved?.iconMediaId} kind={resolved?.resolvedKind ?? item.target.kind} alt={name} size={56} />
        {pack && (
          <Box sx={{ position: "absolute", top: 2, right: 2, px: 0.5, borderRadius: 0.5, bgcolor: "primary.main", color: "primary.contrastText" }}>
            <Typography sx={{ fontSize: "0.6rem", fontWeight: 900 }}>{formatAmount(pack)}x</Typography>
          </Box>
        )}
        {item.price !== null && (
          <DataChip label={formatAmount(item.price)} sx={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)" }} />
        )}
      </Box>
    </Tooltip>
  );
}
