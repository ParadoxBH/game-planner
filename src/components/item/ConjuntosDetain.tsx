import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardActionArea,
  Checkbox,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  ArrowBack,
  ArrowDownward,
  ArrowUpward,
  CheckCircle,
  CheckCircleOutline,
  Edit,
  GridView,
  ViewList,
} from "@mui/icons-material";
import { ApiError } from "../../api/ApiError";
import type { CollectionDocument, CollectionGroupDocument, CollectionRelated, Reference } from "../../api/content";
import { currentMedia, ReferenceIndex } from "../../api/references";
import { useContentDetails, useContentWrites } from "../../api/useContent";
import type { FilterValue, FilterValues, ListingSchema } from "../../api/query";
import { useEventFilter } from "../../context/EventFilterContext";
import {
  addProgress,
  groupProgress,
  isComplete,
  NO_PROGRESS,
  useCollectedMembers,
  useStoredState,
} from "../../hooks/useCollectedMembers";
import { useGameAdmin, useGameEditor } from "../../hooks/useGameAdmin";
import { usePlatform } from "../../hooks/usePlatform";
import { ContentChip } from "../common/ContentChip";
import { move } from "../common/formValues";
import { ContentIcon } from "../common/ContentIcon";
import { QueryBuilder } from "../common/QueryBuilder";
import { describeError } from "../common/contentForm";
import { DataCard } from "../common/DataCard";
import { StyledContainer } from "../common/StyledContainer";
import { StyledDialog } from "../common/StyledDialog";
import { CollectionFormDialog } from "./CollectionFormDialog";
import { CollectionGroupFormDialog } from "./CollectionGroupFormDialog";
import { CollectionProgress } from "./CollectionProgress";

type Layout = "list" | "grid";

/** Como os grupos são ordenados na tela. "ordem" é a que o admin definiu e a API devolve. */
type GroupSort = "ordem" | "nome" | "progresso" | "membros";

/**
 * Os filtros desta tela, no mesmo formato que o backend descreve para as listagens, para o
 * QueryBuilder desenhar igual ao das outras telas. Só que aqui os grupos vieram no agregado do
 * conjunto, então quem aplica é a própria tela, e não uma consulta.
 */
const GROUP_FILTERS: ListingSchema = {
  search: { placeholder: "Pesquisar grupos ou membros...", fields: [] },
  activeEvents: false,
  filters: [
    {
      key: "sort",
      label: "Ordenar",
      display: "select",
      allLabel: "Ordem do conjunto",
      options: [
        { value: "nome", label: "Nome" },
        { value: "progresso", label: "Progresso (faltando antes)" },
        { value: "membros", label: "Mais membros" },
      ],
    },
    {
      key: "completed",
      label: "Completos",
      display: "switch",
      options: [{ value: "hide", label: "Esconder completos" }],
    },
  ],
};

/** O grupo como documento de escrita: sem media nem meta, que não são do formulário. */
function groupPayload(group: CollectionGroupDocument, ordinal: number) {
  return {
    extId: group.extId,
    name: group.name,
    summary: group.summary,
    description: group.description,
    collections: group.collections,
    members: group.members,
    events: group.events,
    ordinal,
  };
}

/** Quanto falta, de 0 a 1; grupo vazio conta como completo. */
function ratio(progress: { done: number; total: number }): number {
  return progress.total === 0 ? 1 : progress.done / progress.total;
}

interface MemberGridProps {
  members: Reference[];
  references: ReferenceIndex;
  collected: Set<string>;
  onToggle: (extId: string) => void;
}

