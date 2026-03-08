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
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: 'white' }}>
              Itens de {gameId}
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
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
                    <Search sx={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  </InputAdornment>
                ),
                sx: {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&.Mui-focused fieldset': { borderColor: '#ff4400' },
                  color: 'white',
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
              backgroundColor: !selectedCategory ? '#ff4400' : 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontWeight: 600,
              '&:hover': { backgroundColor: !selectedCategory ? '#ff4400' : 'rgba(255, 255, 255, 0.1)' }
            }}
          />
          {categories.map(cat => (
            <Chip
              key={cat}
              label={cat}
              onClick={() => setSelectedCategory(cat)}
              sx={{
                backgroundColor: selectedCategory === cat ? '#ff4400' : 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontWeight: 600,
                textTransform: 'capitalize',
                '&:hover': { backgroundColor: selectedCategory === cat ? '#ff4400' : 'rgba(255, 255, 255, 0.1)' }
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
                  backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.4)'
                  }
                }}>
                  <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: '12px', 
                      backgroundColor: 'rgba(0,0,0,0.3)',
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
                      <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        {item.category}
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2 }}>
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
                            backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                            color: 'rgba(255, 255, 255, 0.4)', 
                            fontSize: '0.65rem',
                            fontFamily: 'monospace'
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
