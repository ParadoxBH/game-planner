import { useMemo, useState } from "react";
import { Button, Chip, Stack, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import {
  MAX_PAGE_SIZE,
  type CategoryDocument,
  type EventDocument,
  type Reference,
  type SpawnCondition,
} from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentList } from "../../api/useContent";
import { ApiContentSelector } from "../common/ApiContentSelector";
import { CodesField, type CodeOption } from "../common/CodesField";
import { FormSection } from "../common/formLayout";
import { ReferenceName } from "../common/ReferenceName";
import { describeCondition } from "./spawnConditionLabels";

/** Tipos que o formulário edita, cada um com o tipo de conteúdo do alvo. Ver doc/spawn_and_spatial.md. */
const EDITABLE: Record<string, string> = {
  weather: "event",
  location_category: "category",
  bait: "item",
};

function line(type: string, target: Reference): SpawnCondition {
  return { type, value: null, target, min: null, max: null, negated: null };
}

/** A linha é das que o formulário edita: tipo conhecido, com alvo do tipo certo e sem "não". */
function isEditable(condition: SpawnCondition): boolean {
  const kind = EDITABLE[condition.type];
  return kind !== undefined && !condition.negated && condition.target !== null && condition.target.kind === kind;
}

function toOptions(documents: (EventDocument | CategoryDocument)[]): CodeOption[] {
  return documents.map((document) => ({
    extId: document.extId,
    name: document.name ?? document.extId,
    iconMediaId: currentMedia(document.media, "icon"),
  }));
}

interface SpawnConditionsFieldProps {
  gameId: string;
  value: SpawnCondition[];
  onChange: (conditions: SpawnCondition[]) => void;
}

/**
 * Condições da regra de surgimento. Clima, categoria de local e isca têm campo próprio — várias
 * escolhas no mesmo campo são OU, como as linhas do mesmo tipo. As demais linhas (as dos
 * mineradores, ou com "não") aparecem só para leitura e voltam intactas no salvar, porque o PUT
 * substitui o documento inteiro.
 */
export function SpawnConditionsField({ gameId, value, onChange }: SpawnConditionsFieldProps) {
  const [pickingBait, setPickingBait] = useState(false);
  const events = useContentList<EventDocument>(gameId, "events", { size: MAX_PAGE_SIZE, sort: "name" });
  const categories = useContentList<CategoryDocument>(gameId, "categories", { size: MAX_PAGE_SIZE, sort: "name" });

  const weatherOptions = useMemo(
    () => toOptions((events.data?.content ?? []).filter((event) => event.eventType === "clima")),
    [events.data],
  );
  const locationCategoryOptions = useMemo(
    () => toOptions((categories.data?.content ?? []).filter((category) => category.appliesTo === "location")),
    [categories.data],
  );

  const others = value.filter((condition) => !isEditable(condition));
  const targetsOf = (type: string) =>
    value.filter((condition) => isEditable(condition) && condition.type === type).map((condition) => condition.target!);
  const codesOf = (type: string) => targetsOf(type).map((target) => target.extId);

  /** Troca as linhas de um tipo pelas escolhidas, mantendo o resto. */
  const replace = (type: string, targets: Reference[]) =>
    onChange([
      ...value.filter((condition) => !(isEditable(condition) && condition.type === type)),
      ...targets.map((target) => line(type, target)),
    ]);
  const replaceCodes = (type: string, codes: string[]) =>
    replace(
      type,
      codes.map((extId) => ({ kind: EDITABLE[type], extId })),
    );

  const baits = targetsOf("bait");

  return (
    <>
      <FormSection title="Condições" />
      <Typography variant="caption" color="text.secondary">
        Todas as condições valem juntas; várias escolhas no mesmo campo, basta uma.
      </Typography>
      <CodesField
        label="Em locais da categoria"
        options={locationCategoryOptions}
        value={codesOf("location_category")}
        onChange={(codes) => replaceCodes("location_category", codes)}
        loading={categories.isPending}
        helperText="Ex.: Rio — vale em todo local marcado com a categoria, sem precisar escolher cada um."
      />
      <CodesField
        label="Clima"
        options={weatherOptions}
        value={codesOf("weather")}
        onChange={(codes) => replaceCodes("weather", codes)}
        loading={events.isPending}
        helperText="Vazio: qualquer clima."
      />
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" color="text.secondary">
          Isca:
        </Typography>
        {baits.length === 0 && (
          <Typography variant="body2" color="text.disabled">
            nenhuma
          </Typography>
        )}
        {baits.map((target) => (
          <Chip
            key={target.extId}
            label={<ReferenceName gameId={gameId} target={target} iconSize={18} />}
            onDelete={() =>
              replace(
                "bait",
                baits.filter((other) => other.extId !== target.extId),
              )
            }
          />
        ))}
        <Button size="small" startIcon={<Add />} onClick={() => setPickingBait(true)} sx={{ textTransform: "none" }}>
          Adicionar isca
        </Button>
      </Stack>
      {others.length > 0 && (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" color="text.secondary">
            Outras:
          </Typography>
          {others.map((condition, index) => (
            <Chip
              key={index}
              size="small"
              variant="outlined"
              label={describeCondition(condition)}
              onDelete={() => onChange(value.filter((other) => other !== condition))}
            />
          ))}
        </Stack>
      )}

      <ApiContentSelector
        open={pickingBait}
        onClose={() => setPickingBait(false)}
        onConfirm={(selection) => {
          if (!baits.some((target) => target.extId === selection.extId)) {
            replace("bait", [...baits, { kind: "item", extId: selection.extId }]);
          }
          setPickingBait(false);
        }}
        gameId={gameId}
        title="Selecionar isca"
        kinds={["items"]}
      />
    </>
  );
}
