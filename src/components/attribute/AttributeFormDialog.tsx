import { useMemo, useState } from "react";
import { Alert, Autocomplete, Button, CircularProgress, MenuItem, Stack, TextField } from "@mui/material";
import type { AttributeDefinition } from "../../api/content";
import { useAttributeDefinitions, useAttributeUsage, useAttributeWrites } from "../../api/useContent";
import { describeError, slugOf } from "../common/contentForm";
import { StyledDialog } from "../common/StyledDialog";
import { OTHERS, TYPE_LABELS, type AttributeRow } from "./attributeRows";

export interface AttributeFormDialogProps {
  gameId: string;
  /** A chave a definir ou editar; null, criando uma nova. Montado só enquanto aberto. */
  row: AttributeRow | null;
  /** Grupos que já existem, para sugerir. */
  groups: string[];
  /** Chaves com definição: criar uma delas substituiria a existente. */
  defined: Set<string>;
  onClose: () => void;
}

export function AttributeFormDialog({ gameId, row, groups, defined, onClose }: AttributeFormDialogProps) {
  const creating = row === null;
  const definition = row?.definition;
  const usage = row?.usage;
  const [key, setKey] = useState(row?.key ?? "");
  const [keyTouched, setKeyTouched] = useState(false);
  const [label, setLabel] = useState(definition?.label ?? "");
  const [group, setGroup] = useState(definition?.group ?? "");
  const [unit, setUnit] = useState(definition?.unit ?? "");
  const [dataType, setDataType] = useState<AttributeDefinition["dataType"]>(
    definition?.dataType ?? (usage && !usage.numeric ? "text" : "number"),
  );
  const [ordinal, setOrdinal] = useState(String(definition?.ordinal ?? 0));
  const [levelIncrementOf, setLevelIncrementOf] = useState<string | null>(definition?.levelIncrementOf ?? null);
  const { put } = useAttributeWrites(gameId);
  const definitions = useAttributeDefinitions(gameId);
  const usages = useAttributeUsage(gameId);

  // Atributos numéricos do jogo (definidos como número, ou sem definição e só com números), menos este.
  const numericKeys = useMemo(() => {
    const labels = new Map<string, string>();
    for (const candidate of definitions.data ?? []) {
      if (candidate.dataType === "number") labels.set(candidate.key, candidate.label);
    }
    for (const candidate of usages.data ?? []) {
      if (candidate.numeric && !(definitions.data ?? []).some((known) => known.key === candidate.key)) labels.set(candidate.key, candidate.key);
    }
    labels.delete(key.trim());
    return labels;
  }, [definitions.data, usages.data, key]);

  const duplicate = creating && defined.has(key.trim());
  const ordinalValid = /^-?\d+$/.test(ordinal.trim());
  const valid = key.trim() !== "" && label.trim() !== "" && !duplicate && ordinalValid;
  // Com definição, o servidor confere cada valor gravado: número sobre valores de texto faz o salvar desses itens falhar.
  const typeConflict = usage !== undefined && dataType === "number" && !usage.numeric;

  const submit = () => {
    if (!valid) return;
    put.mutate(
      {
        key: key.trim(),
        label: label.trim(),
        group: group.trim() || null,
        unit: unit.trim() || null,
        dataType,
        ordinal: Number(ordinal.trim()),
        levelIncrementOf: dataType === "number" ? levelIncrementOf : null,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <StyledDialog
      open
      modal
      onClose={put.isPending ? () => undefined : onClose}
      title={creating ? "Novo atributo" : definition ? `Editar ${definition.label}` : `Definir ${row?.key}`}
      maxWidth="sm"
      actions={
        <>
          <Button onClick={onClose} disabled={put.isPending} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={!valid || put.isPending}
            startIcon={put.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none" }}
          >
            {definition ? "Salvar" : "Criar"}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <TextField
          label="Rótulo"
          value={label}
          onChange={(event) => {
            setLabel(event.target.value);
            if (creating && !keyTouched) setKey(slugOf(event.target.value));
          }}
          required
          autoFocus
          fullWidth
          helperText="Como o atributo aparece no detalhe, na lista e no filtro. Ex.: Perfurante."
        />
        <TextField
          label="Chave"
          value={key}
          onChange={(event) => {
            setKeyTouched(true);
            setKey(event.target.value);
          }}
          required
          disabled={!creating}
          error={duplicate}
          helperText={
            duplicate
              ? "Já existe uma definição com esta chave."
              : creating
                ? "O nome do atributo nos dados dos itens e entidades. Ex.: damage_pierce."
                : "A chave não muda: é a que os itens e entidades já usam."
          }
          fullWidth
          slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
        />
        <Autocomplete
          freeSolo
          options={groups}
          inputValue={group}
          onInputChange={(_, next) => setGroup(next)}
          renderInput={(params) => (
            <TextField {...params} label="Grupo" helperText={`Seção do detalhe e do filtro. Ex.: Dano, Comida. Vazio: "${OTHERS}".`} />
          )}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Tipo"
            value={dataType}
            onChange={(event) => setDataType(event.target.value as AttributeDefinition["dataType"])}
            fullWidth
            helperText="Só número tem faixa e ordenação no filtro."
          >
            {(Object.keys(TYPE_LABELS) as AttributeDefinition["dataType"][]).map((type) => (
              <MenuItem key={type} value={type}>
                {TYPE_LABELS[type]}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Unidade" value={unit} onChange={(event) => setUnit(event.target.value)} fullWidth helperText="Ex.: kg, s, m." />
          <TextField
            label="Ordem"
            value={ordinal}
            onChange={(event) => setOrdinal(event.target.value)}
            error={!ordinalValid}
            helperText={ordinalValid ? "Posição dentro do grupo." : "Número inteiro."}
            fullWidth
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
          />
        </Stack>
        {dataType === "number" && (
          <Autocomplete
            options={[...numericKeys.keys()].sort((a, b) => (numericKeys.get(a) ?? a).localeCompare(numericKeys.get(b) ?? b))}
            value={levelIncrementOf}
            onChange={(_, next) => setLevelIncrementOf(next)}
            getOptionLabel={(option) => {
              const optionLabel = numericKeys.get(option);
              return optionLabel && optionLabel !== option ? `${optionLabel} (${option})` : option;
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Aumenta por nível o atributo"
                helperText="O valor deste soma no atributo escolhido a cada nível do item. Ex.: dano por nível → dano."
              />
            )}
          />
        )}
        {typeConflict && (
          <Alert severity="warning">
            Há valores deste atributo que não são número. Com o tipo Número, salvar esses itens ou entidades vai falhar até o
            valor ser corrigido.
          </Alert>
        )}
        {put.error && <Alert severity="error">{describeError(put.error)}</Alert>}
      </Stack>
    </StyledDialog>
  );
}
