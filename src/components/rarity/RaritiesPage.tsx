import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, ArrowDownward, ArrowUpward, Delete, Edit } from "@mui/icons-material";
import type { Rarity } from "../../api/content";
import { useRarities, useRarityUsage, useRarityWrites } from "../../api/useContent";
import { AdminGate } from "../common/AdminGate";
import { describeError, slugOf } from "../common/contentForm";
import { DataChip } from "../common/DataChip";
import { StyledContainer } from "../common/StyledContainer";
import { StyledDialog } from "../common/StyledDialog";

const COLOR = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;

/** Quantos itens e entidades usam a raridade. */
function UsageLabel({ gameId, code }: { gameId: string; code: string }) {
  const usage = useRarityUsage(gameId, code);
  if (usage.isPending) return <CircularProgress size={12} />;
  return (
    <Typography variant="caption" color="text.secondary">
      {usage.items ?? 0} {usage.items === 1 ? "item" : "itens"} · {usage.entities ?? 0}{" "}
      {usage.entities === 1 ? "entidade" : "entidades"}
    </Typography>
  );
}

interface RarityFormDialogProps {
  gameId: string;
  /** A raridade a editar; null, criando. Montado só enquanto aberto. */
  rarity: Rarity | null;
  /** As que existem: para não criar código repetido (o PUT substituiria) e sugerir a ordem da nova. */
  existing: Rarity[];
  onClose: () => void;
}

function RarityFormDialog({ gameId, rarity, existing, onClose }: RarityFormDialogProps) {
  const creating = rarity === null;
  const [code, setCode] = useState(rarity?.code ?? "");
  const [codeTouched, setCodeTouched] = useState(false);
  const [name, setName] = useState(rarity?.name ?? "");
  const [color, setColor] = useState(rarity?.color ?? "#CAC2AD");
  const [ordinal, setOrdinal] = useState(
    String(rarity?.ordinal ?? existing.reduce((max, candidate) => Math.max(max, candidate.ordinal + 1), 0)),
  );
  const { put } = useRarityWrites(gameId);

  const duplicate = creating && existing.some((candidate) => candidate.code === code.trim());
  const colorValid = COLOR.test(color);
  const ordinalValid = /^-?\d+$/.test(ordinal.trim());
  const valid = name.trim() !== "" && code.trim() !== "" && !duplicate && colorValid && ordinalValid;

  const submit = () => {
    if (!valid) return;
    put.mutate(
      { code: code.trim(), name: name.trim(), color, ordinal: Number(ordinal.trim()) },
      { onSuccess: onClose },
    );
  };

  return (
    <StyledDialog
      open
      modal
      onClose={put.isPending ? () => undefined : onClose}
      title={creating ? "Nova raridade" : `Editar ${rarity.name}`}
      maxWidth="xs"
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
            {creating ? "Criar" : "Salvar"}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Stack alignItems="center">
          <DataChip label={name.trim() || "Prévia"} sx={{ color: colorValid ? color : undefined, fontWeight: 700 }} />
        </Stack>
        <TextField
          label="Nome"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (creating && !codeTouched) setCode(slugOf(event.target.value));
          }}
          required
          autoFocus
          fullWidth
        />
        <TextField
          label="Código"
          value={code}
          onChange={(event) => {
            setCodeTouched(true);
            setCode(event.target.value);
          }}
          required
          disabled={!creating}
          error={duplicate}
          helperText={
            duplicate
              ? "Já existe uma raridade com este código."
              : creating
                ? "É o rarityCode que itens e entidades usam."
                : "O código não muda depois de criado."
          }
          fullWidth
          slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
        />
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box
            component="input"
            type="color"
            value={colorValid ? color.slice(0, 7) : "#000000"}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setColor(event.target.value.toUpperCase() + (colorValid ? color.slice(7) : ""))
            }
            sx={{ width: 56, height: 56, p: 0, border: "none", background: "none", cursor: "pointer" }}
          />
          <TextField
            label="Cor"
            value={color}
            onChange={(event) => setColor(event.target.value.trim())}
            error={!colorValid}
            helperText={colorValid ? "Hexadecimal: #RRGGBB ou #RRGGBBAA." : "Use #RRGGBB ou #RRGGBBAA."}
            fullWidth
            slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
          />
        </Stack>
        <TextField
          label="Ordem"
          value={ordinal}
          onChange={(event) => setOrdinal(event.target.value)}
          error={!ordinalValid}
          helperText={ordinalValid ? "Posição na lista e nos filtros: da menor para a maior." : "Número inteiro."}
          fullWidth
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
        />
        {put.error && <Alert severity="error">{describeError(put.error)}</Alert>}
      </Stack>
    </StyledDialog>
  );
}

