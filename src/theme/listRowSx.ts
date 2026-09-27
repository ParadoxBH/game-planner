import { alpha, type SxProps, type Theme } from "@mui/material/styles";

/** A forma de função do sx: pode entrar numa lista de sx (`sx={[listRowSx(...), { p: 1 }]}`). */
export type ThemedSx = Extract<SxProps<Theme>, (theme: Theme) => unknown>;

export interface ListRowSxOptions {
  /**
   * Posição da linha na lista, para a listra (zebra): as ímpares ganham um fundo levemente mais claro. Sem índice,
   * a listra vem do CSS (:nth-of-type), que só funciona quando as linhas são irmãs do mesmo tipo de elemento.
   */
  index?: number;
  /** Linha escolhida: fundo na cor primária e barra à esquerda. */
  selected?: boolean;
  /** Linha com problema (ex.: valor inválido): fundo e barra na cor de erro. Vence selected. */
  error?: boolean;
  /** Linha que abre algo ao clicar: cursor de mão. O realce do hover vale sempre. */
  clickable?: boolean;
  /** Cor própria da linha, ex.: a da raridade; tinge o fundo e a barra. Selected e error vencem. */
  color?: string;
  /** Sem a listra, ex.: lista de uma linha só. */
  striped?: boolean;
}

/** Diferença entre linha par e ímpar: quase nada, só para o olho seguir a linha. */
const STRIPE = 0.025;
const HOVER = 0.07;
const SELECTED = 0.14;
const TINT = 0.07;

/**
 * sx padrão de linha de listagem (tabela, lista de cartões, linhas de formulário): listra zebra discreta, realce no
 * hover e os estados selecionado e erro, com uma barra de 3px à esquerda (box-shadow inset, que não muda o tamanho
 * da linha). Use no elemento da linha: `<TableRow sx={listRowSx({ index })}>`, `<Stack sx={[listRowSx({ index, error }), { p: 1 }]}>`.
 */
export function listRowSx({
  index,
  selected = false,
  error = false,
  clickable = false,
  color,
  striped = true,
}: ListRowSxOptions = {}): ThemedSx {
  return (theme: Theme) => {
    const accent = error ? theme.palette.error.main : selected ? theme.palette.primary.main : color;
    const stripe = alpha(theme.palette.common.white, STRIPE);
    const tint = accent ? alpha(accent, error || selected ? SELECTED * 0.7 : TINT) : undefined;
    const odd = index !== undefined && index % 2 === 1;

    return {
      transition: "background-color 0.15s ease, box-shadow 0.15s ease",
      cursor: clickable ? "pointer" : undefined,
      backgroundColor: tint ?? (striped && odd ? stripe : "transparent"),
      ...(striped && index === undefined && !tint && { "&:nth-of-type(even)": { backgroundColor: stripe } }),
      boxShadow: accent ? `inset 3px 0 0 ${accent}` : undefined,
      "&:hover": {
        backgroundColor: accent
          ? alpha(accent, (error || selected ? SELECTED : TINT) + HOVER * 0.6)
          : alpha(theme.palette.primary.main, HOVER),
      },
    };
  };
}
