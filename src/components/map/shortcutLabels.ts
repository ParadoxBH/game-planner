/** Tipos de desbloqueio de atalho conhecidos, pelo código; tipo novo aparece com o próprio código. */
export const SHORTCUT_UNLOCK_LABELS: Record<string, string> = {
  quest: "Quest",
  boss: "Chefe derrotado",
  event: "Evento",
  player_level: "Nível do jogador",
  discovery: "Descobrir o local",
};

export function unlockLabel(type: string): string {
  return SHORTCUT_UNLOCK_LABELS[type] ?? type.replace(/_/g, " ");
}

/** Nome de exibição: o próprio, ou "Atalho para" o mapa do destino. */
export function shortcutName(name: string | null, destinationMapName: string): string {
  return name ?? `Atalho para ${destinationMapName}`;
}
