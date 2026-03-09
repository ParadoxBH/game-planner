import { 
  Box, 
  Container, 
  Typography, 
  TextField, 
  Grid, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
  InputAdornment,
  CircularProgress,
  Tooltip
} from "@mui/material";
import { 
  Search, 
  Category,
  TravelExplore as RequirementsIcon,
  Inventory as DropsIcon
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useGameData } from "../hooks/useGameData";
import { useState, useMemo } from "react";

interface EntityDrop {
  itemId: string;
  chance: number;
  quant: number;
  maxQuant?: number;
}

interface GameEntity {
  id: string;
  name: string;
  category: string;
  icon?: string;
  requirements?: {
    itemId: string;
    quant: number;
    maxQuant?: number;
  }[];
  drops?: EntityDrop[];
}

export function EntityPage() {
  const { gameId, category: urlCategory } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();
  const { data: entities, loading, error } = useGameData<GameEntity[]>(gameId, "entity");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!entities) return [];
    const cats = new Set<string>();
    entities.forEach(entity => {
      if (entity.category) {
        cats.add(entity.category);
      }
    });
    return Array.from(cats).sort();
  }, [entities]);

  const filteredEntities = useMemo(() => {
    if (!entities) return [];
    return entities.filter(entity => {
      const matchesSearch = entity.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            entity.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const effectiveCategory = urlCategory || selectedCategory;
      const matchesCategory = !effectiveCategory || effectiveCategory === 'all' || entity.category === effectiveCategory;
      return matchesSearch && matchesCategory;
    });
  }, [entities, searchTerm, urlCategory, selectedCategory]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h6">Erro ao carregar entidades: {error}</Typography>
      </Box>
    );
  }

  // Só mostra Chips se não houver categoria na URL
  const showChips = !urlCategory;

  return (
    <Container maxWidth="xl" sx={{ py: 4, flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Stack spacing={4} sx={{flex: 1, overflowY: 'hidden'}}>
        {/* Header Section */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800 }}>
              {urlCategory ? (urlCategory.charAt(0).toUpperCase() + urlCategory.slice(1)) : "Entidades"} de {gameId}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Explore e descubra todas as entidades do jogo.
            </Typography>
          </Box>
          
          <Box sx={{ width: { xs: '100%', md: '400px' } }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Pesquisar entidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                sx: {
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 1,
                  '& fieldset': { borderColor: 'divider' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                }
              }}
            />
          </Box>
        </Stack>

        {/* Categories Section (Chips) - Only visible if no category in URL */}
        {showChips && (
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: '4px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' } }}>
            <Chip
              label="Todos"
              onClick={() => setSelectedCategory(null)}
              sx={{
                backgroundColor: !selectedCategory ? 'primary.main' : 'rgba(255, 255, 255, 0.03)',
                color: 'text.primary',
                borderRadius: 1,
                '&:hover': { backgroundColor: !selectedCategory ? 'primary.main' : 'rgba(255, 255, 255, 0.08)' }
              }}
            />
            {categories.map(cat => (
              <Chip
                key={cat}
                label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                onClick={() => setSelectedCategory(cat)}
                sx={{
                  backgroundColor: selectedCategory === cat ? 'primary.main' : 'rgba(255, 255, 255, 0.03)',
                  color: 'text.primary',
                  borderRadius: 1,
                  '&:hover': { backgroundColor: selectedCategory === cat ? 'primary.main' : 'rgba(255, 255, 255, 0.08)' }
                }}
              />
            ))}
          </Stack>
        )}

        <Stack sx={{ overflowY: 'auto', flex: 1, pr: 1 }}>
        {/* Entities Grid */}
        {filteredEntities.length > 0 ? (
          <Grid container spacing={3} sx={{ pb: 4 }}>
            {filteredEntities.map(entity => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={entity.id}>
                <Card sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                  backdropFilter: 'blur(16px)',
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                  }
                }}
                onClick={() => navigate(`/game/${gameId}/map?entity=${entity.id}`)}
                >
                  <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: 1.5, 
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      border: 1,
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {entity.icon ? (
                        <img src={entity.icon} alt={entity.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      ) : (
                        <Category sx={{ fontSize: 32, color: 'rgba(255, 255, 255, 0.2)' }} />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: 'primary.main', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {entity.category}
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2 }}>
                        {entity.name}
                      </Typography>
                    </Box>
                  </Box>
                  <CardContent sx={{ pt: 0, flexGrow: 1 }}>
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      {entity.requirements && entity.requirements.length > 0 && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <RequirementsIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {entity.requirements.length} Requisitos
                          </Typography>
                        </Stack>
                      )}
                      {entity.drops && entity.drops.length > 0 && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <DropsIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {entity.drops.length} Drops
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                    
                    <Box sx={{ mt: 'auto' }}>
                      <Tooltip title="ID da Entidade">
                        <Chip 
                          size="small" 
                          label={entity.id} 
                          sx={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                            color: 'text.disabled', 
                            fontSize: '0.6rem',
                            fontFamily: 'monospace',
                            borderRadius: 0.5,
                            height: 20
                          }} 
                        />
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Stack sx={{ flex: 1,textAlign: 'center', py: 8, alignItems: "center", justifyContent: "center" }}>
            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
              Nenhuma entidade encontrada neste filtro.
            </Typography>
          </Stack>
        )}
      </Stack>
      </Stack>
    </Container>
  );
}
