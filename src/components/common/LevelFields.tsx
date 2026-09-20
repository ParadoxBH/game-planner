import { MenuItem, TextField, Tooltip } from "@mui/material";
import type { LevelOperator } from "../../api/content";

/** Rótulo curto de cada operador, para caber na linha. */
const OPERATORS: { value: LevelOperator; label: string; hint: string }[] = [
  { value: "exact", label: "=", hint: "No nível exato" },
  { value: "min", label: "≥", hint: "Nesse nível ou acima" },
  { value: "max", label: "≤", hint: "Nesse nível ou abaixo" },
];

/**
 * Nível exigido de um requisito e como comparar. Vazio: qualquer nível serve, e o operador fica
 * desligado.
 */
export function LevelFields({
  level,
  operator,
  onChange,
}: {
  level: string;
  operator: LevelOperator;
  onChange: (changes: { level?: string; levelOperator?: LevelOperator }) => void;
}) {
  const invalid = level.trim() !== "" && !/^\d+$/.test(level.trim());
  return (
    <>
      <Tooltip title="Nível exigido do alvo; vazio: qualquer um serve">
        <TextField
          label="Nível"
          size="small"
          value={level}
          onChange={(event) => onChange({ level: event.target.value })}
          error={invalid}
          sx={{ width: 90 }}
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
        />
      </Tooltip>
      <TextField
        select
        label="Comp."
        size="small"
        value={operator}
        onChange={(event) => onChange({ levelOperator: event.target.value as LevelOperator })}
        disabled={level.trim() === ""}
        sx={{ width: 80 }}
      >
        {OPERATORS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Tooltip title={option.hint} placement="right">
              <span>{option.label}</span>
            </Tooltip>
          </MenuItem>
        ))}
      </TextField>
    </>
  );
}
