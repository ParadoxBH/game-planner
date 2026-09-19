import { useMemo } from "react";
import { Autocomplete, Chip, Stack, TextField, Typography } from "@mui/material";
import { mediaUrl } from "../../api/references";

export interface CodeOption {
  extId: string;
  name: string;
  iconMediaId: string | null;
}

/** Escolha de vários códigos (categorias, eventos). Código selecionado que não está na lista aparece pelo próprio código. */
export function CodesField({
  label,
  options,
  value,
  onChange,
  loading,
  helperText,
  freeSolo = false,
}: {
  label: string;
  options: CodeOption[];
  value: string[];
  onChange: (value: string[]) => void;
  loading: boolean;
  helperText?: string;
  /** Aceita código digitado que não está nas opções (Enter para incluir). */
  freeSolo?: boolean;
}) {
  const byId = useMemo(() => new Map(options.map((option) => [option.extId, option])), [options]);
  const optionOf = (extId: string): CodeOption => byId.get(extId) ?? { extId, name: extId, iconMediaId: null };
  return (
    <Autocomplete
      multiple
      freeSolo={freeSolo}
      loading={loading}
      options={options.map((option) => option.extId)}
      value={value}
      onChange={(_, next) => onChange(next)}
      getOptionLabel={(extId) => optionOf(extId).name}
      filterOptions={(ids, state) => {
        const term = state.inputValue.trim().toLowerCase();
        return term
          ? ids.filter((extId) => optionOf(extId).name.toLowerCase().includes(term) || extId.toLowerCase().includes(term))
          : ids;
      }}
      renderOption={({ key, ...props }, extId) => {
        const option = optionOf(extId);
        return (
          <li key={key} {...props}>
            <Stack direction="row" spacing={1} alignItems="center">
              {option.iconMediaId && (
                <img src={mediaUrl(option.iconMediaId)} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
              )}
              <span>{option.name}</span>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                {extId}
              </Typography>
            </Stack>
          </li>
        );
      }}
      renderValue={(ids, getItemProps) =>
        ids.map((extId, index) => {
          const { key, ...props } = getItemProps({ index });
          return <Chip key={key} size="small" label={optionOf(extId).name} {...props} />;
        })
      }
      renderInput={(params) => <TextField {...params} label={label} helperText={helperText} />}
    />
  );
}
