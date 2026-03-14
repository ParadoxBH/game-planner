import { Box, Typography, Grid, Stack, CircularProgress } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { StyledContainer } from "./common/StyledContainer";
import { EntityCard } from "./entities/EntityCard";
import { PickSelector } from "./common/PickSelector";
import { FilterList } from "@mui/icons-material";
import { FormControlLabel, Switch } from "@mui/material";
import { useApi } from "../hooks/useApi";
import type { Entity } from "../types/gameModels";

export function EntityPage() {
  const { gameId, category: urlCategory } = useParams<{
    gameId: string;
    category?: string;
  }>();
  const navigate = useNavigate();
  
  const { loading: loadingApi, error: errorApi, getEntityList } = useApi(gameId);
  const entities = useMemo(() => getEntityList(), [getEntityList]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [showPrices, setShowPrices] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    entities.forEach((entity: Entity) => {
      const catsArr = Array.isArray(entity.category)
        ? entity.category
        : [entity.category];
      if (catsArr[0]) cats.add(catsArr[0]);
    });
    return Array.from(cats).sort();
  }, [entities]);

  const subCategories = useMemo(() => {
    const cats = new Set<string>();
    
    // Filter entities that match the current primary category
    const relevantEntities = entities.filter((entity: Entity) => {
      const catsArr = Array.isArray(entity.category) ? entity.category : [entity.category];
      const primary = catsArr[0];
      return !urlCategory || urlCategory === "all" || (primary && primary.toLowerCase() === urlCategory.toLowerCase());
    });

    relevantEntities.forEach((entity: Entity) => {
      const catsArr = Array.isArray(entity.category)
        ? entity.category
        : [entity.category];
      // Collect all categories except the primary one (index 0)
      if (catsArr.length > 1) {
        catsArr.slice(1).forEach((cat: string | undefined) => {
          if (cat) cats.add(cat);
        });
      }
    });
    return Array.from(cats).sort();
  }, [entities, urlCategory]);

  const filteredEntities = useMemo(() => {
    return entities.filter((entity: Entity) => {
      const matchesSearch =
        entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.id.toLowerCase().includes(searchTerm.toLowerCase());

      const entityCats = Array.isArray(entity.category)
        ? (entity.category as string[])
        : [entity.category as string || ""];

      const primaryCategory = entityCats[0];
      const matchesPrimary =
        !urlCategory ||
        urlCategory === "all" ||
        (primaryCategory && primaryCategory.toLowerCase() === urlCategory.toLowerCase());

      const matchesSub =
        !selectedSubCategory ||
        (entityCats.length > 1 && entityCats.slice(1).some(c => c && c.toLowerCase() === selectedSubCategory.toLowerCase()));

      return matchesSearch && matchesPrimary && matchesSub;
    });
  }, [entities, searchTerm, urlCategory, selectedSubCategory]);

  if (loadingApi) {
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

  if (errorApi) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="error" variant="h6">
          Erro ao carregar entidades
        </Typography>
      </Box>
    );
  }

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
          <Stack direction={"row"} alignItems={"center"} spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <PickSelector
              label="Categoria"
              value={urlCategory || null}
              options={categories}
              onChange={(cat) => {
                setSelectedSubCategory(null); // Reset sub-filter when primary changes
                navigate(`/game/${gameId}/entity/list/${cat || ""}`);
              }}
              icon={<FilterList sx={{ fontSize: 18 }} />}
            />
            {subCategories.length > 0 && (
              <PickSelector
                label="Sub-categoria"
                value={selectedSubCategory}
                options={subCategories}
                onChange={setSelectedSubCategory}
                allLabel="Todas"
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
