import { Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import type {
  CollectionGroupDocument,
  EntityDocument,
  RedemptionCodeDocument,
  Reference,
} from "../../api/content";
import { contentRoute, resolvedFrom, sameTarget, type ReferenceIndex } from "../../api/references";
import { formatAmount, formatChance, formatDate, formatRange } from "../../utils/format";
import { ContentChip } from "./ContentChip";
import { DataCard } from "./DataCard";
import { DataChip } from "./DataChip";

/** Entidades que dropam o alvo, com a quantidade e a chance de cada entrada. */
export function ApiDroppedBy({ entities, target }: { entities: EntityDocument[]; target: Reference }) {
  const navigate = useNavigate();
  const { gameId = "" } = useParams<{ gameId: string }>();

  return (
    <Stack spacing={1}>
      {entities.map((entity) => (
        <DataCard
          key={entity.extId}
          onClick={() => navigate(contentRoute(gameId, "entity", entity.extId)!)}
          sx={{ p: 1.5, gap: 2 }}
        >
          <ContentChip
            target={{ kind: "entity", extId: entity.extId }}
            resolved={resolvedFrom("entity", entity)}
            size="medium"
            disableLink
          />
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700}>
              {entity.name}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {entity.drops
                .filter((drop) => sameTarget(drop.target, target))
                .map((drop, index) => (
                  <DataChip key={index} label={`${formatRange(drop.amount, drop.maxAmount)}x · ${formatChance(drop.chance)}`} />
                ))}
            </Stack>
          </Stack>
        </DataCard>
      ))}
    </Stack>
  );
}

/** Entidades que exigem o alvo para serem coletadas. */
export function ApiRequiredBy({ entities, target }: { entities: EntityDocument[]; target: Reference }) {
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
      {entities.map((entity) => {
        const requirement = entity.requirements.find((candidate) => sameTarget(candidate.target, target));
        return (
          <ContentChip
            key={entity.extId}
            target={{ kind: "entity", extId: entity.extId }}
            resolved={resolvedFrom("entity", entity)}
            amount={requirement?.amount}
            notConsumed={requirement?.notConsumed}
          />
        );
      })}
    </Stack>
  );
}

/** Códigos de resgate que dão o alvo, com validade. */
export function ApiRewardCodes({ codes, target }: { codes: RedemptionCodeDocument[]; target: Reference }) {
  const navigate = useNavigate();
  const { gameId = "" } = useParams<{ gameId: string }>();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Stack spacing={1}>
      {codes.map((code) => {
        const reward = code.rewards.find((candidate) => sameTarget(candidate.target, target));
        const expired = code.expiresOn !== null && code.expiresOn < today;
        return (
          <DataCard
            key={code.extId}
            onClick={() => navigate(contentRoute(gameId, "redemption_code", code.extId)!)}
            sx={{ p: 1.5, gap: 1, justifyContent: "space-between" }}
          >
            <Stack>
              <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                {code.extId}
              </Typography>
              <Typography variant="caption" color={expired ? "error" : "text.secondary"}>
                {code.expiresOn ? `${expired ? "Expirou" : "Expira"} em ${formatDate(code.expiresOn)}` : "Sem validade"}
              </Typography>
            </Stack>
            {reward && <DataChip label={`${formatAmount(reward.amount)}x`} />}
          </DataCard>
        );
      })}
    </Stack>
  );
}

/** Grupos de coleção de que o conteúdo faz parte. */
export function ApiCollectionGroups({ groups, references }: { groups: CollectionGroupDocument[]; references: ReferenceIndex }) {
  const navigate = useNavigate();
  const { gameId = "" } = useParams<{ gameId: string }>();

  return (
    <Stack spacing={1}>
      {groups.map((group) => (
        <DataCard
          key={group.extId}
          onClick={group.collections[0] ? () => navigate(contentRoute(gameId, "collection", group.collections[0])!) : undefined}
          sx={{ p: 1.5, flexDirection: "column", alignItems: "stretch", gap: 0.5 }}
        >
          <Typography variant="body2" fontWeight={700}>
            {group.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {group.collections.map((id) => references.name({ kind: "collection", extId: id })).join(", ")}
          </Typography>
        </DataCard>
      ))}
    </Stack>
  );
}

/** Variantes do conteúdo, como chips com nível. */
export function ApiVariants({ kind, variants }: { kind: "item" | "entity"; variants: (EntityDocument | { extId: string; name: string; level: number | null; media: EntityDocument["media"] })[] }) {
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
      {variants.map((variant) => (
        <ContentChip
          key={variant.extId}
          target={{ kind, extId: variant.extId }}
          resolved={resolvedFrom(kind, variant)}
          level={variant.level}
          size="medium"
        />
      ))}
    </Stack>
  );
}
