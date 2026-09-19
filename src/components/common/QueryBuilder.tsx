import { useState, type HTMLAttributes, type Key, type ReactNode } from "react";
import {
  alpha,
  Autocomplete,
  Badge,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { Add, Close, FilterList, Search } from "@mui/icons-material";
import { mediaUrl } from "../../api/references";
import {
  emptyFilterValue,
  filterCount,
  filterValue,
  visibleOptions,
  type FilterValue,
  type FilterValues,
  type IncludeState,
  type ListingFilter,
  type ListingFilterOption,
  type ListingSchema,
} from "../../api/query";

/**
 * Até quantas opções um filtro de escolha única aparece como chips; acima disso, campo com busca. As opções são
 * identificadas pelo código: categorias diferentes podem ter o mesmo nome.
 */
const CHIP_LIMIT = 8;

/** Aparência dos menus do QueryBuilder, a mesma dos seletores da tela. */
const MENU_PAPER_SX = {
  mt: 1,
  maxWidth: "calc(100vw - 32px)",
  backgroundColor: "rgba(20, 20, 20, 0.95)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 2,
  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
};

function optionLabel(option: ListingFilterOption): string {
  return option.count != null ? `${option.label} (${option.count})` : option.label;
}

/** A opção de um valor; um valor fora das opções (vindo da URL) aparece com o próprio código. */
function optionOf(filter: ListingFilter, value: string): ListingFilterOption {
  return filter.options.find((option) => option.value === value) ?? { value, label: value };
}

function states(value: FilterValue): Record<string, IncludeState> {
  return value !== null && typeof value === "object" ? value : {};
}

/** Para buscar sem diferenciar maiúsculas nem acentos. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function OptionIcon({ option, size = 18 }: { option: ListingFilterOption; size?: number }) {
  if (!option.iconMediaId) return null;
  return (
    <Box component="img" src={mediaUrl(option.iconMediaId)} alt="" sx={{ width: size, height: size, objectFit: "contain" }} />
  );
}

function renderOption(props: HTMLAttributes<HTMLLIElement> & { key: Key }, option: ListingFilterOption) {
  const { key, ...rest } = props;
  return (
    <Box component="li" key={key} {...rest} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
      <OptionIcon option={option} />
      {optionLabel(option)}
    </Box>
  );
}

/** Um filtro no menu: o rótulo, uma ação opcional à direita dele e o campo. */
function Section({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ minHeight: 28 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          {label}
        </Typography>
        {action}
      </Stack>
      {children}
    </Stack>
  );
}

interface FieldProps {
  filter: ListingFilter;
  /** As opções que valem agora (ver visibleOptions). */
  options: ListingFilterOption[];
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}

/** Escolha única (select e tabs): chips quando são poucas opções, campo com busca quando são muitas. */
function SingleField({ filter, options, value, onChange }: FieldProps) {
  const selected = typeof value === "string" ? value : null;

  if (options.length <= CHIP_LIMIT) {
    return (
      <Section label={filter.label}>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {options.map((option) => {
            const active = option.value === selected;
            return (
              <Chip
                key={option.value}
                size="small"
                label={optionLabel(option)}
                icon={option.iconMediaId ? <OptionIcon option={option} size={16} /> : undefined}
                color={active ? "primary" : "default"}
                variant={active ? "filled" : "outlined"}
                onClick={() => onChange(active ? null : option.value)}
              />
            );
          })}
        </Stack>
      </Section>
    );
  }

  return (
    <Section label={filter.label}>
      <Autocomplete
        size="small"
        options={options}
        value={selected === null ? null : optionOf(filter, selected)}
        onChange={(_, option) => onChange(option?.value ?? null)}
        getOptionLabel={optionLabel}
        getOptionKey={(option) => option.value}
        isOptionEqualToValue={(option, current) => option.value === current.value}
        renderOption={renderOption}
        renderInput={(params) => <TextField {...params} placeholder={filter.allLabel ?? "Todos"} />}
        noOptionsText="Nenhuma opção"
      />
    </Section>
  );
}

/** Lista de opções com busca, aberta pelo + de um filtro multi. Montada só enquanto aberta: a busca recomeça vazia. */
function OptionList({ options, onPick }: { options: ListingFilterOption[]; onPick: (option: ListingFilterOption) => void }) {
  const [term, setTerm] = useState("");
  const shown = options.filter((option) => normalize(optionLabel(option)).includes(normalize(term.trim())));
  // Nomes repetidos (duas categorias "Flores") ganham o código embaixo, para dar para distinguir.
  const labels = options.map((option) => option.label);
  const repeated = new Set(labels.filter((label, index) => labels.indexOf(label) !== index));

  return (
    <Stack spacing={1} sx={{ p: 1 }}>
      <TextField
        autoFocus
        size="small"
        placeholder="Buscar..."
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: "text.disabled", fontSize: "1.1rem" }} />
              </InputAdornment>
            ),
          },
        }}
      />
      <List dense disablePadding sx={{ maxHeight: "min(280px, calc(100vh - 220px))", overflowY: "auto" }}>
        {shown.map((option) => (
          <ListItemButton key={option.value} onClick={() => onPick(option)} sx={{ gap: 1.5, borderRadius: 1 }}>
            <OptionIcon option={option} />
            <ListItemText
              primary={optionLabel(option)}
              secondary={repeated.has(option.label) ? option.value : undefined}
            />
          </ListItemButton>
        ))}
        {shown.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.disabled", px: 1, py: 1.5 }}>
            Nenhuma opção
          </Typography>
        )}
      </List>
    </Stack>
  );
}

