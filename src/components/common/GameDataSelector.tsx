import { useState, useMemo, useEffect } from "react";
import {
  Typography,
  Grid,
  TextField,
  Box,
  Button,
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";
import { useApi } from "../../hooks/useApi";
import { ItemChip } from "./ItemChip";
import { StyledDialog } from "./StyledDialog";

interface Selection {
  id: string;
  type: string;
}

interface GameDataSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selection: Selection) => void;
  gameId: string;
  initialSelectionId?: string;
  initialSelectionType?: string;
  activeCategory?: string;
  allowedTypes?: string[]; // future use
}

export function GameDataSelector({
  open,
  onClose,
  onConfirm,
  gameId,
  initialSelectionId,
  initialSelectionType = "item",
  activeCategory,
}: GameDataSelectorProps) {
  const { raw, loading } = useApi(gameId);

  const [dialogTab, setDialogTab] = useState(0); // 0: Item, 1: Entidade
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingSelection, setPendingSelection] = useState<Selection | null>(null);

  // Reset state when opening or when category changes
  useEffect(() => {
    if (open) {
      setSearchTerm("");
      if (initialSelectionId) {
        setPendingSelection({ id: initialSelectionId, type: initialSelectionType });
        setDialogTab(initialSelectionType === "item" ? 0 : 1);
      } else {
        setPendingSelection(null);
        setDialogTab(0);
      }
    }
  }, [open, initialSelectionId, initialSelectionType]);

  const filteredData = useMemo(() => {
    if (!raw) return [];

    if (activeCategory) {
      // Find all items and entities that belong to this category
      const catItems = raw.items?.filter((item: any) => {
        const cats = Array.isArray(item.category) ? item.category : [item.category];
        return cats.includes(activeCategory);
      }).map((i: any) => ({ ...i, type: "item" })) || [];

      const catEntities = raw.entities?.filter((ent: any) => {
        const cats = Array.isArray(ent.category) ? ent.category : [ent.category];
        return cats.includes(activeCategory);
      }).map((e: any) => ({ ...e, type: "entity" })) || [];

      return [...catItems, ...catEntities].filter((i) =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (dialogTab === 0) {
      return (raw.items || [])
        .filter((i: any) =>
          i.name.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        .map((i: any) => ({ ...i, type: "item" }));
    } else {
      return (raw.entities || [])
        .filter((e: any) =>
          e.name.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        .map((e: any) => ({ ...e, type: "entity" }));
    }
  }, [dialogTab, raw, searchTerm, activeCategory]);

  const handleConfirm = () => {
    if (pendingSelection) {
      onConfirm(pendingSelection);
      onClose();
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={activeCategory ? `Selecionar Item para ${activeCategory.toUpperCase()}` : "Selecionar Item/Entidade"}
      maxWidth="md"
      actions={
        <>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={!pendingSelection}
          >
            Confirmar
          </Button>
        </>
      }
    >
      <Box sx={{ minHeight: 400, display: "flex", flexDirection: "column" }}>
        {loading ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            {!activeCategory && (
              <Tabs
                value={dialogTab}
                onChange={(_, val) => {
                  setDialogTab(val);
                  setPendingSelection(null);
                }}
                sx={{ mb: 2 }}
                variant="fullWidth"
              >
                <Tab label="Item" />
                <Tab label="Entidade" />
              </Tabs>
            )}

            <TextField
              fullWidth
              autoFocus
              placeholder={
                activeCategory
                  ? `Filtrar ${activeCategory}...`
                  : `Pesquisar ${dialogTab === 0 ? "Item" : "Entidade"}...`
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 2 }}
              variant="outlined"
              size="small"
            />

            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                maxHeight: 400,
                pr: 1,
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: "4px",
                },
              }}
            >
              <Grid container spacing={1}>
                {filteredData.map((choice) => {
                  const isSelected = pendingSelection?.id === choice.id;
                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={choice.id}>
                      <Box
                        onClick={() =>
                          setPendingSelection({
                            id: choice.id,
                            type: choice.type,
                          })
                        }
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          gap: 1,
                          transition: "all 0.2s",
                          backgroundColor: isSelected
                            ? "rgba(255, 68, 0, 0.1)"
                            : "rgba(255, 255, 255, 0.03)",
                          border: "1px solid",
                          borderColor: isSelected
                            ? "primary.main"
                            : "transparent",
                          "&:hover": {
                            backgroundColor: isSelected
                              ? "rgba(255, 68, 0, 0.15)"
                              : "rgba(255, 255, 255, 0.07)",
                            borderColor: isSelected
                              ? "primary.main"
                              : "rgba(255, 255, 255, 0.1)",
                          },
                        }}
                      >
                        <ItemChip
                          id={choice.id}
                          icon={choice.icon}
                          amount={0}
                          size="medium"
                          type={choice.type}
                          disableLink
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? "primary.main" : "text.primary",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            height: "32px",
                            lineHeight: "16px",
                          }}
                        >
                          {choice.name}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </>
        )}
      </Box>
    </StyledDialog>
  );
}
