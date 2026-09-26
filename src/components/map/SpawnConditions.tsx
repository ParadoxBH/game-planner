import { Stack, Tooltip } from "@mui/material";
import type { SpawnCondition } from "../../api/content";
import type { ReferenceIndex } from "../../api/references";
import { GATING_TYPES } from "../../domain/spawn/conditions";
import { DataChip } from "../common/DataChip";
import { describeCondition } from "./spawnConditionLabels";

interface SpawnConditionListProps {
  conditions: SpawnCondition[];
  references?: ReferenceIndex;
  /** Só as que filtram, para a tela que já explica as descritivas de outro jeito. */
  gatingOnly?: boolean;
}

/**
 * As condições de um ponto de surgimento, como chips. Linha negada sai em cor de erro: ela diz onde
 * a regra deixa de valer, e confundir isso com o contrário inverteria o sentido.
 */
export function SpawnConditionList({ conditions, references, gatingOnly }: SpawnConditionListProps) {
  const shown = gatingOnly ? conditions.filter((condition) => GATING_TYPES.has(condition.type)) : conditions;
  if (shown.length === 0) return null;

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5}>
      {shown.map((condition, index) => {
        const text = describeCondition(condition, references);
        return (
          <Tooltip key={`${condition.type}-${index}`} title={text}>
            <DataChip
              size="small"
              label={text}
              color={condition.negated ? "error" : undefined}
              variant={condition.negated ? "outlined" : "filled"}
            />
          </Tooltip>
        );
      })}
    </Stack>
  );
}
