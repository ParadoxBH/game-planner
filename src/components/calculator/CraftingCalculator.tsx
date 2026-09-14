import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add, ClearAll, Delete } from "@mui/icons-material";
import { referenceParam, type Reference, type ResolvedReference } from "../../api/content";
import { sameTarget } from "../../api/references";
import { useCraftingPlan } from "../../api/useContent";
import { ApiContentSelector } from "../common/ApiContentSelector";
import { ContentChip } from "../common/ContentChip";
import { StyledContainer } from "../common/StyledContainer";
import { choiceParams, CraftingTreeBody, NO_CHOICES, type TreeChoices } from "../recipe/ApiCraftingTree";

interface PlanEntry {
  target: Reference;
  resolved: ResolvedReference;
  amount: number;
}

/**
 * Lista de itens para produzir, calculada no servidor numa árvore só: o que sobra de um alvo serve
 * ao próximo. Lotes e pacotes são inteiros, e as sobras aparecem no total.
 */
export function CraftingCalculator() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  const [entries, setEntries] = useState<PlanEntry[]>([]);
  const [choices, setChoices] = useState<TreeChoices>(NO_CHOICES);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const targets = useMemo(
    () => entries.map((entry) => ({ target: referenceParam(entry.target), amount: entry.amount })),
    [entries],
  );
  const plan = useCraftingPlan(gameId, targets, choiceParams(choices));

  const add = (selection: ResolvedReference) => {
    const target: Reference = { kind: selection.resolvedKind ?? selection.kind, extId: selection.extId };
    setEntries((previous) =>
      previous.some((entry) => sameTarget(entry.target, target))
        ? previous.map((entry) => (sameTarget(entry.target, target) ? { ...entry, amount: entry.amount + 1 } : entry))
        : [...previous, { target, resolved: selection, amount: 1 }],
    );
    setSelectorOpen(false);
  };

  const setAmount = (index: number, amount: number) =>
    setEntries((previous) => previous.map((entry, position) => (position === index ? { ...entry, amount } : entry)));

  return (
    <StyledContainer
      title="Calculadora de crafting"
      label="Monte uma lista de itens para calcular recursos, compras, custo e o que sobra."
    >
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ flex: 1, minHeight: 0, overflow: { lg: "hidden" } }}>
        <Paper elevation={0} sx={{ p: 2, display: "flex", flexDirection: "column", flex: { lg: "0 0 340px" }, minHeight: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" sx={{ color: "primary.main", fontWeight: 800 }}>
              LISTA DE CRAFTING
            </Typography>
            <Stack direction="row" spacing={1}>
              {entries.length > 0 && (
                <Button
                  startIcon={<ClearAll />}
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setEntries([]);
                    setChoices(NO_CHOICES);
                  }}
                >
                  Limpar
                </Button>
              )}
              <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setSelectorOpen(true)}>
                Adicionar
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1 }} />

          {entries.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 8, opacity: 0.6 }}>
              <Typography variant="body2">Nenhum item na lista.</Typography>
              <Typography variant="caption">Clique em "Adicionar" para começar.</Typography>
            </Stack>
          ) : (
            <TableContainer sx={{ flex: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Item ou entidade</TableCell>
                    <TableCell align="center">Qtd</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow key={referenceParam(entry.target)}>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <ContentChip target={entry.target} resolved={entry.resolved} size="small" />
                          <Typography variant="body2" fontWeight={500}>
                            {entry.resolved.name ?? entry.target.extId}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={entry.amount}
                          onChange={(event) => setAmount(index, Math.max(1, Math.floor(Number(event.target.value) || 1)))}
                          inputProps={{ min: 1, style: { textAlign: "center", padding: "4px 8px" } }}
                          sx={{ width: 72 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setEntries((previous) => previous.filter((_, position) => position !== index))}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {entries.length === 0 ? (
          <Paper elevation={0} sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
            <Typography variant="body1" sx={{ opacity: 0.4 }}>
              Adicione itens para ver a árvore e os totais.
            </Typography>
          </Paper>
        ) : !plan.data ? (
          <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, p: 4 }}>
            {plan.isError ? <Typography color="error">{plan.error.message}</Typography> : <CircularProgress color="primary" />}
          </Stack>
        ) : (
          <Stack sx={{ flex: 1, minHeight: 0 }}>
            <CraftingTreeBody
              gameId={gameId}
              roots={plan.data.roots}
              totals={plan.data.totals}
              revenue={plan.data.revenue}
              choices={choices}
              onChoicesChange={setChoices}
              fetching={plan.isFetching}
              toolbar={
                plan.isError ? (
                  <Typography variant="body2" color="error">
                    {plan.error.message}
                  </Typography>
                ) : undefined
              }
            />
          </Stack>
        )}
      </Stack>

      <ApiContentSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onConfirm={add}
        gameId={gameId}
        title="Adicionar à lista"
      />
    </StyledContainer>
  );
}
