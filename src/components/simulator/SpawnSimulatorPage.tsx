import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  MAX_PAGE_SIZE,
  type EventDocument,
  type LocationDocument,
  type MapDocument,
  type MarkerOccupant,
  type ResolvedReference,
  type SpawnRule,
} from "../../api/content";
import { ReferenceIndex } from "../../api/references";
import { useContentList, useSpawnRules } from "../../api/useContent";
import {
  explainConditions,
  matchesConditions,
  type Outcome,
  type TypeOutcome,
  type WorldSample,
} from "../../domain/spawn/conditions";
import { formatChance } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { DataCard } from "../common/DataCard";
import { DataChip } from "../common/DataChip";
import { DetainItem } from "../common/DetainItem";
import { StyledContainer } from "../common/StyledContainer";
import { SpawnConditionList } from "../map/SpawnConditions";
import { describeCondition } from "../map/spawnConditionLabels";

/** Nenhuma escolha: o controle não restringe nada e a condição fica desconhecida. */
const ANY = "";

interface Controls {
  location: string;
  altitude: string;
  depth: string;
  distance: string;
  timeOfDay: string;
  biomeArea: string;
  forest: string;
  weather: string;
  nearBase: string;
  progress: string[];
}

const EMPTY: Controls = {
  location: ANY,
  altitude: ANY,
  depth: ANY,
  distance: ANY,
  timeOfDay: ANY,
  biomeArea: ANY,
  forest: ANY,
  weather: ANY,
  nearBase: ANY,
  progress: [],
};

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Os controles viram a amostra. Vazio vira `undefined`, que o avaliador lê como desconhecido. */
function toSample(controls: Controls): WorldSample {
  return {
    biome: controls.location || undefined,
    altitude: numberOrNull(controls.altitude) ?? undefined,
    depth: numberOrNull(controls.depth) ?? undefined,
    distanceFromCenter: numberOrNull(controls.distance) ?? undefined,
    timeOfDay: controls.timeOfDay ? (controls.timeOfDay as "day" | "night") : undefined,
    biomeArea: controls.biomeArea ? (controls.biomeArea as "edge" | "interior") : undefined,
    forest: controls.forest ? controls.forest === "inside" : undefined,
    weather: controls.weather || undefined,
    nearBase: controls.nearBase ? controls.nearBase === "yes" : undefined,
    // Lista vazia é "nada derrotado ainda", que é uma resposta; por isso nunca é undefined.
    progress: controls.progress,
  };
}

interface Evaluated {
  rule: SpawnRule;
  outcome: Outcome;
  explained: TypeOutcome[];
}

/**
 * Simulador de surgimento: escolhe-se um ponto do mundo — bioma, altitude, horário, clima, chefes
 * derrotados — e a tela mostra o que nasce ali, o que *pode* nascer e, para o que não nasce, qual
 * condição barrou.
 *
 * O catálogo de regras vem numa requisição só; toda mudança de controle refiltra em memória, pelo
 * avaliador de src/domain/spawn. É o mesmo caminho que um leitor de save usaria, trocando os
 * controles por posições lidas do arquivo.
 */
