import { Box, Paper, Tooltip, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import type { LevelOperator, Reference, ResolvedReference } from "../../api/content";
import { contentRoute } from "../../api/references";
import { formatChance, formatLevelRequirement, formatRange } from "../../utils/format";
import { ContentIcon } from "./ContentIcon";
import { LevelBadge } from "./LevelBadge";

const SIZES = {
  small: { box: 32, icon: 22, badge: 16, fontSize: "0.6rem" },
  medium: { box: 40, icon: 28, badge: 18, fontSize: "0.65rem" },
  large: { box: 56, icon: 40, badge: 22, fontSize: "0.75rem" },
  extraLarge: { box: 100, icon: 76, badge: 30, fontSize: "1rem" },
};

export interface ContentChipProps {
  target: Reference;
  /** Nome, ícone e tipo encontrados na API. Sem `resolvedKind`, o alvo não está cadastrado. */
  resolved?: ResolvedReference;
  amount?: number | null;
  maxAmount?: number | null;
  level?: number | null;
  /** Com level, diz que o nível é exigência: "nível 2 ou mais" no tooltip e "2+" no selo. */
  levelOperator?: LevelOperator | null;
  chance?: number | null;
  notConsumed?: boolean;
  /** Produto de receita: selo de quantidade destacado. */
  product?: boolean;
  /** Borda destacada, ex.: o item da página dentro de uma receita. */
  highlight?: boolean;
  rarityColor?: string;
  size?: keyof typeof SIZES;
  disableLink?: boolean;
}

/**
 * Ícone de qualquer conteúdo citado pela API, com quantidade, nível e dica. Alvo não cadastrado
 * aparece com borda tracejada e sem link.
 */
export function ContentChip({
  target,
  resolved,
  amount,
  maxAmount = null,
  level,
  levelOperator = null,
  chance,
  notConsumed = false,
  product = false,
  highlight = false,
  rarityColor,
  size = "large",
  disableLink = false,
}: ContentChipProps) {
  const navigate = useNavigate();
  const { gameId = "" } = useParams<{ gameId: string }>();
  const config = SIZES[size];

  const kind = resolved?.resolvedKind ?? target.kind ?? null;
  const registered = Boolean(resolved?.resolvedKind);
  const name = resolved?.name ?? target.extId;
  const route = disableLink || !registered ? null : contentRoute(gameId, kind, target.extId);
  const hasAmount = amount !== null && amount !== undefined && amount !== 0;

  const details = [
    hasAmount ? `${formatRange(amount, maxAmount)}x` : null,
    level ? formatLevelRequirement(level, levelOperator) : null,
    chance !== null && chance !== undefined ? formatChance(chance) : null,
    notConsumed ? "não é gasto" : null,
    registered ? null : "não cadastrado",
  ].filter(Boolean);
  const title = details.length ? `${name} (${details.join(" · ")})` : name;

  return (
    <Tooltip title={title} arrow>
      <Box
        onClick={
          route
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                navigate(route);
              }
            : undefined
        }
        sx={{ position: "relative", width: config.box, height: config.box, flexShrink: 0, cursor: route ? "pointer" : "default" }}
      >
        <Paper
          variant="outlined"
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 1,
            overflow: "hidden",
            borderStyle: registered ? "solid" : "dashed",
            borderColor: rarityColor ?? (highlight || product ? "primary.main" : registered ? "divider" : "warning.dark"),
            opacity: notConsumed ? 0.75 : 1,
            transition: "transform 0.2s",
            "&:hover": route ? { transform: "scale(1.08)", borderColor: "primary.main" } : undefined,
          }}
        >
          <ContentIcon mediaId={resolved?.iconMediaId} kind={kind} alt={name} size={config.icon} />
        </Paper>
        <LevelBadge level={level} operator={levelOperator} size={size === "extraLarge" ? "large" : "small"} />
        {hasAmount && (
          <Box
            sx={{
              position: "absolute",
              bottom: -4,
              right: -4,
              minWidth: config.badge,
              height: config.badge,
              px: 0.5,
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: product ? "primary.main" : "background.paper",
              color: product ? "primary.contrastText" : "text.primary",
              border: 1,
              borderColor: "divider",
              zIndex: 1,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: config.fontSize, lineHeight: 1 }}>
              {formatRange(amount, maxAmount)}
            </Typography>
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}
