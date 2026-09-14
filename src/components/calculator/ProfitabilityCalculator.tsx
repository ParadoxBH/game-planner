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
  Tooltip,
  Typography,
} from "@mui/material";
import { WarningAmber } from "@mui/icons-material";
import { MAX_PAGE_SIZE, type CraftProfit, type ProfitQuery } from "../../api/content";
import { useCraftingProfits } from "../../api/useContent";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePagination } from "../../hooks/usePagination";
import { formatAmount } from "../../utils/format";
import { ContentChip } from "../common/ContentChip";
import { CurrencyValue, currencyReference } from "../common/CurrencyValue";
import { StyledContainer } from "../common/StyledContainer";
import { ProfitItemCell, ProfitStations, profitColor } from "./ProfitCells";

type SortKey = "name" | "unitCost" | "sellPrice" | "profit" | "steps";

const NO_CRITERIA = {};

function CostCell({ row }: { row: CraftProfit }) {
  return (
    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" flexWrap="wrap" useFlexGap>
      {row.baseResources.map((resource) => (
        <ContentChip
          key={`base-${resource.target.kind ?? ""}:${resource.target.extId}`}
          target={resource.target}
          resolved={{
            kind: resource.target.kind ?? null,
            extId: resource.target.extId,
            resolvedKind: resource.name ? resource.target.kind ?? "item" : null,
            name: resource.name,
            iconMediaId: resource.iconMediaId,
          }}
          amount={resource.amount}
          size="small"
        />
      ))}
      {row.purchases.map((purchase, index) => (
        <Tooltip key={`shop-${index}`} title={`Compra: ${formatAmount(purchase.packs)} ${purchase.packs === 1 ? "pacote" : "pacotes"}`}>
          <span>
            <ContentChip
              target={purchase.target}
              resolved={{
                kind: purchase.target.kind ?? null,
                extId: purchase.target.extId,
                resolvedKind: purchase.name ? purchase.target.kind ?? "item" : null,
                name: purchase.name ?? null,
                iconMediaId: null,
              }}
              product
              size="small"
            />
          </span>
        </Tooltip>
      ))}
      {row.unitCost !== undefined ? (
        <CurrencyValue amount={row.unitCost} currency={row.currency} />
      ) : (
        <Tooltip title="O custo tem mais de uma moeda e não dá para somar.">
          <Stack direction="row" spacing={1}>
            {row.costs.map((cost, index) => (
              <CurrencyValue key={index} amount={cost.amount} currency={currencyReference(cost)} />
            ))}
          </Stack>
        </Tooltip>
      )}
    </Stack>
  );
}

/** Custo, venda e lucro de um lote de cada produto do jogo, calculados no servidor. */
export function ProfitabilityCalculator() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const pages = usePagination(NO_CRITERIA);
  const [orderBy, setOrderBy] = useState<SortKey>("profit");
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
      setOrder(key === "name" ? "asc" : "desc");
    }
    pages.setPage(1);
  };

  const header = (key: SortKey, label: string, align: "left" | "right" | "center" = "right") => (
    <TableCell align={align}>
      <TableSortLabel active={orderBy === key} direction={orderBy === key ? order : "asc"} onClick={() => sortBy(key)}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <StyledContainer
      title="Calculadora de rentabilidade"
      label="Custo, venda e lucro de um lote de cada produto, com as compras e os recursos que ele pede."
      searchValue={pages.info.search}
      onChangeSearch={pages.setSearch}
      search={{ placeholder: "Buscar item..." }}
      pages={pages}
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
                {header("unitCost", "Custo por unidade")}
                {header("sellPrice", "Venda")}
                {header("profit", "Lucro")}
                {header("steps", "Etapas", "center")}
                <TableCell>Bancada</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profits.data.content.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                      Nenhum produto encontrado.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {profits.data.content.map((row) => (
                <TableRow key={`${row.target.kind ?? ""}:${row.target.extId}`} hover>
                  <TableCell>
                    <ProfitItemCell row={row} />
                  </TableCell>
                  <TableCell align="right">
                    <CostCell row={row} />
                  </TableCell>
                  <TableCell align="right">
                    {row.sellPrice !== undefined ? <CurrencyValue amount={row.sellPrice} currency={row.currency} /> : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {row.profit !== undefined ? (
                      <CurrencyValue amount={row.profit} currency={row.currency} color={profitColor(row.profit)} />
                    ) : row.incomplete ? (
                      <Tooltip title="Categoria em aberto ou ciclo: o custo está incompleto.">
                        <WarningAmber color="warning" fontSize="small" />
                      </Tooltip>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell align="center">{row.steps}</TableCell>
                  <TableCell>
                    <ProfitStations row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </StyledContainer>
  );
}
