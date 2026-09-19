import type { ReactNode } from "react";
import { Stack, Switch, Tab, Tabs, Typography } from "@mui/material";
import { Build, FilterList, SwapHoriz } from "@mui/icons-material";
import { mediaUrl } from "../../api/references";
import {
  filterCount,
  filterValue,
  visibleOptions,
  type FilterValue,
  type FilterValues,
  type IncludeState,
  type ListingFilter,
  type ListingFilterOption,
} from "../../api/query";
import { usePlatform } from "../../hooks/usePlatform";
import { PickSelector } from "./PickSelector";
import { TriplePickSelector } from "./TriplePickSelector";

/** Ícones que o backend pode pedir pelo nome; nome desconhecido fica com o padrão do seletor. */
const ICONS: Record<string, ReactNode> = {
  trade: <SwapHoriz sx={{ fontSize: 18 }} />,
  station: <Build sx={{ fontSize: 18 }} />,
  filter: <FilterList sx={{ fontSize: 18 }} />,
};

const ALL = "__all__";

function optionLabel(option: ListingFilterOption): string {
  return option.count != null ? `${option.label} (${option.count})` : option.label;
}

function pickOption(option: ListingFilterOption) {
  return {
    value: option.value,
    label: optionLabel(option),
    icon: option.iconMediaId ? mediaUrl(option.iconMediaId) : undefined,
  };
}

function states(value: FilterValue): Record<string, IncludeState> {
  return value !== null && typeof value === "object" ? value : {};
}

interface ListingFilterBarProps {
  /** Os filtros de GET .../query/filters; enquanto não chegam, nada é desenhado. */
  filters: ListingFilter[] | undefined;
  values: FilterValues;
  onChange: (key: string, value: FilterValue) => void;
}

/**
 * A barra de filtros de uma listagem, desenhada a partir do que o backend descreve: cada filtro no controle que
 * ele pede, com as opções dele. Filtro novo no backend aparece aqui sem mudança no front. Filtro sem opções não
 * aparece.
 */
export function ListingFilterBar({ filters, values, onChange }: ListingFilterBarProps) {
  const { isMobile } = usePlatform();

  return (
    <>
      {(filters ?? [])
        .map((filter) => ({ filter, options: visibleOptions(filter, filters ?? [], values) }))
        .filter(({ filter, options }) => options.length > 0 || filterCount(filter, values) > 0)
        .map(({ filter, options }) => {
          const value = filterValue(filter, values);
          switch (filter.display) {
            case "multi":
              return (
                <TriplePickSelector
                  key={filter.key}
                  label={filter.label}
                  states={states(value)}
                  options={options.map(pickOption)}
                  onChange={(option, state) => onChange(filter.key, { ...states(value), [option]: state })}
                  icon={filter.icon ? ICONS[filter.icon] : undefined}
                  fullWidth={isMobile}
                />
              );
            case "tabs":
              return (
                <Tabs
                  key={filter.key}
                  value={typeof value === "string" ? value : ALL}
                  onChange={(_, selected: string) => onChange(filter.key, selected === ALL ? null : selected)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab value={ALL} label={filter.allLabel ?? "Todos"} />
                  {options.map((option) => (
                    <Tab key={option.value} value={option.value} label={optionLabel(option)} />
                  ))}
                </Tabs>
              );
            case "switch": {
              const option = filter.options[0];
              return (
                <Stack key={filter.key} direction="row" alignItems="center">
                  <Switch
                    size="small"
                    checked={value === option.value}
                    onChange={(event) => onChange(filter.key, event.target.checked ? option.value : null)}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                    {option.label}
                  </Typography>
                </Stack>
              );
            }
            default:
              return (
                <PickSelector
                  key={filter.key}
                  label={filter.label}
                  value={typeof value === "string" ? value : null}
                  options={options.map(pickOption)}
                  onChange={(selected) => onChange(filter.key, selected)}
                  allLabel={filter.allLabel}
                  icon={filter.icon ? ICONS[filter.icon] : undefined}
                  fullWidth={isMobile}
                />
              );
          }
        })}
    </>
  );
}
