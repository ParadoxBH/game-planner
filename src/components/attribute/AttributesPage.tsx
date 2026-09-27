import { useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, Delete, Edit, OpenInNew } from "@mui/icons-material";
import { useAttributeDefinitions, useAttributeUsage, useAttributeWrites } from "../../api/useContent";
import { AdminGate } from "../common/AdminGate";
import { describeError } from "../common/contentForm";
import { StyledContainer } from "../common/StyledContainer";
import { StyledDialog } from "../common/StyledDialog";
import { AttributeFormDialog } from "./AttributeFormDialog";
import { OTHERS, TYPE_LABELS, UNDEFINED, sectionOf, usageText, type AttributeRow } from "./attributeRows";

function DeleteAttributeDialog({ gameId, row, onClose }: { gameId: string; row: AttributeRow; onClose: () => void }) {
  const { remove } = useAttributeWrites(gameId);
  return (
    <StyledDialog
      open
      modal
      onClose={remove.isPending ? () => undefined : onClose}
      title="Apagar definição"
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
            onClick={() => remove.mutate(row.key, { onSuccess: onClose })}
            sx={{ textTransform: "none" }}
          >
            Apagar
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2">
          Apagar a definição de <strong>{row.definition?.label}</strong> (<code>{row.key}</code>)?
        </Typography>
        {row.usage && (
          <Alert severity="info">
            Os valores continuam nos {usageText(row.usage)}; o atributo passa a aparecer pela chave, em "{OTHERS}".
          </Alert>
        )}
        {remove.error && <Alert severity="error">{describeError(remove.error)}</Alert>}
      </Stack>
    </StyledDialog>
  );
}

function AttributesPanel({ gameId }: { gameId: string }) {
  const definitions = useAttributeDefinitions(gameId);
  const usage = useAttributeUsage(gameId);
  const [search, setSearch] = useState("");
  // undefined: formulário fechado; null: criando.
  const [editing, setEditing] = useState<AttributeRow | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<AttributeRow | null>(null);

  const rows = useMemo<AttributeRow[]>(() => {
    const byKey = new Map<string, AttributeRow>();
    (definitions.data ?? []).forEach((definition) => byKey.set(definition.key, { key: definition.key, definition }));
    (usage.data ?? []).forEach((entry) => byKey.set(entry.key, { ...(byKey.get(entry.key) ?? { key: entry.key }), usage: entry }));
    return [...byKey.values()];
  }, [definitions.data, usage.data]);

  const groups = useMemo(
    () => [...new Set((definitions.data ?? []).flatMap((definition) => (definition.group ? [definition.group] : [])))].sort(),
    [definitions.data],
  );
  const defined = useMemo(() => new Set((definitions.data ?? []).map((definition) => definition.key)), [definitions.data]);

  const term = search.trim().toLowerCase();
  const visible = term
    ? rows.filter(
        (row) =>
          row.key.includes(term) ||
          row.definition?.label.toLowerCase().includes(term) ||
          row.definition?.group?.toLowerCase().includes(term),
      )
    : rows;

  // Seções pelo grupo; "Outros" e "Sem definição" por último. Dentro, pela ordem e pelo rótulo.
  const sections = useMemo(() => {
    const sorted = [...visible].sort(
      (a, b) =>
        (a.definition?.ordinal ?? 0) - (b.definition?.ordinal ?? 0) ||
        (a.definition?.label ?? a.key).localeCompare(b.definition?.label ?? b.key),
    );
    const map = new Map<string, AttributeRow[]>();
    sorted.forEach((row) => map.set(sectionOf(row), [...(map.get(sectionOf(row)) ?? []), row]));
    const rank = (name: string) => (name === UNDEFINED ? 2 : name === OTHERS ? 1 : 0);
    return [...map.entries()].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
  }, [visible]);

  const loading = definitions.isPending || usage.isPending;
  const failure = definitions.error ?? usage.error;
  const undefinedCount = rows.filter((row) => !row.definition).length;

  return (
    <StyledContainer
      title="Atributos"
      label="Rótulo, grupo, tipo e unidade dos atributos que os itens e entidades do jogo usam."
      search={{ placeholder: "Pesquisar atributos..." }}
      searchValue={search}
      onChangeSearch={setSearch}
      searchEnd={
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setEditing(null)}
          sx={{ textTransform: "none", whiteSpace: "nowrap" }}
        >
          Novo atributo
        </Button>
      }
    >
      {loading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10, flex: 1 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : failure ? (
        <Stack alignItems="center" spacing={1} sx={{ p: 4, flex: 1 }}>
          <Typography color="error" variant="h6" sx={{ fontWeight: 700 }}>
            Não foi possível carregar os atributos.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {describeError(failure)}
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={3}>
          {undefinedCount > 0 && !term && (
            <Alert severity="info">
              {undefinedCount} {undefinedCount === 1 ? "atributo usado não tem definição" : "atributos usados não têm definição"}: aparecem pela
              chave. Use "Definir" para dar rótulo, grupo e unidade.
            </Alert>
          )}
          {sections.length === 0 && (
            <Typography variant="h6" sx={{ color: "text.disabled", textAlign: "center", py: 6 }}>
              {rows.length === 0 ? "O jogo ainda não tem atributos." : "Nenhum atributo encontrado."}
            </Typography>
          )}
          {sections.map(([section, sectionRows]) => (
            <Stack key={section} spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {section}
                </Typography>
                <Chip size="small" label={sectionRows.length} sx={{ height: 20 }} />
              </Stack>
              {sectionRows.map((row) => (
                <Card key={row.key} sx={{ borderRadius: 1, border: 1, borderColor: "divider" }}>
                  <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={1.5} sx={{ p: 1.5, pl: 2 }}>
                    <Stack sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                        {row.definition?.label ?? row.key}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                        {row.key}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
                      {row.definition ? (
                        <>
                          <Chip size="small" label={TYPE_LABELS[row.definition.dataType]} />
                          {row.definition.unit && <Chip size="small" variant="outlined" label={row.definition.unit} />}
                          <Chip size="small" variant="outlined" label={`ordem ${row.definition.ordinal}`} />
                        </>
                      ) : (
                        <Chip size="small" color="warning" variant="outlined" label="sem definição" />
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 110, textAlign: { sm: "right" } }}>
                        {usageText(row.usage)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {row.usage && (
                        <Tooltip title="Ver itens e entidades com este atributo">
                          <IconButton size="small" component={RouterLink} to={`/game/${gameId}/metadado/view/${encodeURIComponent(row.key)}`}>
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {row.definition ? (
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => setEditing(row)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Button size="small" startIcon={<Add />} onClick={() => setEditing(row)} sx={{ textTransform: "none" }}>
                          Definir
                        </Button>
                      )}
                      {row.definition && (
                        <Tooltip title="Apagar definição">
                          <IconButton size="small" color="error" onClick={() => setDeleting(row)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Stack>
          ))}
        </Stack>
      )}
      {editing !== undefined && (
        <AttributeFormDialog gameId={gameId} row={editing} groups={groups} defined={defined} onClose={() => setEditing(undefined)} />
      )}
      {deleting && <DeleteAttributeDialog gameId={gameId} row={deleting} onClose={() => setDeleting(null)} />}
    </StyledContainer>
  );
}

/** Painel de atributos, só para administradores do jogo: ver o uso, definir, editar e apagar definições. */
export function AttributesPage() {
  const { gameId = "" } = useParams<{ gameId: string }>();
  return (
    <AdminGate gameId={gameId} title="Atributos" from={`/game/${gameId}/attributes`}>
      <AttributesPanel gameId={gameId} />
    </AdminGate>
  );
}
