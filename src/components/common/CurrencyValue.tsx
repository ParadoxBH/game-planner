import { Stack, Typography } from "@mui/material";
import type { CurrencyAmount, Reference, ResolvedReference } from "../../api/content";
import { sameTarget } from "../../api/references";
import { formatAmount } from "../../utils/format";
import { ContentChip } from "./ContentChip";

/** Moeda de um valor calculado, com nome e ícone quando cadastrada. */
export function currencyReference(entry: CurrencyAmount): ResolvedReference | null {
  if (!entry.currency) return null;
  return {
    kind: entry.currency.kind ?? null,
    extId: entry.currency.extId,
    resolvedKind: entry.name ? entry.currency.kind ?? "item" : null,
    name: entry.name ?? null,
    iconMediaId: entry.iconMediaId ?? null,
  };
}

/** Mesma moeda: as duas sem moeda informada, ou o mesmo alvo. */
export function sameCurrency(a?: Reference | null, b?: Reference | null): boolean {
  return !a || !b ? !a && !b : sameTarget(a, b);
}

interface CurrencyValueProps {
  amount: number;
  /** Sem moeda, só o número. */
  currency?: ResolvedReference | null;
  color?: string;
}

/** Valor numa moeda: o número e, quando a moeda é conteúdo, o ícone dela. */
export function CurrencyValue({ amount, currency, color }: CurrencyValueProps) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
      <Typography variant="body2" fontWeight={800} color={color}>
        {formatAmount(amount)}
      </Typography>
      {currency && (
        <ContentChip target={{ kind: currency.kind, extId: currency.extId }} resolved={currency} size="small" disableLink />
      )}
    </Stack>
  );
}

/** Lista de valores por moeda, um ao lado do outro. */
export function CurrencyValues({ amounts, color }: { amounts: CurrencyAmount[]; color?: string }) {
  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
      {amounts.map((entry, index) => (
        <CurrencyValue key={index} amount={entry.amount} currency={currencyReference(entry)} color={color} />
      ))}
    </Stack>
  );
}
