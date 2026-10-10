import type { ComponentType } from "react";
import { Calculate, Payments } from "@mui/icons-material";
import type { SvgIconComponent } from "@mui/icons-material";
import { CraftingCalculator } from "./CraftingCalculator";
import { ProfitabilityCalculator } from "./ProfitabilityCalculator";
import { ProfitPerTimeCalculator } from "./ProfitPerTimeCalculator";

export interface ToolGroup {
  label: string;
  /** Ícone de toda ferramenta do grupo, no menu e na página de Ferramentas. */
  icon: SvgIconComponent;
}

/**
 * Grupos das ferramentas do jogo. A ordem aqui é a ordem das seções na página; grupo sem nenhuma
 * ferramenta não aparece.
 */
export const TOOL_GROUPS = {
  calculator: { label: "Calculadora", icon: Calculate },
  finance: { label: "Financeiro", icon: Payments },
} satisfies Record<string, ToolGroup>;

export type ToolGroupId = keyof typeof TOOL_GROUPS;

export interface GameTool {
  /** Trecho da URL: a ferramenta abre em /game/:gameId/tools/:id. */
  id: string;
  group: ToolGroupId;
  title: string;
  /** Nome curto no dropdown do menu. */
  menuLabel: string;
  description: string;
  component: ComponentType;
}

/**
 * As ferramentas do jogo. Para criar uma nova, basta adicioná-la aqui: rota, menu e página de
 * Ferramentas saem desta lista. A ordem aqui é a ordem dentro do grupo e no menu.
 */
export const GAME_TOOLS: GameTool[] = [
  {
    id: "crafting",
    group: "calculator",
    title: "Calculadora de Crafting",
    menuLabel: "Crafting",
    description: "Calcule a quantidade total de recursos base necessários para fabricar itens complexos.",
    component: CraftingCalculator,
  },
  {
    id: "profitability",
    group: "finance",
    title: "Rentabilidade",
    menuLabel: "Rentabilidade",
    description: "Lista todos os crafts do jogo, mostrando o custo base de produção, preço de venda e o lucro estimado.",
    component: ProfitabilityCalculator,
  },
  {
    id: "profit-per-time",
    group: "finance",
    title: "Lucro por Tempo",
    menuLabel: "Lucro por tempo",
    description: "Analise quais itens rendem mais lucro por tempo, ideal para plantações e geradores automáticos.",
    component: ProfitPerTimeCalculator,
  },
];

/** Caminho de uma ferramenta dentro do jogo. */
export function toolPath(gameId: string, tool: GameTool) {
  return `/game/${gameId}/tools/${tool.id}`;
}
