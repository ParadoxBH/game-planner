function trim(value: number): string {
  return value % 1 === 0 ? value.toString() : Number(value.toFixed(2)).toString();
}

/** Quantidade curta: 950 → "950", 1500 → "1.5K", 2000000 → "2M". */
export function formatAmount(value: number): string {
  const size = Math.abs(value);
  if (size < 1000) return trim(value);
  if (size < 1_000_000) return `${trim(value / 1000)}K`;
  return `${trim(value / 1_000_000)}M`;
}

/** Faixa de quantidade: "3" ou "1-3". */
export function formatRange(amount: number | null, maxAmount: number | null): string {
  if (amount === null) return "?";
  return maxAmount !== null && maxAmount !== amount ? `${formatAmount(amount)}-${formatAmount(maxAmount)}` : formatAmount(amount);
}

/** Chance de 0 a 1 em porcentagem: 0.33 → "33%". */
export function formatChance(chance: number | null | undefined): string {
  if (chance === null || chance === undefined) return "chance não informada";
  return `${Number((chance * 100).toFixed(2))}%`;
}

/** 5400 → "1h 30min"; 45 → "45s". */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours ? `${hours}h` : "", minutes ? `${minutes}min` : "", rest || (!hours && !minutes) ? `${rest}s` : ""]
    .filter(Boolean)
    .join(" ");
}

/** Data ISO (2026-05-18) no formato local, sem deslocar o dia pelo fuso. */
export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString();
}

const RESET_LABELS: Record<string, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
  unique: "Único",
};

export function formatReset(resetType: string): string {
  return RESET_LABELS[resetType] ?? resetType;
}
