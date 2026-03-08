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
  Inventory
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useGameData } from "../hooks/useGameData";
import { useState, useMemo } from "react";

interface GameItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
}

export function ItemsPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: items, loading, error } = useGameData<GameItem[]>(gameId, "items");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!items) return [];
    const cats = new Set(items.map(item => item.category));
    return Array.from(cats).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, selectedCategory]);

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
        <Typography color="error" variant="h6">Erro ao carregar itens: {error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4, flex: 1, overflowY: 'hidden' }}>
      <Stack spacing={4} sx={{flex: 1, height: "100%", overflowY: 'hidden'}}>
        {/* Header Section */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ color: 'text.primary' }}>
              Itens de {gameId}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Explore e descubra todos os itens disponíveis.
            </Typography>
          </Box>
          
          <Box sx={{ width: { xs: '100%', md: '400px' } }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Pesquisar itens..."
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

        {/* Categories Section */}
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
              label={cat}
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
        <Stack sx={{ overflowY: 'auto', flex: 1 }}>
        {/* Items Grid */}
        {filteredItems.length > 0 ? (
          <Grid container spacing={3}>
            {filteredItems.map(item => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.id}>
                <Card sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                  backdropFilter: 'blur(16px)',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                  }
                }}>
                  <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: 1, 
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      border: 1,
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {item.icon ? (
                        <img src={item.icon} alt={item.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                      ) : (
                        <Inventory sx={{ fontSize: 32, color: 'rgba(255, 255, 255, 0.2)' }} />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                        {item.category}
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2 }}>
                        {item.name}
                      </Typography>
                    </Box>
                  </Box>
                  <CardContent sx={{ pt: 0, flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description || "Nenhuma descrição disponível para este item."}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="ID do Item">
                        <Chip 
                          size="small" 
                          label={item.id} 
                          sx={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                            color: 'text.disabled', 
                            fontSize: '0.6rem',
                            fontFamily: 'monospace',
                            borderRadius: 0.5
                          }} 
                        />
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Stack sx={{ flex: 1,textAlign: 'center', py: 8, alignItems: "center", justifyContent: "center" }}>
            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
              Nenhum item encontrado com estes filtros.
            </Typography>
          </Stack>
        )}
      </Stack>
      </Stack>
    </Container>
  );
}
