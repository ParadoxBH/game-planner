import { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import type { AttributeDefinition } from "../../api/content";
import { attributeName } from "./attributes";
import {
  attributeEntryInvalid,
  effectiveType,
  emptyAttribute,
  type AttributeEntry,
  type AttributeForm,
  type AttributeType,
} from "./attributeValues";
import { slugOf } from "./contentForm";

const OTHERS = "Outros";

const TYPE_LABELS: Record<AttributeType, string> = { number: "Número", text: "Texto", boolean: "Sim/não" };

/** Opção do campo de adicionar: um atributo definido que o conteúdo ainda não tem. */
interface AddOption {
  key: string;
  label: string;
  group: string;
  definition: AttributeDefinition;
}

interface AttributeEditorProps {
  definitions: AttributeDefinition[];
  value: AttributeForm;
  onChange: (next: AttributeForm) => void;
}

function groupOf(definition: AttributeDefinition | undefined): string {
  return definition?.group ?? OTHERS;
}

/** Grupos na ordem do primeiro atributo de cada um; "Outros" por último. Dentro, pela ordem da definição. */
function groupedRows(value: AttributeForm, definitions: Map<string, AttributeDefinition>) {
  const rows = Object.entries(value).map(([key, entry]) => ({ key, entry, definition: definitions.get(key) }));
  rows.sort(
    (a, b) =>
      Number(groupOf(a.definition) === OTHERS) - Number(groupOf(b.definition) === OTHERS) ||
      groupOf(a.definition).localeCompare(groupOf(b.definition)) ||
      (a.definition?.ordinal ?? 0) - (b.definition?.ordinal ?? 0) ||
      attributeName(a.key, a.definition).localeCompare(attributeName(b.key, b.definition)),
  );
  const groups = new Map<string, typeof rows>();
  rows.forEach((row) => groups.set(groupOf(row.definition), [...(groups.get(groupOf(row.definition)) ?? []), row]));
  return [...groups.entries()];
}

/** O campo do valor, conforme o tipo: interruptor para sim/não, texto com a unidade no fim para os demais. */
function ValueField({
  entry,
  type,
  unit,
  invalid,
  onChange,
}: {
  entry: AttributeEntry;
  type: AttributeType;
  unit: string | null | undefined;
  invalid: boolean;
  onChange: (value: string | boolean) => void;
}) {
  if (type === "boolean") {
    const checked = entry.value === true || entry.value === "true";
    return (
      <Stack direction="row" alignItems="center" spacing={1}>
        <Switch size="small" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <Typography variant="body2" color="text.secondary">
          {checked ? "Sim" : "Não"}
        </Typography>
      </Stack>
    );
  }
  return (
    <TextField
      size="small"
      value={typeof entry.value === "string" ? entry.value : String(entry.value)}
      onChange={(event) => onChange(event.target.value)}
      error={invalid}
      helperText={invalid ? "Número." : undefined}
      placeholder={type === "number" ? "0" : "Valor"}
      fullWidth
      slotProps={{
        input: { endAdornment: unit ? <InputAdornment position="end">{unit}</InputAdornment> : undefined },
        htmlInput: type === "number" ? { inputMode: "decimal" } : undefined,
      }}
    />
  );
}

/**
 * Atributos do item ou da entidade, um por linha e em seções pelo grupo da definição (Dano, Comida...). O campo de
 * cima adiciona um atributo definido no jogo ou, digitando, um novo pela chave; atributo sem definição escolhe o
 * próprio tipo. Rótulo, grupo e unidade se mudam no painel Atributos do jogo.
 */
export function AttributeEditor({ definitions, value, onChange }: AttributeEditorProps) {
  const [input, setInput] = useState("");
  const byKey = useMemo(() => new Map(definitions.map((definition) => [definition.key, definition])), [definitions]);

  const options = useMemo<AddOption[]>(
    () =>
      definitions
        .filter((definition) => !(definition.key in value))
        .map((definition) => ({ key: definition.key, label: definition.label, group: groupOf(definition), definition }))
        .sort(
          (a, b) =>
            Number(a.group === OTHERS) - Number(b.group === OTHERS) ||
            a.group.localeCompare(b.group) ||
            a.definition.ordinal - b.definition.ordinal ||
            a.label.localeCompare(b.label),
        ),
    [definitions, value],
  );

  const add = (key: string, type: AttributeType) => {
    if (!key || key in value) return;
    onChange({ ...value, [key]: emptyAttribute(type) });
  };
  const update = (key: string, entry: AttributeEntry) => onChange({ ...value, [key]: entry });
  const remove = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  const newKey = slugOf(input);
  const count = Object.keys(value).length;

  return (
    <Stack spacing={2}>
      <Autocomplete<AddOption, false, false, true>
        freeSolo
        options={options}
        groupBy={(option) => option.group}
        getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
        filterOptions={(all, state) => {
          const term = state.inputValue.trim().toLowerCase();
          return term
            ? all.filter((option) => option.label.toLowerCase().includes(term) || option.key.includes(term))
            : all;
        }}
        renderOption={(props, option) => {
          const { key, ...rest } = props;
          return (
            <Box component="li" key={key} {...rest} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
              <span>{option.label}</span>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                {option.key}
              </Typography>
            </Box>
          );
        }}
        inputValue={input}
        onInputChange={(_, next, reason) => setInput(reason === "reset" ? "" : next)}
        value={null}
        onChange={(_, choice) => {
          if (choice === null) return;
          if (typeof choice === "string") add(slugOf(choice), "number");
          else add(choice.key, choice.definition.dataType);
          setInput("");
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Adicionar atributo"
            placeholder="Busque um atributo do jogo ou digite uma chave nova"
            helperText={
              newKey && !byKey.has(newKey) && !(newKey in value)
                ? `Enter adiciona "${newKey}", sem definição (escolha o tipo na linha).`
                : "Rótulo, grupo e unidade de cada atributo ficam no painel Gerenciar › Atributos."
            }
          />
        )}
        noOptionsText={newKey ? `Enter adiciona "${newKey}"` : "Todos os atributos do jogo já estão aqui"}
      />

      {count === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          Nenhum atributo. Use o campo acima para adicionar.
        </Typography>
      )}

      {groupedRows(value, byKey).map(([group, rows]) => (
        <Stack key={group} spacing={1}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {group}
          </Typography>
          {rows.map(({ key, entry, definition }) => {
            const type = effectiveType(key, entry, byKey);
            const invalid = attributeEntryInvalid(key, entry, byKey);
            return (
              <Stack
                key={key}
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ sm: "center" }}
                sx={{ p: 1, pl: 1.5, border: 1, borderColor: invalid ? "error.main" : "divider", borderRadius: 1 }}
              >
                <Stack sx={{ minWidth: 0, flex: { sm: "0 0 34%" } }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {attributeName(key, definition)}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }} noWrap>
                      {key}
                    </Typography>
                    {!definition && (
                      <Tooltip title="Sem definição no jogo: aparece pela chave. Defina rótulo e grupo no painel Atributos.">
                        <Chip size="small" label="sem definição" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <ValueField
                    entry={entry}
                    type={type}
                    unit={definition?.unit}
                    invalid={invalid}
                    onChange={(next) => update(key, { ...entry, value: next })}
                  />
                </Box>
                {definition ? (
                  <Chip size="small" label={TYPE_LABELS[type]} sx={{ alignSelf: { xs: "flex-start", sm: "center" } }} />
                ) : (
                  <TextField
                    select
                    size="small"
                    value={entry.type}
                    onChange={(event) => {
                      const nextType = event.target.value as AttributeType;
                      const keep = nextType !== "boolean" && typeof entry.value === "string" ? entry.value : undefined;
                      update(key, keep !== undefined ? { value: keep, type: nextType } : emptyAttribute(nextType));
                    }}
                    sx={{ width: 120 }}
                    aria-label={`Tipo de ${key}`}
                  >
                    {(Object.keys(TYPE_LABELS) as AttributeType[]).map((option) => (
                      <MenuItem key={option} value={option}>
                        {TYPE_LABELS[option]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                <Tooltip title="Remover">
                  <IconButton size="small" color="error" onClick={() => remove(key)} sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            );
          })}
        </Stack>
      ))}
    </Stack>
  );
}
