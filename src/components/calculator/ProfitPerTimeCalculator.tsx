import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { MAX_PAGE_SIZE, type ProfitQuery } from "../../api/content";
import { useCraftingProfits } from "../../api/useContent";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { formatAmount } from "../../utils/format";
import { CurrencyValue } from "../common/CurrencyValue";
import { StyledContainer } from "../common/StyledContainer";
import { TimeChip } from "../common/TimeChip";
import { ProfitItemCell, ProfitStations, profitColor } from "./ProfitCells";

type SortKey = "name" | "profit" | "craftTimeSeconds" | "profitPerHour";
type TimeUnit = "second" | "minute" | "hour" | "day" | "week";

const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  second: "Segundo",
  minute: "Minuto",
  hour: "Hora",
  day: "Dia",
  week: "Semana",
};

const TIME_UNIT_SECONDS: Record<TimeUnit, number> = {
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
};

const NO_CRITERIA = {};

/** Lucro por tempo de cada produto com receita temporizada, pelo tempo de um lote. */
export function ProfitPerTimeCalculator() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const pages = usePagination(NO_CRITERIA);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("hour");
  const [orderBy, setOrderBy] = useState<SortKey>("profitPerHour");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // A API devolve no máximo 200 por página.
  useEffect(() => {
    if (pages.info.pagination.pageSize > MAX_PAGE_SIZE) pages.setPageSize(MAX_PAGE_SIZE);
  }, [pages.info.pagination.pageSize, pages.setPageSize]);

  const search = useDebouncedValue(pages.info.search);
  const { pagination } = pages.info;
  const query = useMemo<ProfitQuery>(
    () => ({
      search: search || undefined,
      timed: true,
      sort: `${order === "desc" ? "-" : ""}${orderBy}`,
      page: pagination.page - 1,
      size: Math.min(pagination.pageSize, MAX_PAGE_SIZE),
    }),
    [search, order, orderBy, pagination],
  );
  const profits = useCraftingProfits(gameId, query);

  useEffect(() => {
    if (profits.data) pages.setTotalItems(profits.data.total);
  }, [profits.data, pages.setTotalItems]);

  const sortBy = (key: SortKey) => {
    if (orderBy === key) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setOrderBy(key);
      setOrder(key === "name" || key === "craftTimeSeconds" ? "asc" : "desc");
    }
    pages.setPage(1);
  };

  const header = (key: SortKey, label: string, align: "left" | "right" = "right") => (
    <TableCell align={align}>
      <TableSortLabel active={orderBy === key} direction={orderBy === key ? order : "asc"} onClick={() => sortBy(key)}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  const unitSeconds = TIME_UNIT_SECONDS[timeUnit];
  const unitLabel = TIME_UNIT_LABELS[timeUnit];

  return (
    <StyledContainer
      title="Lucro por tempo"
      label="Quanto cada produto rende no tempo, pela duração de um lote da receita."
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: "Buscar item..." }}
      pages={pages}
      actionsStart={
        <ToggleButtonGroup
          value={timeUnit}
          exclusive
          size="small"
          color="primary"
          onChange={(_, unit: TimeUnit | null) => unit && setTimeUnit(unit)}
        >
          {Object.entries(TIME_UNIT_LABELS).map(([unit, label]) => (
            <ToggleButton key={unit} value={unit} sx={{ px: 2 }}>
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      }
    >
      {!profits.data ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          {profits.isError ? <Typography color="error">{profits.error.message}</Typography> : <CircularProgress color="primary" />}
        </Stack>
      ) : (
        <TableContainer sx={{ flex: 1, overflow: "auto" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {header("name", "Item", "left")}
                {header("profit", "Lucro por unidade")}
                {header("craftTimeSeconds", "Tempo do lote")}
                <TableCell align="right">Qtd. / {unitLabel}</TableCell>
                {header("profitPerHour", `Lucro / ${unitLabel}`)}
                <TableCell>Bancada</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profits.data.content.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                      Nenhum produto com tempo de receita encontrado.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {profits.data.content.map((row) => {
                const time = row.craftTimeSeconds ?? 0;
                const quantity = time > 0 ? (row.produced * unitSeconds) / time : 0;
                const scaledProfit = row.profitPerHour !== undefined ? (row.profitPerHour * unitSeconds) / 3600 : undefined;
                return (
                  <TableRow key={`${row.target.kind ?? ""}:${row.target.extId}`} hover>
                    <TableCell>
                      <ProfitItemCell row={row} />
                    </TableCell>
                    <TableCell align="right">
                      {row.profit !== undefined ? (
                        <CurrencyValue amount={row.profit} currency={row.currency} color={profitColor(row.profit)} />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end">
                        <TimeChip seconds={time} />
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        {formatAmount(quantity)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {scaledProfit !== undefined ? (
                        <CurrencyValue amount={scaledProfit} currency={row.currency} color={profitColor(scaledProfit)} />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <ProfitStations row={row} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </StyledContainer>
  );
}
