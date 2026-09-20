import { useEffect, useMemo, useState } from "react";
import { Box, Button, CircularProgress, Grid, Tab, Tabs, TextField, Typography } from "@mui/material";
import type { ListQuery, MediaLink, ResolvedReference } from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentList, useRarities } from "../../api/useContent";
import { and, textSearch } from "../../api/query";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ContentChip } from "./ContentChip";
import { StyledDialog } from "./StyledDialog";

const PAGE = 60;

/** Tipos que o seletor sabe listar, cada um numa aba. */
export type SelectorKind = "items" | "entities" | "categories";

const TABS: Record<SelectorKind, { kind: string; label: string; placeholder: string }> = {
  items: { kind: "item", label: "Item", placeholder: "Pesquisar item..." },
  entities: { kind: "entity", label: "Entidade", placeholder: "Pesquisar entidade..." },
  categories: { kind: "category", label: "Categoria", placeholder: "Pesquisar categoria..." },
};

interface Choice {
  extId: string;
  name: string | null;
  media: MediaLink[];
  /** Item e entidade têm raridade; categoria, não. */
  rarityCode?: string | null;
}

interface ApiContentSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selection: ResolvedReference) => void;
  gameId: string;
  title?: string;
  /** Só fecha por Cancelar ou pelo X (ver StyledDialog). */
  modal?: boolean;
  /** As abas, na ordem. Padrão: item e entidade. */
  kinds?: SelectorKind[];
}

const DEFAULT_KINDS: SelectorKind[] = ["items", "entities"];

/** Escolha de um conteúdo cadastrado (item, entidade ou categoria), com busca pela API. */
export function ApiContentSelector({
  open,
  onClose,
  onConfirm,
  gameId,
  title = "Selecionar item ou entidade",
  modal = false,
  kinds = DEFAULT_KINDS,
}: ApiContentSelectorProps) {
  const [tab, setTab] = useState<SelectorKind>(kinds[0]);
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
  const list = useContentList<Choice>(gameId, tab, query, { enabled: open });
  // A cor da raridade contorna o ícone, como nas listagens de item e entidade.
  const rarities = useRarities(gameId);
  const rarityColors = useMemo(
    () => new Map((rarities.data ?? []).map((rarity) => [rarity.code, rarity.color])),
    [rarities.data],
  );

  const kind = TABS[tab].kind;
  const loading = list.isPending;
  const total = list.data?.total ?? 0;
  const choices: Choice[] = list.data?.content ?? [];

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
      modal={modal}
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
        {kinds.length > 1 && (
          <Tabs
            value={tab}
            onChange={(_, value: SelectorKind) => {
              setTab(value);
              setSelected(null);
            }}
            variant="fullWidth"
            sx={{ mb: 2 }}
          >
            {kinds.map((option) => (
              <Tab key={option} value={option} label={TABS[option].label} />
            ))}
          </Tabs>
        )}

        <TextField
          fullWidth
          autoFocus
          size="small"
          placeholder={TABS[tab].placeholder}
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
                      <ContentChip
                        target={{ kind, extId: choice.extId }}
                        resolved={reference}
                        rarityColor={choice.rarityCode ? rarityColors.get(choice.rarityCode) : undefined}
                        size="medium"
                        disableLink
                      />
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