/** Membros do grupo: ícone com link, nome e a marcação de obtido. */
function MemberGrid({ members, references, collected, onToggle }: MemberGridProps) {
  return (
    <Grid container spacing={1}>
      {members.map((member) => {
        const checked = collected.has(member.extId);
        return (
          <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={`${member.kind ?? ""}:${member.extId}`}>
            <Box sx={{ position: "relative", height: "100%" }}>
              <DataCard
                sx={{
                  p: 1.5,
                  pt: 2,
                  height: "100%",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                  textAlign: "center",
                  backgroundColor: checked ? (theme) => alpha(theme.palette.success.light, 0.1) : undefined,
                }}
              >
                <ContentChip target={member} resolved={references.find(member)} size="large" />
                <Typography variant="caption" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {references.name(member)}
                </Typography>
              </DataCard>
              <Checkbox
                icon={<CheckCircleOutline />}
                checkedIcon={<CheckCircle />}
                checked={checked}
                onChange={() => onToggle(member.extId)}
                sx={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  p: 0.5,
                  color: "text.disabled",
                  "&.Mui-checked": { color: "success.main" },
                }}
              />
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

/** Ícone do grupo: o próprio ou, sem ele, o do primeiro membro. */
function groupIcon(group: CollectionGroupDocument, references: ReferenceIndex): string | null {
  const first = group.members[0];
  return currentMedia(group.media, "icon") ?? (first ? references.find(first)?.iconMediaId ?? null : null);
}

/** Coleção lida do agregado /collections/{id}/details: os grupos com os membros e o progresso marcado no navegador. */
export function ConjuntosDetain() {
  const { gameId = "", conjuntoId = "" } = useParams<{ gameId: string; conjuntoId: string }>();
  const navigate = useNavigate();
  const { isMobile } = usePlatform();
  const { activeEventIds } = useEventFilter();
  const { collected, toggle } = useCollectedMembers(gameId);
  const [hideCompleted, setHideCompleted] = useStoredState(`gp_hide_completed_${gameId}`, false);
  const [layout, setLayout] = useStoredState<Layout>(`gp_conjuntos_layout_${gameId}`, "list");
  const [search, setSearch] = useState("");
  const [openGroup, setOpenGroup] = useState<CollectionGroupDocument | null>(null);
  const [sort, setSort] = useStoredState<GroupSort>(`gp_conjuntos_sort_${gameId}`, "ordem");
  // O QueryBuilder fala em FilterValues; a tela guarda cada escolha no navegador, como antes.
  const filterValues: FilterValues = {
    sort: sort === "ordem" ? null : sort,
    completed: hideCompleted ? "hide" : null,
  };
  const changeFilter = (key: string, value: FilterValue) => {
    if (key === "sort") setSort(typeof value === "string" ? (value as GroupSort) : "ordem");
    if (key === "completed") setHideCompleted(value === "hide");
  };
  const { canEdit } = useGameEditor(gameId);
  const { isAdmin } = useGameAdmin(gameId);
  const [editing, setEditing] = useState(false);
  // O grupo em edição; "new" é um grupo novo já dentro deste conjunto.
  const [editingGroup, setEditingGroup] = useState<CollectionGroupDocument | "new" | null>(null);
  const { putAll } = useContentWrites(gameId, "collection-groups");

  const details = useContentDetails<CollectionDocument, CollectionRelated>(gameId, "collections", conjuntoId);
  const references = useMemo(() => new ReferenceIndex(details.data?.references), [details.data]);

  if (details.isPending) {
    return (
      <StyledContainer title="Carregando..." label="Obtendo dados do conjunto">
        <Stack alignItems="center" sx={{ py: 10 }}>
          <CircularProgress color="primary" />
        </Stack>
      </StyledContainer>
    );
  }

  if (details.isError) {
    const unregistered = details.error instanceof ApiError && details.error.kind === "unregistered-content";
    return (
      <StyledContainer
        title={unregistered ? "Conjunto não cadastrado" : "Não foi possível abrir o conjunto"}
        label={unregistered ? `"${conjuntoId}" é citado em outros conteúdos, mas ainda não foi cadastrado.` : details.error.message}
      >
        <Typography variant="body2" color="text.secondary">
          Verifique o código ou volte para a <Link to={`/game/${gameId}/conjuntos`}>lista de conjuntos</Link>.
        </Typography>
      </StyledContainer>
    );
  }

  const { document: collection, related } = details.data;
  // Grupo sem evento ou com algum evento ativo: a mesma regra do filtro activeEvents da API.
  const groups = related.groups.content.filter(
    (group) => group.events.length === 0 || group.events.some((id) => activeEventIds.includes(id)),
  );
  const total = groups.reduce((sum, group) => addProgress(sum, groupProgress(group, collected)), NO_PROGRESS);
  const term = search.trim().toLowerCase();
  const filtered = groups
    .filter(
      (group) =>
        !term ||
        group.name.toLowerCase().includes(term) ||
        group.members.some((member) => references.name(member).toLowerCase().includes(term)),
    )
    .filter((group) => !hideCompleted || !isComplete(groupProgress(group, collected)));
  // "ordem" é a que veio da API, já pela posição do grupo no conjunto.
  const visible =
    sort === "ordem"
      ? filtered
      : [...filtered].sort((a, b) => {
          if (sort === "nome") return a.name.localeCompare(b.name);
          if (sort === "membros") return b.members.length - a.members.length;
          return ratio(groupProgress(a, collected)) - ratio(groupProgress(b, collected));
        });

  // Reordenar exige ver o conjunto inteiro: com filtro ou página cortada, as setas somem.
  const everyGroup = related.groups.content;
  const canReorder =
    canEdit && sort === "ordem" && layout === "list" && visible.length === everyGroup.length
    && everyGroup.length === related.groups.total;

  /** Troca o grupo de lugar e renumera o conjunto, num lote só. */
  const moveGroup = (group: CollectionGroupDocument, direction: -1 | 1) => {
    const from = everyGroup.indexOf(group);
    if (from < 0 || from + direction < 0 || from + direction >= everyGroup.length) return;
    const changed = move(everyGroup, from, direction)
      .map((row, position) => ({ row, position }))
      .filter(({ row, position }) => row.ordinal !== position)
      .map(({ row, position }) => groupPayload(row, position));
    if (changed.length > 0) putAll.mutate(changed);
  };

  return (
    <StyledContainer
      prefix={<ContentIcon mediaId={currentMedia(collection.media, "icon")} kind="collection" alt={collection.name} size={60} />}
      title={collection.name}
      label={collection.summary ?? collection.description ?? `Grupos do conjunto ${collection.extId}`}
      searchEnd={
        <>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flex={1}
            justifyContent={isMobile ? "space-between" : "flex-end"}
          >
            <Chip
              label={`${total.done} / ${total.total}`}
              color={isComplete(total) ? "success" : "primary"}
              variant={isComplete(total) ? "filled" : "outlined"}
              sx={{ fontWeight: 800, borderRadius: 1 }}
            />
            <Button size="small" startIcon={<ArrowBack />} onClick={() => navigate(`/game/${gameId}/conjuntos`)} sx={{ textTransform: "none" }}>
              Voltar
            </Button>
            {canEdit && (
              <>
                <Button size="small" startIcon={<Edit />} onClick={() => setEditing(true)} sx={{ textTransform: "none" }}>
                  Editar
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setEditingGroup("new")}
                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                >
                  Novo grupo
                </Button>
              </>
            )}
            <ToggleButtonGroup value={layout} exclusive size="small" onChange={(_, next: Layout | null) => next && setLayout(next)}>
              <Tooltip title="Grupos em lista">
                <ToggleButton value="list">
                  <ViewList sx={{ fontSize: 20 }} />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Grupos em grade">
                <ToggleButton value="grid">
                  <GridView sx={{ fontSize: 20 }} />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
          </Stack>
          <QueryBuilder
            schema={GROUP_FILTERS}
            search={search}
            onSearchChange={setSearch}
            values={filterValues}
            onChange={changeFilter}
          />
        </>
      }
    >
      <Stack spacing={2} sx={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {putAll.isError && <Alert severity="error">A ordem não foi salva: {describeError(putAll.error)}</Alert>}
        {visible.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
            {groups.length === 0 ? "Nenhum grupo disponível neste conjunto com os eventos ativos." : "Nenhum grupo encontrado com estes filtros."}
          </Typography>
        )}

        {layout === "list" &&
          visible.map((group) => {
            const progress = groupProgress(group, collected);
            return (
              <Paper key={group.extId} elevation={0} sx={{ p: isMobile ? 1.5 : 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: isComplete(progress) ? "success.light" : "primary.light" }}>
                    {group.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({progress.done}/{progress.total})
                  </Typography>
                  {canReorder && (
                    <>
                      <Tooltip title="Subir">
                        <span>
                          <IconButton
                            size="small"
                            disabled={putAll.isPending || everyGroup.indexOf(group) === 0}
                            onClick={() => moveGroup(group, -1)}
                          >
                            <ArrowUpward fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Descer">
                        <span>
                          <IconButton
                            size="small"
                            disabled={putAll.isPending || everyGroup.indexOf(group) === everyGroup.length - 1}
                            onClick={() => moveGroup(group, 1)}
                          >
                            <ArrowDownward fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )}
                  {canEdit && (
                    <Tooltip title="Editar grupo">
                      <IconButton size="small" onClick={() => setEditingGroup(group)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                {group.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {group.description}
                  </Typography>
                )}
                <MemberGrid members={group.members} references={references} collected={collected} onToggle={toggle} />
              </Paper>
            );
          })}

        {layout === "grid" && (
          <Grid container spacing={isMobile ? 1 : 2}>
            {visible.map((group) => {
              const progress = groupProgress(group, collected);
              return (
                <Grid size={{ xs: 6, md: 4, lg: 3 }} key={group.extId}>
                  <Card
                    sx={{
                      height: "100%",
                      borderRadius: 1,
                      border: 1,
                      borderColor: isComplete(progress) ? "success.main" : "divider",
                      transition: "all 0.3s",
                      "&:hover": { transform: "translateY(-4px)", borderColor: "primary.main" },
                    }}
                  >
                    <CardActionArea onClick={() => setOpenGroup(group)} sx={{ p: 2, height: "100%" }}>
                      <Stack alignItems="center" spacing={1.5} sx={{ textAlign: "center", height: "100%" }}>
                        <ContentIcon mediaId={groupIcon(group, references)} kind="collection" alt={group.name} size={64} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                          {group.name}
                        </Typography>
                        <Box sx={{ width: "100%", mt: "auto" }}>
                          <CollectionProgress progress={progress} />
                        </Box>
                      </Stack>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {related.groups.content.length < related.groups.total && (
          <Typography variant="caption" color="text.secondary">
            Mostrando {related.groups.content.length} de {related.groups.total} grupos.
          </Typography>
        )}
      </Stack>

      <StyledDialog
        open={openGroup !== null}
        onClose={() => setOpenGroup(null)}
        title={openGroup ? `${openGroup.name} (${groupProgress(openGroup, collected).done}/${openGroup.members.length})` : ""}
        maxWidth="md"
        fullWidth
        actions={
          canEdit && openGroup ? (
            <Button
              startIcon={<Edit />}
              onClick={() => {
                setEditingGroup(openGroup);
                setOpenGroup(null);
              }}
              sx={{ textTransform: "none" }}
            >
              Editar grupo
            </Button>
          ) : undefined
        }
      >
        {openGroup && (
          <Stack spacing={2}>
            {openGroup.description && (
              <Typography variant="body2" color="text.secondary">
                {openGroup.description}
              </Typography>
            )}
            <MemberGrid members={openGroup.members} references={references} collected={collected} onToggle={toggle} />
          </Stack>
        )}
      </StyledDialog>

      {editing && (
        <CollectionFormDialog
          gameId={gameId}
          collection={collection}
          onClose={() => setEditing(false)}
          canDelete={isAdmin}
          onDeleted={() => navigate(`/game/${gameId}/conjuntos`)}
        />
      )}
      {editingGroup && (
        <CollectionGroupFormDialog
          gameId={gameId}
          collectionExtId={collection.extId}
          group={editingGroup === "new" ? null : editingGroup}
          onClose={() => setEditingGroup(null)}
          canDelete={isAdmin}
        />
      )}
    </StyledContainer>
  );
}