/**
 * Conter e não conter (multi): o + abre as opções; a escolhida entra na lista como "contém", e cada linha pode
 * virar "não contém" ou sair.
 */
function MultiField({ filter, options, value, onChange }: FieldProps) {
  const theme = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current = states(value);
  const chosen = Object.entries(current).filter(
    (entry): entry is [string, "include" | "exclude"] => entry[1] !== "indifferent",
  );
  const available = options.filter((option) => !chosen.some(([chosenValue]) => chosenValue === option.value));

  const set = (option: string, state: "include" | "exclude") => onChange({ ...current, [option]: state });
  const remove = (option: string) => {
    const next = { ...current };
    delete next[option];
    onChange(next);
  };

  return (
    <Section
      label={filter.label}
      action={
        <Tooltip title="Adicionar">
          <span>
            <IconButton
              size="small"
              aria-label={`Adicionar em ${filter.label}`}
              disabled={available.length === 0}
              onClick={(event) => setAnchor(event.currentTarget)}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 0.25 }}
            >
              <Add fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      {chosen.length === 0 ? (
        <Typography variant="caption" sx={{ color: "text.disabled" }}>
          Nenhuma. Use o + para adicionar.
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {chosen.map(([optionValue, state]) => {
            const option = optionOf(filter, optionValue);
            const color = state === "include" ? theme.palette.success.main : theme.palette.error.main;
            return (
              <Stack
                key={optionValue}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  pl: 1,
                  pr: 0.5,
                  py: 0.5,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: alpha(color, 0.4),
                  backgroundColor: alpha(color, 0.08),
                }}
              >
                <OptionIcon option={option} />
                <Typography variant="body2" noWrap title={option.label} sx={{ flex: 1, minWidth: 0 }}>
                  {optionLabel(option)}
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={state}
                  onChange={(_, next: "include" | "exclude" | null) => next && set(optionValue, next)}
                  aria-label={`Conter ou não ${option.label}`}
                  sx={{ "& .MuiToggleButton-root": { py: 0.25, px: 1, fontSize: "0.7rem", textTransform: "none" } }}
                >
                  <ToggleButton value="include" color="success">
                    Contém
                  </ToggleButton>
                  <ToggleButton value="exclude" color="error">
                    Não contém
                  </ToggleButton>
                </ToggleButtonGroup>
                <IconButton size="small" aria-label={`Remover ${option.label}`} onClick={() => remove(optionValue)}>
                  <Close fontSize="small" />
                </IconButton>
              </Stack>
            );
          })}
        </Stack>
      )}

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { ...MENU_PAPER_SX, width: 300 } } }}
      >
        <OptionList
          options={available}
          onPick={(option) => {
            set(option.value, "include");
            setAnchor(null);
          }}
        />
      </Popover>
    </Section>
  );
}

