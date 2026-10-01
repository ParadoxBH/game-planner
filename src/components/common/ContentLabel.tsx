import { Box, Stack, Typography, useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { contentRoute } from "../../api/references";
import { ContentChip, type ContentChipProps } from "./ContentChip";

export type ContentLabelVariant = "text" | "outlined" | "contained";

export interface ContentLabelProps extends Omit<ContentChipProps, "size"> {
  /** text (padrão): só ícone e nome; outlined: com borda; contained: com fundo, como um cartão. */
  variant?: ContentLabelVariant;
  size?: "small" | "medium";
  /** Troca o nome do conteúdo, ex.: o título da receita ao lado do ícone do produto. */
  label?: ReactNode;
  /** Linha menor embaixo do nome, ex.: o NPC de uma loja. */
  caption?: ReactNode;
  /** Conteúdo à direita do nome, ex.: "x3" ou um DataChip. */
  endAdornment?: ReactNode;
  /** Troca a navegação para a tela do conteúdo, ex.: abrir o resumo no drawer do mapa. */
  onClick?: () => void;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Cartãozinho horizontal de um conteúdo citado: ícone (o mesmo ContentChip, com quantidade, nível e
 * dica) e o nome à direita. Serve quando o lugar cita um conteúdo só, onde o ícone sozinho deixaria
 * um espaço vazio sem dizer o que é; com vários, o ContentChip continua melhor.
 */
export function ContentLabel({
  variant = "text",
  size = "small",
  label,
  caption,
  endAdornment,
  onClick,
  fullWidth = false,
  sx,
  ...chip
}: ContentLabelProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const { gameId = "" } = useParams<{ gameId: string }>();
  const { target, resolved, rarityColor, disableLink = false, linkUnregistered = false } = chip;

  const kind = resolved?.resolvedKind ?? target.kind ?? null;
  const registered = Boolean(resolved?.resolvedKind);
  const name = resolved?.name ?? target.extId;
  const route = disableLink || !(registered || linkUnregistered) ? null : contentRoute(gameId, kind, target.extId);
  const action = onClick ?? (route ? () => navigate(route) : undefined);
  const framed = variant !== "text";

  return (
    <Box
      onClick={
        action
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              action();
            }
          : undefined
      }
      sx={[
        {
          display: fullWidth ? "flex" : "inline-flex",
          width: fullWidth ? "100%" : undefined,
          maxWidth: "100%",
          minWidth: 0,
          alignItems: "center",
          gap: size === "small" ? 1 : 1.5,
          cursor: action ? "pointer" : "default",
          borderRadius: theme.designTokens.borderRadius,
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          ...(framed && {
            py: 0.5,
            pl: 0.5,
            pr: 1.5,
            border: 1,
            borderColor: variant === "outlined" ? "divider" : "transparent",
            bgcolor: variant === "contained" ? "rgba(255,255,255,0.06)" : "transparent",
          }),
          ...(action && {
            "&:hover": framed
              ? { bgcolor: "rgba(255, 68, 0, 0.08)", borderColor: "rgba(255, 68, 0, 0.4)" }
              : { "& .content-label-name": { color: rarityColor ?? "primary.main" } },
          }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <ContentChip {...chip} size={size} disableLink />
      <Stack sx={{ minWidth: 0, flex: fullWidth ? 1 : undefined, textAlign: "left" }}>
        <Typography
          className="content-label-name"
          variant={size === "small" ? "body2" : "subtitle2"}
          noWrap
          sx={{ fontWeight: 700, color: rarityColor ?? "text.primary", transition: "color 0.2s" }}
        >
          {label ?? name}
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ lineHeight: 1.3 }}>
            {caption}
          </Typography>
        )}
      </Stack>
      {endAdornment}
    </Box>
  );
}

export interface ContentReferencesProps {
  entries: ContentChipProps[];
  /** Até quantos conteúdos aparecem com nome (ContentLabel); acima disso, só os ícones. */
  labelMax?: number;
  variant?: ContentLabelVariant;
  size?: "small" | "medium";
  /**
   * Com nome, lado a lado no tamanho do conteúdo em vez da lista vertical de largura cheia; para
   * linhas que já têm outros selos, como o nó da árvore de produção.
   */
  inline?: boolean;
}

const entryKey = (entry: ContentChipProps, index: number) => `${entry.target.kind ?? ""}:${entry.target.extId}:${index}`;

/**
 * Lista de conteúdos citados que escolhe o formato pela quantidade: até labelMax, uma lista vertical
 * de cartões com ícone e nome ocupando a largura; acima disso, só os ícones lado a lado.
 */
export function ContentReferences({ entries, labelMax = 3, variant = "text", size = "small", inline = false }: ContentReferencesProps) {
  if (entries.length === 0) return null;
  if (entries.length <= labelMax && !inline) {
    return (
      <Stack spacing={0.5} sx={{ width: "100%", minWidth: 0 }}>
        {entries.map((entry, index) => (
          <ContentLabel key={entryKey(entry, index)} {...entry} variant={variant} size={size} fullWidth />
        ))}
      </Stack>
    );
  }
  const labeled = entries.length <= labelMax;
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
      {entries.map((entry, index) =>
        labeled ? (
          <ContentLabel key={entryKey(entry, index)} {...entry} variant={variant} size={size} />
        ) : (
          <ContentChip key={entryKey(entry, index)} {...entry} size={size} />
        ),
      )}
    </Stack>
  );
}