function DeleteRarityDialog({ gameId, rarity, onClose }: { gameId: string; rarity: Rarity; onClose: () => void }) {
  const { remove } = useRarityWrites(gameId);
  const usage = useRarityUsage(gameId, rarity.code);
  const inUse = (usage.items ?? 0) + (usage.entities ?? 0);

  return (
    <StyledDialog
      open
      modal
      onClose={remove.isPending ? () => undefined : onClose}
      title="Apagar raridade"
      maxWidth="xs"
      actions={
        <>
          <Button onClick={onClose} disabled={remove.isPending} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={remove.isPending}
            startIcon={remove.isPending ? <CircularProgress size={16} color="inherit" /> : <Delete />}
            onClick={() => remove.mutate(rarity.code, { onSuccess: onClose })}
            sx={{ textTransform: "none" }}
          >
            Apagar
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2">
          Apagar <strong style={{ color: rarity.color }}>{rarity.name}</strong> (<code>{rarity.code}</code>)?
        </Typography>
        {usage.isPending ? (
          <CircularProgress size={16} />
        ) : (
          inUse > 0 && (
            <Alert severity="warning">
              {usage.items} {usage.items === 1 ? "item usa" : "itens usam"} e {usage.entities}{" "}
              {usage.entities === 1 ? "entidade usa" : "entidades usam"} esta raridade. Eles continuam com o código, mas
              perdem o nome e a cor, e a raridade some do filtro.
            </Alert>
          )
        )}
        {remove.error && <Alert severity="error">{describeError(remove.error)}</Alert>}
      </Stack>
    </StyledDialog>
  );
}

function RaritiesPanel({ gameId }: { gameId: string }) {
  const rarities = useRarities(gameId);
  const { put } = useRarityWrites(gameId);
  const [search, setSearch] = useState("");
  // undefined: formulário fechado; null: criando.
  const [editing, setEditing] = useState<Rarity | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Rarity | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const all = useMemo(() => rarities.data ?? [], [rarities.data]);
  const term = search.trim().toLowerCase();
  const visible = term
    ? all.filter((rarity) => rarity.name.toLowerCase().includes(term) || rarity.code.toLowerCase().includes(term))
    : all;

  /**
   * Troca de lugar com a vizinha. Ordens iguais não têm como trocar, então a lista é renumerada
   * (0, 1, 2...) já com a troca, e só as que mudaram são gravadas.
   */
  const move = async (index: number, direction: -1 | 1) => {
    const order = [...all];
    const target = index + direction;
    [order[index], order[target]] = [order[target], order[index]];
    const changed = order
      .map((rarity, ordinal) => ({ ...rarity, ordinal }))
      .filter((rarity) => all.find((old) => old.code === rarity.code)?.ordinal !== rarity.ordinal);
    setMoveError(null);
    try {
      for (const rarity of changed) await put.mutateAsync(rarity);
    } catch (cause) {
      setMoveError(describeError(cause));
    }
  };

  return (
    <StyledContainer
      title="Raridades"
      label="Gerencie as raridades que dão nome e cor aos itens e entidades do jogo."
      search={{ placeholder: "Pesquisar raridades..." }}
      searchValue={search}
      onChangeSearch={setSearch}
      searchEnd={
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setEditing(null)}
          sx={{ textTransform: "none", whiteSpace: "nowrap" }}
        >
          Nova raridade
        </Button>
      }
    >
      {rarities.isPending ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : rarities.isError ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar as raridades.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {describeError(rarities.error)}
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={1}>
          {moveError && <Alert severity="error">{moveError}</Alert>}
          {visible.length === 0 && (
            <Typography variant="h6" sx={{ color: "text.disabled", textAlign: "center", py: 6 }}>
              {all.length === 0 ? "O jogo ainda não tem raridades." : "Nenhuma raridade encontrada."}
            </Typography>
          )}
          {visible.map((rarity) => {
            const index = all.indexOf(rarity);
            return (
              <Card
                key={rarity.code}
                sx={{ borderRadius: 1, border: 1, borderColor: "divider", borderLeft: 6, borderLeftColor: rarity.color }}
              >
                <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 1.5, pl: 2 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: rarity.color, flexShrink: 0, border: 1, borderColor: "divider" }} />
                  <Stack sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: rarity.color, lineHeight: 1.2 }}>
                      {rarity.name}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                        {rarity.code} · {rarity.color} · ordem {rarity.ordinal}
                      </Typography>
                      <UsageLabel gameId={gameId} code={rarity.code} />
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    {!term && (
                      <>
                        <Tooltip title="Subir">
                          <span>
                            <IconButton size="small" disabled={index === 0 || put.isPending} onClick={() => move(index, -1)}>
                              <ArrowUpward fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Descer">
                          <span>
                            <IconButton size="small" disabled={index === all.length - 1 || put.isPending} onClick={() => move(index, 1)}>
                              <ArrowDownward fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => setEditing(rarity)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Apagar">
                      <IconButton size="small" color="error" onClick={() => setDeleting(rarity)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      )}
      {editing !== undefined && (
        <RarityFormDialog gameId={gameId} rarity={editing} existing={all} onClose={() => setEditing(undefined)} />
      )}
      {deleting && <DeleteRarityDialog gameId={gameId} rarity={deleting} onClose={() => setDeleting(null)} />}
    </StyledContainer>
  );
}

/** Painel de raridades, só para administradores do jogo: listar, criar, editar, reordenar e apagar. */
export function RaritiesPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  return (
    <AdminGate gameId={gameId} title="Raridades" from={`/game/${gameId}/rarities`}>
      <RaritiesPanel gameId={gameId} />
    </AdminGate>
  );
}
