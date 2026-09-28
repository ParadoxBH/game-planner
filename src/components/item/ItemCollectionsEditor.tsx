import { useMemo, useState } from "react";
import { Alert, Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { Add, ArrowBack, CheckCircle, Delete, NavigateNext } from "@mui/icons-material";
import type { CollectionDocument, CollectionGroupDocument } from "../../api/content";
import { listRowSx } from "../../theme/listRowSx";
import { StyledDialog } from "../common/StyledDialog";

/** Grupo que não está em conjunto nenhum: aparece numa entrada própria da lista de conjuntos. */
const NO_COLLECTION = "";
const NO_COLLECTION_LABEL = "Sem conjunto";

interface ItemCollectionsEditorProps {
  /** Todos os grupos de conjunto do jogo. */
  groups: CollectionGroupDocument[];
  collections: CollectionDocument[];
  /** Grupos em que o item fica ao salvar. */
  value: Set<string>;
  /** Grupos em que o item já estava: os que não estão aqui aparecem como novos. */
  original: Set<string>;
  onChange: (next: Set<string>) => void;
  loading: boolean;
  /** Há mais grupos do que a página trouxe: a lista pode estar incompleta. */
  truncated: boolean;
}

function byPosition(a: CollectionGroupDocument, b: CollectionGroupDocument) {
  return (a.ordinal ?? Number.MAX_SAFE_INTEGER) - (b.ordinal ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name);
}

interface AddGroupDialogProps {
  groups: CollectionGroupDocument[];
  collections: CollectionDocument[];
  /** Grupos em que o item já está (ou vai estar): aparecem marcados e não se escolhem. */
  value: Set<string>;
  onClose: () => void;
  onConfirm: (group: CollectionGroupDocument) => void;
}

/**
 * Janela de adicionar em dois passos: escolhe o conjunto, depois o grupo dele, e confirma. Montada só enquanto aberta,
 * então sempre recomeça pelos conjuntos.
 */
function AddGroupDialog({ groups, collections, value, onClose, onConfirm }: AddGroupDialogProps) {
  const [collection, setCollection] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Conjuntos com os grupos de cada um, na ordem do nome; "Sem conjunto" por último, se houver.
  const entries = useMemo(() => {
    const list = collections.map((candidate) => ({
      extId: candidate.extId,
      name: candidate.name ?? candidate.extId,
      groups: groups.filter((group) => group.collections.includes(candidate.extId)).sort(byPosition),
    }));
    const loose = groups.filter((group) => group.collections.length === 0).sort(byPosition);
    if (loose.length > 0) list.push({ extId: NO_COLLECTION, name: NO_COLLECTION_LABEL, groups: loose });
    return list;
  }, [collections, groups]);

  const current = collection === null ? undefined : entries.find((entry) => entry.extId === collection);
  const chosen = current?.groups.find((group) => group.extId === selected);

  return (
    <StyledDialog
      open
      modal
      maxWidth="sm"
      contentScroll={false}
      onClose={onClose}
      title={current ? current.name : "Adicionar a um conjunto"}
      subHeader={
        <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 1 }}>
          {current && (
            <Button
              size="small"
              startIcon={<ArrowBack />}
              onClick={() => {
                setCollection(null);
                setSelected(null);
              }}
              sx={{ textTransform: "none" }}
            >
              Conjuntos
            </Button>
          )}
          <Typography variant="body2" color="text.secondary">
            {current ? "2. Escolha o grupo" : "1. Escolha o conjunto"}
          </Typography>
        </Stack>
      }
      actions={
        <>
          <Button onClick={onClose} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!chosen}
            onClick={() => chosen && onConfirm(chosen)}
            sx={{ textTransform: "none" }}
          >
            Adicionar
          </Button>
        </>
      }
    >
      <Box sx={{ border: 1, borderColor: "divider", flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
        {!current &&
          (entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              O jogo ainda não tem conjuntos.
            </Typography>
          ) : (
            entries.map((entry, index) => {
              const free = entry.groups.filter((group) => !value.has(group.extId)).length;
              return (
                <Stack
                  key={entry.extId || "none"}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  onClick={() => setCollection(entry.extId)}
                  sx={[listRowSx({ index, clickable: true }), { px: 2, py: 1.25 }]}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
                    {entry.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {entry.groups.length} {entry.groups.length === 1 ? "grupo" : "grupos"}
                    {free < entry.groups.length ? ` · ${free} disponíveis` : ""}
                  </Typography>
                  <NavigateNext fontSize="small" sx={{ color: "text.secondary" }} />
                </Stack>
              );
            })
          ))}

        {current &&
          (current.groups.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              Este conjunto ainda não tem grupos.
            </Typography>
          ) : (
            current.groups.map((group, index) => {
              const already = value.has(group.extId);
              const isSelected = group.extId === selected;
              return (
                <Stack
                  key={group.extId}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  onClick={already ? undefined : () => setSelected(group.extId)}
                  onDoubleClick={already ? undefined : () => onConfirm(group)}
                  sx={[
                    listRowSx({ index, selected: isSelected, clickable: !already }),
                    { px: 2, py: 1.25, opacity: already ? 0.5 : 1 },
                  ]}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
                    {group.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {group.members.length} {group.members.length === 1 ? "membro" : "membros"}
                  </Typography>
                  {already ? (
                    <Chip size="small" label="já está" sx={{ height: 20 }} />
                  ) : (
                    isSelected && <CheckCircle fontSize="small" color="primary" />
                  )}
                </Stack>
              );
            })
          ))}
      </Box>
    </StyledDialog>
  );
}