function SwitchField({ filter, value, onChange }: FieldProps) {
  const option = filter.options[0];
  return (
    <Section label={filter.label}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2">{option.label}</Typography>
        <Switch
          size="small"
          checked={value === option.value}
          onChange={(event) => onChange(event.target.checked ? option.value : null)}
        />
      </Stack>
    </Section>
  );
}

function FilterField(props: FieldProps) {
  switch (props.filter.display) {
    case "multi":
      return <MultiField {...props} />;
    case "switch":
      return <SwitchField {...props} />;
    default:
      return <SingleField {...props} />;
  }
}

interface QueryBuilderProps {
  /** Busca e filtros da listagem (GET .../query/filters). Enquanto não chegam, o botão fica desabilitado. */
  schema: ListingSchema | undefined;
  search: string;
  onSearchChange: (value: string) => void;
  /** Valores escolhidos, pela `key` de cada filtro. */
  values: FilterValues;
  onChange: (key: string, value: FilterValue) => void;
}

/**
 * O QueryBuilder do front: um botão com a contagem de filtros ativos que abre a busca e todos os filtros da
 * listagem, desenhados a partir do que o backend descreve. Filtro novo no backend aparece aqui sem mudança no
 * front. A busca conta como um filtro quando tem texto.
 */
export function QueryBuilder({ schema, search, onSearchChange, values, onChange }: QueryBuilderProps) {
  const theme = useTheme();
  const { borderRadius: dtRadius } = theme.designTokens;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const filters = schema?.filters ?? [];
  const count = (search.trim() ? 1 : 0) + filters.reduce((total, filter) => total + filterCount(filter, values), 0);
  const active = count > 0;

  const clear = () => {
    if (search) onSearchChange("");
    filters.forEach((filter) => {
      if (filterCount(filter, values) > 0) onChange(filter.key, emptyFilterValue(filter));
    });
  };

  return (
    <>
      <Tooltip title={active ? `${count} ${count === 1 ? "filtro ativo" : "filtros ativos"}` : "Filtros"}>
        <span>
          <IconButton
            aria-label="Abrir filtros"
            disabled={!schema}
            onClick={(event) => setAnchor(event.currentTarget)}
            sx={{
              width: { xs: 40, md: 45 },
              height: { xs: 40, md: 45 },
              borderRadius: dtRadius,
              border: "1px solid",
              borderColor: active ? alpha(theme.palette.primary.main, 0.5) : "divider",
              backgroundColor: active ? alpha(theme.palette.primary.main, 0.1) : "rgba(255, 255, 255, 0.03)",
              color: active ? "primary.main" : "text.secondary",
              "&:hover": {
                borderColor: active ? "primary.main" : "rgba(255, 255, 255, 0.2)",
                backgroundColor: active ? alpha(theme.palette.primary.main, 0.15) : "rgba(255, 255, 255, 0.08)",
              },
            }}
          >
            <Badge badgeContent={count} color="primary" invisible={!active}>
              <FilterList />
            </Badge>
          </IconButton>
        </span>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { ...MENU_PAPER_SX, width: 400, maxHeight: "min(640px, calc(100vh - 120px))" } } }}
      >
        <Stack spacing={2} sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <FilterList fontSize="small" color={active ? "primary" : "inherit"} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Filtros
              </Typography>
              {active && <Chip size="small" color="primary" label={count} />}
            </Stack>
            <Button size="small" onClick={clear} disabled={!active} sx={{ textTransform: "none" }}>
              Limpar
            </Button>
          </Stack>

          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder={schema?.search.placeholder ?? "Pesquisar..."}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: "text.disabled", fontSize: "1.2rem" }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          {filters.map((filter) => {
            // Sem opções agora (ex.: categoria sem sub-categorias) e nada escolhido, o filtro não aparece.
            const options = visibleOptions(filter, filters, values);
            if (options.length === 0 && filterCount(filter, values) === 0) return null;
            return (
              <FilterField
                key={filter.key}
                filter={filter}
                options={options}
                value={filterValue(filter, values)}
                onChange={(value) => onChange(filter.key, value)}
              />
            );
          })}
        </Stack>
      </Popover>
    </>
  );
}
