import { Box, Typography, Grid, Stack, CircularProgress } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useGameData } from "../hooks/useGameData";
import { useState, useMemo } from "react";
import { StyledContainer } from "./common/StyledContainer";
import { EntityCard } from "./entities/EntityCard";
import { PickSelector } from "./common/PickSelector";
import { FilterList } from "@mui/icons-material";
import { FormControlLabel, Switch } from "@mui/material";

export interface GameEntity {
  id: string;
  name: string;
  category: string | string[];
  icon?: string;
  buyPrice?: number;
  sellPrice?: number;
}

export function EntityPage() {
  const { gameId, category: urlCategory } = useParams<{
    gameId: string;
    category?: string;
  }>();
  const navigate = useNavigate();
  const {
    data: entities,
    loading,
    error,
  } = useGameData<GameEntity[]>(gameId, "entity");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPrices, setShowPrices] = useState(false);

  const categories = useMemo(() => {
    if (!entities) return [];
    const cats = new Set<string>();
    entities.forEach((entity) => {
      const catsArr = Array.isArray(entity.category)
        ? entity.category
        : [entity.category];
      catsArr.forEach((cat) => {
        if (cat) cats.add(cat);
      });
    });
    return Array.from(cats).sort();
  }, [entities]);

  const filteredEntities = useMemo(() => {
    if (!entities) return [];
    return entities.filter((entity) => {
      const matchesSearch =
        entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.id.toLowerCase().includes(searchTerm.toLowerCase());

      const effectiveCategory = urlCategory || selectedCategory;
      const entityCats = Array.isArray(entity.category)
        ? entity.category
        : [entity.category];
      const matchesCategory =
        !effectiveCategory ||
        effectiveCategory === "all" ||
        entityCats.includes(effectiveCategory);
      return matchesSearch && matchesCategory;
    });
  }, [entities, searchTerm, urlCategory, selectedCategory]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          width: "100%",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          Erro ao carregar entidades: {error}
        </Typography>
      </Box>
    );
  }

  // Só mostra Chips se não houver categoria na URL
  const showChips = !urlCategory;

  return (
    <StyledContainer
      title={`${urlCategory ? urlCategory.charAt(0).toUpperCase() + urlCategory.slice(1) : "Entidades"} de ${gameId}`}
      label="Explore e descubra todas as entidades do jogo."
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar entidades..." }}
      actionsStart={
        <Stack
          direction={"row"}
          alignItems={"center"}
          spacing={1}
          justifyContent={"space-between"}
          flex={1}
        >
          <Stack direction={"row"} alignItems={"center"} spacing={1}>
            {showChips && (
              <PickSelector
                label="Categoria"
                value={selectedCategory}
                options={categories}
                onChange={setSelectedCategory}
                icon={<FilterList sx={{ fontSize: 18 }} />}
              />
            )}
          </Stack>
          <Stack direction={"row"} alignItems={"center"} spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={showPrices}
                  onChange={(e) => setShowPrices(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontWeight: 600 }}
                >
                  Mostrar Preços
                </Typography>
              }
              sx={{ ml: 1 }}
            />
          </Stack>
        </Stack>
      }
    >
      {/* Entities Grid */}
      {filteredEntities.length > 0 ? (
        <Grid container spacing={3} sx={{ pb: 4 }}>
          {filteredEntities.map((entity) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={entity.id}>
              <EntityCard
                entity={entity}
                showPrices={showPrices}
                onClick={() =>
                  navigate(`/game/${gameId}/map?entity=${entity.id}`)
                }
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Stack
          sx={{
            flex: 1,
            textAlign: "center",
            py: 8,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h6" sx={{ color: "rgba(255, 255, 255, 0.3)" }}>
            Nenhuma entidade encontrada neste filtro.
          </Typography>
        </Stack>
      )}
    </StyledContainer>
  );
}
