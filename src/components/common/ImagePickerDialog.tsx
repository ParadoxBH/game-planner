import { useState } from "react";
import { Box, Button, CircularProgress, InputAdornment, Stack, Tab, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import { Search } from "@mui/icons-material";
import type { ContentResource, MediaLink } from "../../api/content";
import { and, rule, textSearch } from "../../api/query";
import { currentMedia } from "../../api/references";
import { useContentList } from "../../api/useContent";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ContentIcon } from "./ContentIcon";
import { StyledDialog } from "./StyledDialog";

/** O que o seletor lê de cada conteúdo. */
interface WithImage {
  extId: string;
  name: string | null;
  media: MediaLink[];
}

/** Tipos de conteúdo que costumam ter ícone, na ordem das abas; `kind` é o símbolo quando a imagem não carrega. */
const SOURCES: { resource: ContentResource; kind: string; label: string }[] = [
  { resource: "items", kind: "item", label: "Itens" },
  { resource: "entities", kind: "entity", label: "Entidades" },
  { resource: "categories", kind: "category", label: "Categorias" },
  { resource: "events", kind: "event", label: "Eventos" },
  { resource: "collections", kind: "collection", label: "Conjuntos" },
  { resource: "collection-groups", kind: "collection", label: "Grupos" },
  { resource: "shops", kind: "shop", label: "Lojas" },
  { resource: "locations", kind: "location", label: "Locais" },
];

const PAGE_SIZE = 60;

/** A imagem escolhida e de onde ela veio. */
export interface PickedImage {
  mediaId: string;
  resource: ContentResource;
  extId: string;
  name: string | null;
}

interface ImagePickerDialogProps {
  gameId: string;
  onClose: () => void;
  onPick: (image: PickedImage) => void;
  /** Aba em que abre; padrão, itens. */
  initialResource?: ContentResource;
}

/**
 * Escolhe uma imagem que já existe no jogo, pelo conteúdo que a usa: abas por tipo (itens, entidades, categorias...),
 * busca pelo nome e páginas. Só aparece o que tem ícone. A imagem não é copiada: o formulário liga o mesmo mediaId ao
 * próprio conteúdo ao salvar. Montado só enquanto aberto, então sempre abre sem seleção.
 */
export function ImagePickerDialog({ gameId, onClose, onPick, initialResource = "items" }: ImagePickerDialogProps) {
  const [resource, setResource] = useState<ContentResource>(initialResource);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<PickedImage | null>(null);
  const term = useDebouncedValue(search);
  const source = SOURCES.find((candidate) => candidate.resource === resource) ?? SOURCES[0];

  const list = useContentList<WithImage>(gameId, resource, {
    where: and(rule("hasIcon", "equal", true), textSearch(term)),
    page,
    size: PAGE_SIZE,
    sort: "name",
  });
  const contents = list.data?.content ?? [];
  const totalPages = list.data?.totalPages ?? 0;

  const choose = (content: WithImage) => {
    const mediaId = currentMedia(content.media, "icon");
    return mediaId ? { mediaId, resource, extId: content.extId, name: content.name } : null;
  };

  return (
    <StyledDialog
      open
      modal
      maxWidth="md"
      contentScroll={false}
      onClose={onClose}
      title="Selecionar imagem"
      subHeader={
        <Stack spacing={1} sx={{ pt: 1, pb: 1.5 }}>
          <Tabs
            value={resource}
            onChange={(_, value: ContentResource) => {
              setResource(value);
              setPage(0);
            }}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            {SOURCES.map((candidate) => (
              <Tab key={candidate.resource} value={candidate.resource} label={candidate.label} />
            ))}
          </Tabs>
          <TextField
            size="small"
            placeholder={`Pesquisar ${source.label.toLowerCase()}...`}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
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
        </Stack>
      }
      actions={
        <>
          {selected && (
            <Typography variant="caption" color="text.secondary" sx={{ mr: "auto" }} noWrap>
              Imagem de: {selected.name ?? selected.extId}
            </Typography>
          )}
          <Button onClick={onClose} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button variant="contained" disabled={!selected} onClick={() => selected && onPick(selected)} sx={{ textTransform: "none" }}>
            Usar esta imagem
          </Button>
        </>
      }
    >
      <Box sx={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", pr: 0.5 }}>
        {list.isPending ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : contents.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
            {term.trim() ? "Nada encontrado com imagem." : `Nenhum(a) ${source.label.toLowerCase()} com imagem.`}
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 1 }}>
            {contents.map((content) => {
              const image = choose(content);
              if (!image) return null;
              const active = selected?.mediaId === image.mediaId && selected.extId === image.extId;
              return (
                <Tooltip key={content.extId} title={`${content.name ?? content.extId} (${content.extId})`}>
                  <Stack
                    alignItems="center"
                    spacing={0.75}
                    onClick={() => setSelected(image)}
                    onDoubleClick={() => onPick(image)}
                    sx={{
                      p: 1,
                      cursor: "pointer",
                      border: 1,
                      borderColor: active ? "primary.main" : "divider",
                      bgcolor: (theme) => (active ? `${theme.palette.primary.main}22` : "transparent"),
                      transition: "all 0.15s",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    <ContentIcon mediaId={image.mediaId} kind={source.kind} alt={content.name ?? content.extId} size={48} />
                    <Typography variant="caption" sx={{ textAlign: "center", lineHeight: 1.2, width: "100%" }} noWrap>
                      {content.name ?? content.extId}
                    </Typography>
                  </Stack>
                </Tooltip>
              );
            })}
          </Box>
        )}
      </Box>
      {totalPages > 1 && (
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ pt: 1.5, flexShrink: 0 }}>
          <Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)} sx={{ textTransform: "none" }}>
            Anterior
          </Button>
          <Typography variant="caption" color="text.secondary">
            {page + 1} de {totalPages}
          </Typography>
          <Button size="small" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} sx={{ textTransform: "none" }}>
            Próxima
          </Button>
        </Stack>
      )}
    </StyledDialog>
  );
}
