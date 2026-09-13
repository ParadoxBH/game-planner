import { Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import type { Reference, ShopCategoryDocument, ShopItem } from "../../api/content";
import { contentRoute, sameTarget, type ReferenceIndex } from "../../api/references";
import { formatAmount, formatReset } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";

export interface ShopOffer {
  category: ShopCategoryDocument;
  offer: ShopItem;
  index: number;
}

/** As ofertas de um alvo dentro das categorias de loja que o vendem. */
export function offersFor(categories: ShopCategoryDocument[], target: Reference): ShopOffer[] {
  return categories.flatMap((category) =>
    category.items
      .map((offer, index) => ({ category, offer, index }))
      .filter(({ offer }) => sameTarget(offer.target, target)),
  );
}

/** Onde comprar: loja, categoria, preço na moeda, pacote, limite e reset. */
export function ApiShopOffers({ offers, references }: { offers: ShopOffer[]; references: ReferenceIndex }) {
  const navigate = useNavigate();
  const { gameId = "" } = useParams<{ gameId: string }>();

  return (
    <Stack spacing={1}>
      {offers.map(({ category, offer, index }) => {
        const reset = offer.resetType ?? category.resetType;
        return (
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
                {reset && <DataChip label={formatReset(reset)} />}
              </Stack>
            </Stack>
            {offer.price !== null &&
              (offer.currency ? (
                <ContentChip target={offer.currency} resolved={references.find(offer.currency)} amount={offer.price} size="medium" />
              ) : (
                <Typography variant="body2" fontWeight={800}>
                  {formatAmount(offer.price)}
                </Typography>
              ))}
          </DataCard>
        );
      })}
    </Stack>
  );
}
