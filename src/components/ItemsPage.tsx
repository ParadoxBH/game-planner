import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
  CircularProgress,
  Tooltip
} from "@mui/material";
import { 
  Inventory,
  Sell,
  ShoppingCart,
  SwapHoriz
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useGameData } from "../hooks/useGameData";
import { useState, useMemo } from "react";
import { StyledContainer } from "./common/StyledContainer";
import { FormControlLabel, Switch } from "@mui/material";
import { ItemChip } from "./common/ItemChip";
import { PickSelector } from "./common/PickSelector";

interface GameItem {
  id: string;
  name: string;
  description: string;
  category?: string | string[];
  icon?: string;
  sellPrice?: number;
  buyPrice?: number;
}

export function ItemsPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: items, loading, error } = useGameData<GameItem[]>(gameId, "items");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [showPrices, setShowPrices] = useState(false);

  const categories = useMemo(() => {
    if (!items) return [];
    const cats = new Set<string>();
    items.forEach(item => {
      const itemCats = item.category;
      if (Array.isArray(itemCats)) {
        itemCats.forEach(c => cats.add(c));
      } else if (itemCats) {
        cats.add(itemCats);
      }
    });
    return Array.from(cats).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const itemCats = item.category;
      const categoriesList = Array.isArray(itemCats) ? itemCats : (itemCats ? [itemCats] : []);
      
      const matchesCategory = !selectedCategory || categoriesList.includes(selectedCategory);

      let matchesTradeStatus = true;
      if (tradeStatus === "Compraveis") {
        matchesTradeStatus = item.buyPrice !== undefined;
      } else if (tradeStatus === "Vendiveis") {
        matchesTradeStatus = item.sellPrice !== undefined;
      } else if (tradeStatus === "Não Comercializados") {
        matchesTradeStatus = item.buyPrice === undefined && item.sellPrice === undefined;
      } else if (tradeStatus === "Comercializados") {
        matchesTradeStatus = item.buyPrice !== undefined || item.sellPrice !== undefined;
      }

      return matchesSearch && matchesCategory && matchesTradeStatus;
    });
  }, [items, searchTerm, selectedCategory, tradeStatus]);

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
    <StyledContainer
      title={`Itens de ${gameId}`}
      label="Explore e descubra todos os itens disponíveis."
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar itens..." }}
      actionsStart={
        <>
          <PickSelector
            label="Categoria"
            value={selectedCategory}
            options={categories}
            onChange={setSelectedCategory}
          />
          <PickSelector
            label="Status"
            value={tradeStatus}
            options={["Compraveis", "Vendiveis", "Comercializados", "Não Comercializados"]}
            onChange={setTradeStatus}
            icon={<SwapHoriz sx={{ fontSize: 18 }} />}
          />
          <Box sx={{ flexGrow: 1 }} />
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
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Mostrar Preços
              </Typography>
            }
            sx={{ ml: 1 }}
          />
        </>
      }
    >
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
                    <Stack direction="row" spacing={0.5} sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                      {(Array.isArray(item.category) ? item.category : [item.category]).filter(Boolean).map(cat => (
                        <Typography key={cat} variant="subtitle2" sx={{ color: 'primary.main', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>
                          #{cat}
                        </Typography>
                      ))}
                    </Stack>
                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2 }}>
                      {item.name}
                    </Typography>
                  </Box>
                </Box>
                <CardContent sx={{ pt: 0, flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description || "Nenhuma descrição disponível para este item."}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
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

                    {showPrices && (item.sellPrice !== undefined || item.buyPrice !== undefined) && (
                      <Stack direction="row" spacing={0.5}>
                        {item.buyPrice !== undefined && (
                          <Tooltip title="Preço de Compra">
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ 
                              backgroundColor: 'rgba(76, 175, 80, 0.05)', 
                              px: 0.5, 
                              borderRadius: 0.5,
                              border: '1px solid rgba(76, 175, 80, 0.1)'
                            }}>
                              <ShoppingCart sx={{ fontSize: 12, color: 'success.main' }} />
                              <ItemChip id="ouro" amount={item.buyPrice} size="small" icon="/img/heartopia/stats/ouro.png" />
                            </Stack>
                          </Tooltip>
                        )}
                        {item.sellPrice !== undefined && (
                          <Tooltip title="Preço de Venda">
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ 
                              backgroundColor: 'rgba(255, 152, 0, 0.05)', 
                              px: 0.5, 
                              borderRadius: 0.5,
                              border: '1px solid rgba(255, 152, 0, 0.1)'
                            }}>
                              <Sell sx={{ fontSize: 12, color: 'warning.main' }} />
                              <ItemChip id="ouro" amount={item.sellPrice} size="small" icon="/img/heartopia/stats/ouro.png" />
                            </Stack>
                          </Tooltip>
                        )}
                      </Stack>
                    )}
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
    </StyledContainer>
  );
}
