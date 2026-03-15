import { Box, Typography, Grid, Stack, CircularProgress, FormControlLabel, Switch } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { StyledContainer } from "./common/StyledContainer";
import { EntityCard } from "./entities/EntityCard";
import { PickSelector } from "./common/PickSelector";
import { MultiPickSelector } from "./common/MultiPickSelector";
import { FilterList } from "@mui/icons-material";
import { useApi } from "../hooks/useApi";
import type { Entity } from "../types/gameModels";

export function EntityPage() {
  const { gameId, category: urlCategory } = useParams<{
    gameId: string;
    category?: string;
  }>();
  const navigate = useNavigate();
  
  const { loading: loadingApi, error: errorApi, getEntityList } = useApi(gameId);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);
  const [excludedSubCategories, setExcludedSubCategories] = useState<string[]>([]);
  const [showPrices, setShowPrices] = useState(false);

  const entities = useMemo(() => {
    const results = getEntityList();
    return Array.isArray(results) ? results : results.data;
  }, [getEntityList]);

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

  // Update available sub-categories when primary category changes
  useEffect(() => {
    const cats = new Set<string>();
    const currentPrimary = urlCategory === "all" ? null : urlCategory;
    
    entities.forEach((entity: Entity) => {
      const catsArr = Array.isArray(entity.category) ? entity.category : [entity.category];
      const primary = catsArr[0];
      if (!currentPrimary || (primary && primary.toLowerCase() === currentPrimary.toLowerCase())) {
        if (catsArr.length > 1) {
          catsArr.slice(1).forEach((cat: string | undefined) => {
            if (cat) cats.add(cat);
          });
        }
      }
    });

    setAvailableSubCategories(Array.from(cats).sort());
  }, [entities, urlCategory]);

  const filteredEntities = useMemo(() => {
    const filters: any = {};
    
    if (urlCategory && urlCategory !== "all") {
      filters.category = [urlCategory];
    }

    // Add negation for excluded sub-categories
    if (excludedSubCategories.length > 0) {
      if (!filters.category) filters.category = [];
      excludedSubCategories.forEach(c => filters.category.push(`!${c}`));
    }

    const results = getEntityList({ filters });
    const list = Array.isArray(results) ? results : results.data;

    // Apply search filter client-side
    if (!searchTerm) return list;
    
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter((entity: Entity) => 
      entity.name.toLowerCase().includes(lowerSearch) || 
      entity.id.toLowerCase().includes(lowerSearch)
    );
  }, [getEntityList, urlCategory, excludedSubCategories, searchTerm]);

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

  const selectedSubCategories = availableSubCategories.filter(c => !excludedSubCategories.includes(c));

  const handleSubCategoriesChange = (selected: string[]) => {
    const nowExcluded = availableSubCategories.filter(c => !selected.includes(c));
    const otherExclusions = excludedSubCategories.filter(c => !availableSubCategories.includes(c));
    setExcludedSubCategories([...otherExclusions, ...nowExcluded]);
  };

  return (
    <StyledContainer
      title={`${urlCategory && urlCategory !== "all" ? urlCategory.charAt(0).toUpperCase() + urlCategory.slice(1) : "Entidades"} de ${gameId}`}
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
              value={urlCategory === "all" ? null : urlCategory || null}
              options={categories}
              onChange={(cat) => {
                navigate(`/game/${gameId}/entity/list/${cat || "all"}`);
              }}
              icon={<FilterList sx={{ fontSize: 18 }} />}
            />
            {availableSubCategories.length > 0 && (
              <MultiPickSelector
                label="Sub-categoria"
                selectedOptions={selectedSubCategories}
                options={availableSubCategories}
                onChange={handleSubCategoriesChange}
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
                  navigate(`/game/${gameId}/entity/view/${entity.id}`)
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
