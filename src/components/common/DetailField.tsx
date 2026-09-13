import type { ReactNode } from "react";
import { Stack, Typography } from "@mui/material";
import type { Reference } from "../../api/content";
import type { ReferenceIndex } from "../../api/references";
import { ContentChip } from "./ContentChip";

/** Campo rotulado do painel lateral das telas de detalhe. */
export function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
      {children}
    </Stack>
  );
}

/** Referências citadas pelo documento, como chips com nome e ícone resolvidos. */
export function ReferenceChips({
  targets,
  references,
  size = "small",
}: {
  targets: Reference[];
  references: ReferenceIndex;
  size?: "small" | "medium" | "large";
}) {
  return (
    <ChipRow>
      {targets.map((target) => (
        <ContentChip key={`${target.kind ?? ""}:${target.extId}`} target={target} resolved={references.find(target)} size={size} />
      ))}
    </ChipRow>
  );
}
