import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import {
  MAX_PAGE_SIZE,
  type CollectionDocument,
  type CollectionGroupDocument,
  type EventDocument,
  type Reference,
} from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentList, useContentWrites } from "../../api/useContent";
import { ApiContentSelector } from "../common/ApiContentSelector";
import { CodesField, type CodeOption } from "../common/CodesField";
import { ConfirmDeleteDialog } from "../common/ConfirmDeleteDialog";
import { slugOf, useContentSave } from "../common/contentForm";
import { TabLabel, TargetRow } from "../common/formLayout";
import { isLevel, levelOut, move } from "../common/formValues";
import { IconUploadField } from "../common/IconUploadField";
import { StyledDialog } from "../common/StyledDialog";

/** Dados: identificação, conjuntos e eventos; Membros: o que o grupo coleciona, na ordem de exibição. */
type GroupTab = "data" | "members";

let nextKey = 1;
const key = () => nextKey++;

/** Membro na tela: a referência com uma chave estável, porque a lista é reordenável. */
interface MemberRow {
  key: number;
  target: Reference;
}

interface GroupForm {
  extId: string;
  name: string;
  summary: string;
  description: string;
  collections: string[];
  members: MemberRow[];
  events: string[];
  /** Vazio: o grupo vai para o fim do conjunto, em ordem alfabética. */
  ordinal: string;
}

function formOf(
  group: CollectionGroupDocument | null,
  collectionExtId: string,
): GroupForm {
  if (!group) {
    return {
      extId: "",
      name: "",
      summary: "",
      description: "",
      collections: [collectionExtId],
      members: [],
      events: [],
      ordinal: "",
    };
  }
  return {
    extId: group.extId,
    name: group.name ?? "",
    summary: group.summary ?? "",
    description: group.description ?? "",
    collections: group.collections,
    members: group.members.map((target) => ({ key: key(), target })),
    events: group.events,
    ordinal: group.ordinal === null ? "" : String(group.ordinal),
  };
}

/** Mesmo alvo duas vezes no grupo: o backend recusa (members não repete). */
function sameTarget(a: Reference, b: Reference): boolean {
  return a.extId === b.extId && (a.kind ?? null) === (b.kind ?? null);
}

interface CollectionGroupFormDialogProps {
  gameId: string;
  /** O conjunto de onde o grupo foi aberto; um grupo novo já nasce nele. */
  collectionExtId: string;
  /** O grupo a editar; null, criando. Montado só enquanto aberto, então o formulário nasce dele. */
  group: CollectionGroupDocument | null;
  onClose: () => void;
  /** Mostra "Apagar grupo" (quem pode apagar: moderador ou acima). */
  canDelete?: boolean;
}

/**
 * Cria ou edita um grupo de conjunto, com os membros na ordem de exibição. A escrita substitui o
 * documento inteiro. O grupo pode nascer vazio e receber os membros depois. Um grupo pode aparecer
 * em mais de um conjunto, então "Conjuntos" é uma lista; tirar o conjunto atual dali faz o grupo
 * sumir desta tela.
 */
