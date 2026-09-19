import { useEffect, useMemo, useState } from "react";
import { Box, Button, CircularProgress, Grid, Tab, Tabs, TextField, Typography } from "@mui/material";
import type { EntityDocument, ItemDocument, ListQuery, MediaLink, ResolvedReference } from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentList } from "../../api/useContent";
import { and, textSearch } from "../../api/query";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ContentChip } from "./ContentChip";
import { StyledDialog } from "./StyledDialog";

const PAGE = 60;

type SelectorTab = "items" | "entities";

interface Choice {
  extId: string;
  name: string | null;
  media: MediaLink[];
}

interface ApiContentSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selection: ResolvedReference) => void;
  gameId: string;
  title?: string;
}

/** Escolha de um item ou entidade cadastrado, com busca pela API. */
export function ApiContentSelector({ open, onClose, onConfirm, gameId, title = "Selecionar item ou entidade" }: ApiContentSelectorProps) {
  const [tab, setTab] = useState<SelectorTab>("items");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ResolvedReference | null>(null);
  const term = useDebouncedValue(search);

  useEffect(() => {
    if (open) {
      setSearch("");
      setSelected(null);
    }
  }, [open]);

  const query = useMemo<ListQuery>(() => ({ where: and(textSearch(term)), size: PAGE, sort: "name" }), [term]);
  const items = useContentList<ItemDocument>(gameId, "items", query, { enabled: open && tab === "items" });
  const entities = useContentList<EntityDocument>(gameId, "entities", query, { enabled: open && tab === "entities" });

  const kind = tab === "items" ? "item" : "entity";
  const loading = tab === "items" ? items.isPending : entities.isPending;
  const total = (tab === "items" ? items.data?.total : entities.data?.total) ?? 0;
  const choices: Choice[] = (tab === "items" ? items.data?.content : entities.data?.content) ?? [];

  const toReference = (choice: Choice): ResolvedReference => ({
    kind,
    extId: choice.extId,
    resolvedKind: kind,
    name: choice.name,
    iconMediaId: currentMedia(choice.media, "icon") ?? currentMedia(choice.media, "screenshot"),
  });

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="md"
      fullWidth
      actions={
        <>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!selected}
            onClick={() => {
              if (selected) onConfirm(selected);
            }}
          >
            Confirmar
          </Button>
        </>
      }
    >
      <Box sx={{ minHeight: 400, display: "flex", flexDirection: "column" }}>
        <Tabs
          value={tab}
          onChange={(_, value: SelectorTab) => {
            setTab(value);
            setSelected(null);
          }}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab value="items" label="Item" />
          <Tab value="entities" label="Entidade" />
        </Tabs>

        <TextField
          fullWidth
          autoFocus
          size="small"
          placeholder={tab === "items" ? "Pesquisar item..." : "Pesquisar entidade..."}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ mb: 2 }}
        />

        {loading ? (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflowY: "auto", maxHeight: 400, pr: 1 }}>
            {choices.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                Nada encontrado.
              </Typography>
            )}
            <Grid container spacing={1}>
              {choices.map((choice) => {
                const reference = toReference(choice);
                const isSelected = selected?.extId === choice.extId;
                return (
                  <Grid size={{ xs: 6, sm: 4, md: 3 }} key={choice.extId}>
                    <Box
                      onClick={() => setSelected(reference)}
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        gap: 1,
                        border: 1,
                        borderColor: isSelected ? "primary.main" : "transparent",
                        backgroundColor: isSelected ? "action.selected" : "action.hover",
                      }}
                    >
                      <ContentChip target={{ kind, extId: choice.extId }} resolved={reference} size="medium" disableLink />
                      <Typography variant="caption" sx={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? "primary.main" : "text.primary" }}>
                        {choice.name ?? choice.extId}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
            {total > choices.length && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
                Mostrando {choices.length} de {total}. Refine a busca para encontrar os demais.
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </StyledDialog>
  );
}
