import { Stack, Tooltip, Typography } from "@mui/material";
import { WarningAmber } from "@mui/icons-material";
import type { CraftProfit } from "../../api/content";
import { formatAmount } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";

export function profitColor(profit: number): string {
  return profit > 0 ? "success.main" : profit < 0 ? "error.main" : "text.secondary";
}

/** Produto da linha: ícone com link, nome e o tamanho do lote. */
export function ProfitItemCell({ row }: { row: CraftProfit }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <ContentChip
        target={row.target}
        resolved={{
          kind: row.target.kind ?? null,
          extId: row.target.extId,
          resolvedKind: row.name ? row.target.kind ?? "item" : null,
          name: row.name ?? null,
          iconMediaId: row.iconMediaId ?? null,
        }}
        size="small"
      />
      <Stack sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="body2" fontWeight={600}>
            {row.name ?? row.target.extId}
          </Typography>
          {row.incomplete && (
            <Tooltip title="Categoria em aberto, ciclo ou árvore grande demais: o custo está incompleto.">
              <WarningAmber color="warning" sx={{ fontSize: 16 }} />
            </Tooltip>
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {row.recipe ? `Lote de ${formatAmount(row.produced)}` : `Pacote de ${formatAmount(row.produced)} na loja`}
        </Typography>
      </Stack>
    </Stack>
  );
}

/** Bancadas da receita do produto; sem receita, a compra é na loja. */
export function ProfitStations({ row }: { row: CraftProfit }) {
  if (row.stations.length === 0) {
    return (
      <Typography variant="caption" sx={{ opacity: 0.7 }}>
        {row.recipe ? "-" : "Loja"}
      </Typography>
    );
  }
  return (
    <Stack direction="row" spacing={0.5}>
      {row.stations.map((station) => (
        <ContentChip key={station.extId} target={{ kind: "entity", extId: station.extId }} resolved={station} size="small" />
      ))}
    </Stack>
  );
}