export function CollectionGroupFormDialog({
  gameId,
  collectionExtId,
  group,
  onClose,
  canDelete = false,
}: CollectionGroupFormDialogProps) {
  const [form, setForm] = useState<GroupForm>(() =>
    formOf(group, collectionExtId),
  );
  const [extIdTouched, setExtIdTouched] = useState(false);
  const [icon, setIcon] = useState<File | null>(null);
  /** Ícone escolhido de outro conteúdo (mediaId): ligado ao salvar, sem envio. Enviar um arquivo o descarta. */
  const [pickedIcon, setPickedIcon] = useState<string | null>(null);
  const [picking, setPicking] = useState<{ index: number | null } | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<GroupTab>("data");
  const { save, saving, error, creating } = useContentSave(
    gameId,
    "collection-groups",
    group === null,
  );
  const { remove } = useContentWrites(gameId, "collection-groups");

  const collections = useContentList<CollectionDocument>(
    gameId,
    "collections",
    { size: MAX_PAGE_SIZE, sort: "name" },
  );
  const events = useContentList<EventDocument>(gameId, "events", {
    size: MAX_PAGE_SIZE,
    sort: "name",
  });

  const collectionOptions = useMemo<CodeOption[]>(
    () =>
      (collections.data?.content ?? []).map((collection) => ({
        extId: collection.extId,
        name: collection.name ?? collection.extId,
        iconMediaId: currentMedia(collection.media, "icon"),
      })),
    [collections.data],
  );
  const eventOptions = useMemo<CodeOption[]>(
    () =>
      (events.data?.content ?? []).map((event) => ({
        extId: event.extId,
        name: event.name ?? event.extId,
        iconMediaId: currentMedia(event.media, "icon"),
      })),
    [events.data],
  );

  const set = <K extends keyof GroupForm>(field: K, value: GroupForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const changeName = (name: string) =>
    setForm((current) => ({
      ...current,
      name,
      extId: !creating || extIdTouched ? current.extId : slugOf(name),
    }));

  /** A escolha entra numa linha nova ou troca a linha aberta, recusando alvo repetido. */
  const pick = (target: Reference) => {
    const index = picking?.index ?? null;
    const repeated = form.members.some(
      (row, position) => position !== index && sameTarget(row.target, target),
    );
    if (repeated) {
      setPickError("Esse alvo já está no grupo.");
      return;
    }
    setPickError(null);
    set(
      "members",
      index === null
        ? [...form.members, { key: key(), target }]
        : form.members.map((row, position) =>
            position === index ? { ...row, target } : row,
          ),
    );
    setPicking(null);
  };

  const dataInvalid =
    form.name.trim() === "" ||
    form.extId.trim() === "" ||
    !isLevel(form.ordinal);
  const valid = !dataInvalid;

  const submit = async () => {
    if (!valid) return;
    const extId = form.extId.trim();
    const saved = await save(
      extId,
      {
        extId,
        name: form.name.trim(),
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        collections: form.collections,
        members: form.members.map((row) => row.target),
        events: form.events,
        ordinal: levelOut(form.ordinal),
      },
      [{ file: icon, mediaId: pickedIcon, usage: "icon" }],
    );
    if (saved) onClose();
  };

  const tabs = (
    <Tabs
      value={tab}
      onChange={(_, value: GroupTab) => setTab(value)}
      variant="scrollable"
      allowScrollButtonsMobile
    >
      <Tab
        value="data"
        label={<TabLabel label="Dados" invalid={dataInvalid} />}
      />
      <Tab
        value="members"
        label={
          <TabLabel
            label="Membros"
            count={form.members.length}
            invalid={false}
          />
        }
      />
    </Tabs>
  );

  return (
    <StyledDialog
      subHeader={tabs}
      open
      modal
      maxWidth="md"
      contentScroll={tab !== "members"}
      onClose={saving ? () => undefined : onClose}
      title={creating ? "Novo grupo" : `Editar ${form.name || form.extId}`}
      actions={
        <>
          {!creating && canDelete && (
            <Button
              color="error"
              startIcon={<Delete />}
              onClick={() => setDeleting(true)}
              disabled={saving}
              sx={{ textTransform: "none", mr: "auto" }}
            >
              Apagar grupo
            </Button>
          )}
          <Button
            onClick={onClose}
            disabled={saving}
            sx={{ textTransform: "none" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={!valid || saving}
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : undefined
            }
            sx={{ textTransform: "none" }}
          >
            {creating ? "Criar" : "Salvar"}
          </Button>
        </>
      }
    >
      <Stack
        spacing={2}
        sx={tab === "members" ? { flex: 1, minHeight: 0 } : undefined}
      >
        {tab === "data" && (
          <>
            <IconUploadField
              currentMediaId={group ? currentMedia(group.media, "icon") : null}
              kind="collection"
              file={icon}
              onChange={(file) => {
                setIcon(file);
                setPickedIcon(null);
              }}
              gameId={gameId}
              picked={pickedIcon}
              onPick={(image) => {
                setPickedIcon(image.mediaId);
                setIcon(null);
              }}
            />

            <TextField
              label="Nome"
              value={form.name}
              onChange={(event) => changeName(event.target.value)}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Código"
              value={form.extId}
              onChange={(event) => {
                setExtIdTouched(true);
                set("extId", event.target.value);
              }}
              required
              disabled={!creating}
              helperText={
                creating
                  ? "Identifica o grupo nos dados do jogo."
                  : "O código não muda depois de criado."
              }
              fullWidth
              slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
            />
            <TextField
              label="Resumo"
              value={form.summary}
              onChange={(event) => set("summary", event.target.value)}
              fullWidth
            />
            <TextField
              label="Posição"
              value={form.ordinal}
              onChange={(event) => set("ordinal", event.target.value)}
              error={!isLevel(form.ordinal)}
              helperText={
                isLevel(form.ordinal)
                  ? "Onde o grupo aparece no conjunto. Vazio: no fim, em ordem alfabética."
                  : "Inteiro zero ou mais."
              }
              fullWidth
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
            />
            <TextField
              label="Descrição"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <CodesField
              label="Conjuntos"
              options={collectionOptions}
              value={form.collections}
              onChange={(value) => set("collections", value)}
              loading={collections.isPending}
              freeSolo
              helperText="Em quais conjuntos o grupo aparece. Aceita um conjunto ainda não cadastrado."
            />
            <CodesField
              label="Eventos"
              options={eventOptions}
              value={form.events}
              onChange={(value) => set("events", value)}
              loading={events.isPending}
              helperText="Com eventos, o grupo só aparece quando algum deles está ativo."
            />
          </>
        )}

        {tab === "members" && (
          <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ width: "100%" }}>
              <Typography variant="body2" color="text.secondary">
                O que se coleciona, na ordem de exibição. O mesmo alvo não se
                repete.
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => setPicking({ index: null })}
                sx={{ textTransform: "none", whiteSpace: "nowrap" }}
              >
                Adicionar
              </Button>
            </Stack>
            {pickError && <Alert severity="warning">{pickError}</Alert>}
            {form.members.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sem membros por enquanto: dá para criar o grupo agora e
                preencher depois.
              </Typography>
            ) : (
              // Só a lista rola (o diálogo não, ver contentScroll); o título e o "Adicionar" ficam à vista.
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  flex: "1 1 auto",
                  minHeight: 0,
                  overflowY: "auto",
                }}
              >
                {form.members.map((row, index) => (
                  <TargetRow
                    key={row.key}
                    index={index}
                    gameId={gameId}
                    target={row.target}
                    onPick={() => setPicking({ index })}
                    onUp={
                      index > 0
                        ? () => set("members", move(form.members, index, -1))
                        : undefined
                    }
                    onDown={
                      index < form.members.length - 1
                        ? () => set("members", move(form.members, index, 1))
                        : undefined
                    }
                    onRemove={() =>
                      set(
                        "members",
                        form.members.filter(
                          (_, position) => position !== index,
                        ),
                      )
                    }
                  />
                ))}
              </Box>
            )}
          </>
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>

      <ApiContentSelector
        open={picking !== null}
        modal
        gameId={gameId}
        title="Selecionar membro"
        onClose={() => setPicking(null)}
        onConfirm={(selection) =>
          pick({ kind: selection.kind, extId: selection.extId })
        }
      />

      {deleting && group && (
        <ConfirmDeleteDialog
          title="Apagar grupo"
          message={
            <>
              Apagar <strong>{form.name || group.extId}</strong> (
              <code>{group.extId}</code>)? Os itens e entidades do grupo
              continuam cadastrados; some só o agrupamento. O último estado fica
              guardado como revisão.
            </>
          }
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(false)}
          onConfirm={() => remove.mutate(group.extId, { onSuccess: onClose })}
        />
      )}
    </StyledDialog>
  );
}