/**
 * Conjuntos do item: os grupos em que ele está, com o conjunto de cada um, para remover; e o botão de adicionar, que
 * abre a escolha de conjunto e grupo. Nada é gravado aqui: o editor aplica as mudanças nos grupos ao salvar o item.
 */
export function ItemCollectionsEditor({ groups, collections, value, original, onChange, loading, truncated }: ItemCollectionsEditorProps) {
  const [adding, setAdding] = useState(false);
  const collectionNames = useMemo(
    () => new Map(collections.map((collection) => [collection.extId, collection.name ?? collection.extId])),
    [collections],
  );
  const collectionLabel = (group: CollectionGroupDocument) =>
    group.collections.length === 0 ? NO_COLLECTION_LABEL : group.collections.map((id) => collectionNames.get(id) ?? id).join(", ");

  const byId = useMemo(() => new Map(groups.map((group) => [group.extId, group])), [groups]);
  const current = [...value]
    .map((id) => byId.get(id) ?? ({ extId: id, name: id, collections: [], members: [], events: [], ordinal: null } as unknown as CollectionGroupDocument))
    .sort((a, b) => collectionLabel(a).localeCompare(collectionLabel(b)) || byPosition(a, b));
  const removed = [...original].filter((id) => !value.has(id)).length;
  const added = [...value].filter((id) => !original.has(id)).length;

  const remove = (id: string) => {
    const next = new Set(value);
    next.delete(id);
    onChange(next);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="body2" color="text.secondary">
          Os grupos de conjunto em que o item aparece. As mudanças são gravadas ao salvar o item.
        </Typography>
        <Button
          size="small"
          startIcon={<Add />}
          onClick={() => setAdding(true)}
          disabled={loading}
          sx={{ textTransform: "none", whiteSpace: "nowrap" }}
        >
          Adicionar
        </Button>
      </Stack>

      {truncated && (
        <Alert severity="warning">O jogo tem mais grupos do que a tela carrega; alguns podem não aparecer aqui.</Alert>
      )}
      {(added > 0 || removed > 0) && (
        <Typography variant="caption" color="text.secondary">
          Ao salvar: {[added > 0 && `entra em ${added} ${added === 1 ? "grupo" : "grupos"}`, removed > 0 && `sai de ${removed} ${removed === 1 ? "grupo" : "grupos"}`]
            .filter(Boolean)
            .join(" e ")}
          .
        </Typography>
      )}

      {current.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          {loading ? "Carregando os conjuntos..." : "O item não está em nenhum conjunto."}
        </Typography>
      ) : (
        <Box sx={{ border: 1, borderColor: "divider" }}>
          {current.map((group, index) => (
            <Stack key={group.extId} direction="row" alignItems="center" spacing={1.5} sx={[listRowSx({ index }), { px: 2, py: 1 }]}>
              <Stack sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {collectionLabel(group)}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  {group.name}
                </Typography>
              </Stack>
              {!original.has(group.extId) && <Chip size="small" color="primary" label="novo" sx={{ height: 20 }} />}
              <Tooltip title="Tirar o item deste grupo">
                <IconButton size="small" color="error" onClick={() => remove(group.extId)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Box>
      )}

      {adding && (
        <AddGroupDialog
          groups={groups}
          collections={collections}
          value={value}
          onClose={() => setAdding(false)}
          onConfirm={(group) => {
            onChange(new Set([...value, group.extId]));
            setAdding(false);
          }}
        />
      )}
    </Stack>
  );
}
