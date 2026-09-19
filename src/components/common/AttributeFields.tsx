import { Chip, FormControlLabel, Grid, InputAdornment, Stack, Switch, TextField, Tooltip, Typography } from "@mui/material";
import type { AttributeDefinition } from "../../api/content";
import { numberOf } from "./contentForm";
import { type AttributeForm } from "./attributeValues";
import { FormSection } from "./formLayout";

/**
 * Um campo por atributo definido no jogo, conforme o tipo. Atributos gravados que o jogo não define
 * aparecem só para leitura e são mantidos como estão ao salvar.
 */
export function AttributeFields({
  definitions,
  value,
  onChange,
}: {
  definitions: AttributeDefinition[];
  value: AttributeForm;
  onChange: (key: string, value: string | boolean) => void;
}) {
  const known = new Set(definitions.map((definition) => definition.key));
  const unknown = Object.entries(value).filter(([key]) => !known.has(key));
  if (definitions.length === 0 && unknown.length === 0) return null;

  return (
    <>
      <FormSection title="Atributos" />
      <Grid container spacing={2}>
        {definitions.map((definition) => {
          const current = value[definition.key];
          if (definition.dataType === "boolean") {
            return (
              <Grid key={definition.key} size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={<Switch checked={current === true} onChange={(event) => onChange(definition.key, event.target.checked)} />}
                  label={definition.label}
                />
              </Grid>
            );
          }
          const invalid = definition.dataType === "number" && typeof current === "string" && numberOf(current) === undefined;
          return (
            <Grid key={definition.key} size={{ xs: 12, sm: 6 }}>
              <TextField
                label={definition.label}
                value={typeof current === "string" ? current : ""}
                onChange={(event) => onChange(definition.key, event.target.value)}
                error={invalid}
                helperText={invalid ? "Número." : undefined}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: definition.unit ? <InputAdornment position="end">{definition.unit}</InputAdornment> : undefined,
                  },
                  htmlInput: definition.dataType === "number" ? { inputMode: "decimal" } : undefined,
                }}
              />
            </Grid>
          );
        })}
      </Grid>
      {unknown.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <Tooltip title="Atributos sem definição no jogo: são mantidos como estão.">
            <Typography variant="caption" color="text.secondary">
              Outros atributos:
            </Typography>
          </Tooltip>
          {unknown.map(([key, current]) => (
            <Chip key={key} size="small" variant="outlined" label={`${key}: ${String(current)}`} />
          ))}
        </Stack>
      )}
    </>
  );
}