export function SpawnSimulatorPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const [mapId, setMapId] = useState<string>("");
  const [controls, setControls] = useState<Controls>(EMPTY);
  const [showUnknown, setShowUnknown] = useState(true);
  const [showNearMisses, setShowNearMisses] = useState(false);

  const maps = useContentList<MapDocument>(gameId, "maps", { size: MAX_PAGE_SIZE });
  const mapList = useMemo(() => maps.data?.content ?? [], [maps.data]);
  const selectedMap = mapList.find((map) => map.extId === mapId) ?? mapList[0];
  const selectedId = selectedMap?.extId;

  const rules = useSpawnRules(gameId, selectedId);
  const locations = useContentList<LocationDocument>(gameId, "locations", { size: MAX_PAGE_SIZE });
  const events = useContentList<EventDocument>(gameId, "events", { size: MAX_PAGE_SIZE });

  const ruleList = useMemo(() => rules.data?.content ?? [], [rules.data]);
  const locationList = useMemo(
    () => (locations.data?.content ?? []).filter((location) => !location.map || location.map === selectedId),
    [locations.data, selectedId],
  );

  /**
   * As regras vêm no formato compacto, que já resolve o ocupante mas não o local nem o alvo da
   * condição (clima, chefe). Locais e eventos já estão carregados para os controles; o índice
   * reaproveita os dois, e o que não estiver nele aparece pelo código mesmo.
   */
  const references = useMemo(() => {
    const entries: ResolvedReference[] = [];
    (locations.data?.content ?? []).forEach((location) =>
      entries.push({ kind: "location", extId: location.extId, resolvedKind: "location", name: location.name, iconMediaId: null }),
    );
    (events.data?.content ?? []).forEach((event) =>
      entries.push({ kind: "event", extId: event.extId, resolvedKind: "event", name: event.name, iconMediaId: null }),
    );
    ruleList.forEach((rule) =>
      rule.occupants.forEach((occupant) => {
        if (occupant.name) {
          entries.push({
            kind: occupant.kind,
            extId: occupant.extId,
            resolvedKind: occupant.kind,
            name: occupant.name,
            iconMediaId: occupant.iconMediaId,
          });
        }
      }),
    );
    return new ReferenceIndex(entries);
  }, [locations.data, events.data, ruleList]);

  /**
   * Os chefes e chaves oferecidos saem do próprio catálogo, e não de uma lista fixa: assim a tela
   * continua certa em qualquer jogo, e some quando o jogo não tem progressão.
   */
  const progressOptions = useMemo(() => {
    const options = new Map<string, string>();
    ruleList.forEach((rule) =>
      rule.conditions.forEach((condition) => {
        if (condition.type !== "progress") return;
        const key = condition.target?.extId ?? condition.value;
        if (key) options.set(key, condition.target?.extId ?? condition.value ?? key);
      }),
    );
    return [...options.keys()].sort();
  }, [ruleList]);

  const weatherOptions = selectedMap?.weathers ?? [];

  const evaluated = useMemo<Evaluated[]>(() => {
    const sample = toSample(controls);
    return ruleList
      .filter((rule) => !controls.location || !rule.location || rule.location === controls.location)
      .map((rule) => ({
        rule,
        outcome: matchesConditions(sample, rule.conditions),
        explained: explainConditions(sample, rule.conditions),
      }));
  }, [ruleList, controls]);

  const matched = evaluated.filter((entry) => entry.outcome === "match");
  const unknown = evaluated.filter((entry) => entry.outcome === "unknown");
  /** Reprovou num tipo só: é o que responde "por que isso não aparece aqui?". */
  const nearMisses = evaluated.filter(
    (entry) => entry.outcome === "fail" && entry.explained.filter((type) => type.outcome === "fail").length === 1,
  );

  const set = (patch: Partial<Controls>) => setControls((current) => ({ ...current, ...patch }));

  if (maps.isPending) return <CircularProgress />;
  if (mapList.length === 0) return <Alert severity="info">Este jogo ainda não tem mapa.</Alert>;

  return (
    <StyledContainer
      title="Simulador de surgimento"
      label="Escolha um ponto do mundo e veja o que nasce ali. O que ficar em branco vale como desconhecido."
      actionsEnd={
        <Button size="small" onClick={() => setControls(EMPTY)} sx={{ textTransform: "none" }}>
          Limpar
        </Button>
      }
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Stack spacing={2}>
              {mapList.length > 1 && (
                <TextField
                  select
                  size="small"
                  label="Mapa"
                  value={selectedId ?? ""}
                  onChange={(event) => {
                    setMapId(event.target.value);
                    setControls(EMPTY);
                  }}
                >
                  {mapList.map((map) => (
                    <MenuItem key={map.extId} value={map.extId}>
                      {map.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                select
                size="small"
                label="Local"
                value={controls.location}
                onChange={(event) => set({ location: event.target.value })}
              >
                <MenuItem value={ANY}>Qualquer</MenuItem>
                {locationList.map((location) => (
                  <MenuItem key={location.extId} value={location.extId}>
                    {location.name}
                  </MenuItem>
                ))}
              </TextField>

              <NumberControl
                label="Altitude (m)"
                value={controls.altitude}
                onChange={(value) => set({ altitude: value })}
                min={-100}
                max={500}
              />
              <NumberControl
                label="Profundidade (m)"
                value={controls.depth}
                onChange={(value) => set({ depth: value })}
                min={0}
                max={200}
              />
              <NumberControl
                label="Distância do centro (m)"
                value={controls.distance}
                onChange={(value) => set({ distance: value })}
                min={0}
                max={10500}
                step={100}
              />

              <ChoiceControl
                label="Período"
                value={controls.timeOfDay}
                onChange={(value) => set({ timeOfDay: value })}
                options={[
                  ["day", "Dia"],
                  ["night", "Noite"],
                ]}
              />
              <ChoiceControl
                label="No bioma"
                value={controls.biomeArea}
                onChange={(value) => set({ biomeArea: value })}
                options={[
                  ["edge", "Borda"],
                  ["interior", "Interior"],
                ]}
              />
              <ChoiceControl
                label="Floresta"
                value={controls.forest}
                onChange={(value) => set({ forest: value })}
                options={[
                  ["inside", "Dentro"],
                  ["outside", "Fora"],
                ]}
              />
              <ChoiceControl
                label="Perto de uma base"
                value={controls.nearBase}
                onChange={(value) => set({ nearBase: value })}
                options={[
                  ["yes", "Sim"],
                  ["no", "Não"],
                ]}
              />

              {weatherOptions.length > 0 && (
                <TextField
                  select
                  size="small"
                  label="Clima"
                  value={controls.weather}
                  onChange={(event) => set({ weather: event.target.value })}
                >
                  <MenuItem value={ANY}>Qualquer</MenuItem>
                  {weatherOptions.map((weather) => (
                    <MenuItem key={weather} value={weather}>
                      {references.name({ kind: "event", extId: weather })}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {progressOptions.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Progressão
                  </Typography>
                  <Stack>
                    {progressOptions.map((option) => (
                      <FormControlLabel
                        key={option}
                        control={
                          <Checkbox
                            size="small"
                            checked={controls.progress.includes(option)}
                            onChange={(event) =>
                              set({
                                progress: event.target.checked
                                  ? [...controls.progress, option]
                                  : controls.progress.filter((held) => held !== option),
                              })
                            }
                          />
                        }
                        label={
                          <Typography variant="body2">
                            {references.find({ kind: "entity", extId: option })?.name ?? option.replace(/_/g, " ")}
                          </Typography>
                        }
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {rules.isPending && <CircularProgress />}
          {rules.data?.truncated && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Mostrando {ruleList.length} de {rules.data.total} regras.
            </Alert>
          )}
          {rules.data && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <DataChip color="success" label={`${matched.length} aparece`} />
                <DataChip color="info" variant="outlined" label={`${unknown.length} pode aparecer`} />
                <DataChip variant="outlined" label={`${ruleList.length} regras no mapa`} />
              </Stack>

              <DetainItem label="Aparece aqui" count={matched.length}>
                <RuleList entries={matched} references={references} />
              </DetainItem>

              {unknown.length > 0 && (
                <Box>
                  <Button
                    size="small"
                    startIcon={showUnknown ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                    onClick={() => setShowUnknown((open) => !open)}
                    sx={{ textTransform: "none" }}
                  >
                    Pode aparecer — depende do que não foi escolhido ({unknown.length})
                  </Button>
                  <Collapse in={showUnknown}>
                    <RuleList entries={unknown} references={references} showUndetermined />
                  </Collapse>
                </Box>
              )}

              {nearMisses.length > 0 && (
                <Box>
                  <Button
                    size="small"
                    startIcon={<HelpOutlineIcon />}
                    onClick={() => setShowNearMisses((open) => !open)}
                    sx={{ textTransform: "none" }}
                  >
                    Por que não aparece: faltou uma condição só ({nearMisses.length})
                  </Button>
                  <Collapse in={showNearMisses}>
                    <RuleList entries={nearMisses} references={references} showBlocker />
                  </Collapse>
                </Box>
              )}
            </Stack>
          )}
        </Grid>
      </Grid>
    </StyledContainer>
  );
}

interface NumberControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
}

/** Número com deslizador; em branco quer dizer "não sei", e não zero. */
function NumberControl({ label, value, onChange, min, max, step = 1 }: NumberControlProps) {
  const parsed = numberOrNull(value);
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          label={label}
          value={value}
          placeholder="qualquer"
          onChange={(event) => onChange(event.target.value)}
          sx={{ flex: 1 }}
        />
        {parsed !== null && (
          <Button size="small" onClick={() => onChange(ANY)} sx={{ textTransform: "none", minWidth: 0 }}>
            limpar
          </Button>
        )}
      </Stack>
      <Slider
        size="small"
        min={min}
        max={max}
        step={step}
        value={parsed ?? min}
        disabled={parsed === null}
        onChange={(_event, next) => onChange(String(next))}
      />
    </Box>
  );
}

interface ChoiceControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}

function ChoiceControl({ label, value, onChange, options }: ChoiceControlProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {label}
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        fullWidth
        value={value}
        onChange={(_event, next) => onChange(next ?? ANY)}
      >
        <ToggleButton value={ANY} sx={{ textTransform: "none" }}>
          Qualquer
        </ToggleButton>
        {options.map(([option, optionLabel]) => (
          <ToggleButton key={option} value={option} sx={{ textTransform: "none" }}>
            {optionLabel}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

interface RuleListProps {
  entries: Evaluated[];
  references: ReferenceIndex;
  /** Diz quais tipos ficaram sem resposta, nos "pode aparecer". */
  showUndetermined?: boolean;
  /** Destaca a condição que barrou, nos "faltou uma só". */
  showBlocker?: boolean;
}

function RuleList({ entries, references, showUndetermined, showBlocker }: RuleListProps) {
  /** Uma linha por ocupante: quem lê a tela procura a criatura, não a regra. */
  const rows = entries.flatMap((entry) =>
    entry.rule.occupants.map((occupant) => ({ entry, occupant })),
  );
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Nada com as condições escolhidas.
      </Typography>
    );
  }

  return (
    <Grid container spacing={1}>
      {rows.map(({ entry, occupant }, index) => (
        <Grid size={{ xs: 12, md: 6 }} key={`${entry.rule.extId}-${occupant.extId}-${index}`}>
          <RuleCard
            entry={entry}
            occupant={occupant}
            references={references}
            showUndetermined={showUndetermined}
            showBlocker={showBlocker}
          />
        </Grid>
      ))}
    </Grid>
  );
}

interface RuleCardProps {
  entry: Evaluated;
  occupant: MarkerOccupant;
  references: ReferenceIndex;
  showUndetermined?: boolean;
  showBlocker?: boolean;
}

function RuleCard({ entry, occupant, references, showUndetermined, showBlocker }: RuleCardProps) {
  const highlighted = entry.explained.filter((type) =>
    showBlocker ? type.outcome === "fail" : showUndetermined ? type.outcome === "unknown" : false,
  );

  return (
    <DataCard sx={{ p: 1.5, gap: 1.5, alignItems: "flex-start" }}>
      <ContentChip
        target={{ kind: occupant.kind, extId: occupant.extId }}
        resolved={
          occupant.name
            ? { kind: occupant.kind, extId: occupant.extId, resolvedKind: occupant.kind, name: occupant.name, iconMediaId: occupant.iconMediaId }
            : undefined
        }
        level={occupant.level}
        chance={occupant.chance}
        size="medium"
      />
      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {occupant.name ?? occupant.extId}
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {entry.rule.location && (
            <DataChip variant="outlined" label={references.name({ kind: "location", extId: entry.rule.location })} />
          )}
          {occupant.chance !== null && <DataChip label={`Chance ${formatChance(occupant.chance)}`} />}
        </Stack>
        {highlighted.length > 0 && (
          <>
            <Divider />
            <Typography variant="caption" color={showBlocker ? "error.main" : "info.main"} fontWeight={700}>
              {showBlocker ? "Barrado por" : "Depende de"}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {highlighted.flatMap((type) =>
                type.conditions.map((condition, index) => (
                  <DataChip
                    key={`${type.type}-${index}`}
                    color={showBlocker ? "error" : "info"}
                    variant="outlined"
                    label={describeCondition(condition, references)}
                  />
                )),
              )}
            </Stack>
          </>
        )}
        <SpawnConditionList conditions={entry.rule.conditions} references={references} />
      </Stack>
    </DataCard>
  );
}
