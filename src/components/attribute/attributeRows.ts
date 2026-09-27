/** Uma chave de atributo do jogo no painel: a definição, o uso e os rótulos comuns ao painel e ao diálogo. */
import type { AttributeDefinition, AttributeUsage } from "../../api/content";

export const OTHERS = "Outros";
export const UNDEFINED = "Sem definição";

export const TYPE_LABELS: Record<AttributeDefinition["dataType"], string> = { number: "Número", text: "Texto", boolean: "Sim/não" };

/** Uma chave de atributo do jogo: a definição, se houver, e quantos itens e entidades a usam. */
export interface AttributeRow {
  key: string;
  definition?: AttributeDefinition;
  usage?: AttributeUsage;
}

export function sectionOf(row: AttributeRow): string {
  return row.definition ? (row.definition.group ?? OTHERS) : UNDEFINED;
}

export function usageText(usage: AttributeUsage | undefined): string {
  if (!usage) return "sem uso";
  const parts = [
    usage.items > 0 ? `${usage.items} ${usage.items === 1 ? "item" : "itens"}` : null,
    usage.entities > 0 ? `${usage.entities} ${usage.entities === 1 ? "entidade" : "entidades"}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}
