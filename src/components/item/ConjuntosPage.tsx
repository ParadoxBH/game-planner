import {
  Box,
  Typography,
  Card,
  CardActionArea,
  Grid,
  Stack,
  Divider,
} from "@mui/material";
import { 
  AutoAwesomeMosaic,
  Layers, 
  ArrowBack,
} from "@mui/icons-material";
import { ItemCard } from "./ItemCard";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { useState, useMemo } from "react";
import { StyledContainer } from "../common/StyledContainer";
import type { Conjunto, Item } from "../../types/gameModels";

export function ConjuntosPage() {
  const { gameId, category: urlCategory } = useParams<{
    gameId: string;
    category?: string;
  }>();
  const navigate = useNavigate();

  const { loading, getConjuntosList, getItemsList } = useApi(gameId);
  const [searchTerm, setSearchTerm] = useState("");

  const allConjuntos = useMemo(() => {
    return getConjuntosList() as Conjunto[];
  }, [getConjuntosList]);

  const allGameItems = useMemo(() => {
    const results = getItemsList();
    return Array.isArray(results) ? results : results.data;
  }, [getItemsList]);

  const itemMap = useMemo(() => {
    const map = new Map<string, Item>();
    allGameItems.forEach(item => map.set(item.id, item));
    return map;
  }, [allGameItems]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allConjuntos.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats).sort();
  }, [allConjuntos]);

  const filteredConjuntos = useMemo(() => {
    let list = allConjuntos;
    
    if (urlCategory) {
      list = list.filter(c => c.category === urlCategory);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(lower) || 
        c.description?.toLowerCase().includes(lower)
      );
    }

    return list;
  }, [allConjuntos, urlCategory, searchTerm]);

  if (loading) return null; // Preloader handled by Layout common patterns usually

  const renderCategorySelection = () => (
    <Grid container spacing={3}>
      {categories.map((cat) => (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={cat}>
          <Card
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              backdropFilter: "blur(16px)",
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "translateY(-6px)",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                borderColor: "primary.main",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              },
            }}
          >
            <CardActionArea 
              onClick={() => navigate(`/game/${gameId}/conjuntos/${cat}`)}
              sx={{ p: 4, textAlign: "center" }}
            >
              <Layers sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {cat}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                {allConjuntos.filter(c => c.category === cat).length} conjuntos
              </Typography>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderConjuntosList = () => (
    <Stack spacing={2}>
      {filteredConjuntos.map((conjunto) => (
        <Stack key={conjunto.id} spacing={1}>
          <Stack alignItems={"start"}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary" }}>
              {conjunto.name}
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 800 }}>
              {conjunto.description}
            </Typography>
          </Stack>
          
          <Grid container spacing={1}>
            {conjunto.items.map((itemId) => {
              const item = itemMap.get(itemId);
              if (!item) return null;
              
              return (
                <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={itemId}>
                  <ItemCard item={item} gameId={gameId || ""} variant="compact" />
                </Grid>
              );
            })}
          </Grid>
          <Divider sx={{ mt: 6, borderColor: "rgba(255,255,255,0.05)" }} />
        </Stack>
      ))}
    </Stack>
  );

  return (
    <StyledContainer
      title={urlCategory ? `Conjuntos: ${urlCategory}` : "Conjuntos"}
      label={urlCategory ? `Explorando conjuntos de ${urlCategory}.` : "Explore coleções e conjuntos de itens temáticos."}
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar conjuntos..." }}
      actionsEnd={
      urlCategory ? <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <CardActionArea 
          onClick={() => navigate(`/game/${gameId}/conjuntos`)}
          sx={{ display: 'flex', alignItems: 'center', width: 'auto', p: 1, borderRadius: 1 }}
        >
          <ArrowBack sx={{ mr: 1, fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>VOLTAR PARA CATEGORIAS</Typography>
        </CardActionArea>
      </Box> : undefined}
    >
      {urlCategory ? renderConjuntosList() : renderCategorySelection()}
      
      {filteredConjuntos.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
              <AutoAwesomeMosaic sx={{ fontSize: 64, color: 'rgba(255,255,255,0.05)', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">Nenhum conjunto encontrado.</Typography>
          </Box>
      )}
    </StyledContainer>
  );
}
