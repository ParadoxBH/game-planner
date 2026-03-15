import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardActionArea,
  Chip, 
  Stack,
  CircularProgress,
  Tooltip,
  FormControlLabel, 
  Switch 
} from "@mui/material";
import { 
  Inventory,
  Sell,
  ShoppingCart,
  SwapHoriz
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useState, useMemo, useEffect } from "react";
import { StyledContainer } from "./common/StyledContainer";
import { ItemChip } from "./common/ItemChip";
import { PickSelector } from "./common/PickSelector";
import { MultiPickSelector } from "./common/MultiPickSelector";
import { ListingDataView } from "./common/ListingDataView";
import { ViewModeSelector } from "./common/ViewModeSelector";
import { useViewMode } from "../hooks/useViewMode";

export function ItemsPage() {
  const { gameId, category: urlCategory } = useParams<{ gameId: string; category?: string }>();
  const navigate = useNavigate();

  const { loading, error, getItemsList } = useApi(gameId);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);
  const [excludedSubCategories, setExcludedSubCategories] = useState<string[]>([]);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [showPrices, setShowPrices] = useState(false);
  const [viewMode, setViewMode] = useViewMode("items");

  const allItems = useMemo(() => {
    const results = getItemsList();
    return Array.isArray(results) ? results : results.data;
  }, [getItemsList]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allItems.forEach(item => {
      const itemCats = item.category;
      const catsArr = Array.isArray(itemCats) ? itemCats : (itemCats ? [itemCats] : []);
      if (catsArr[0]) cats.add(catsArr[0]);
    });
    return Array.from(cats).sort();
  }, [allItems]);

  // Update available sub-categories when primary category changes
  useEffect(() => {
    const cats = new Set<string>();
    const currentPrimary = urlCategory === "all" ? null : urlCategory;
    
    allItems.forEach(item => {
      const itemCats = item.category;
      const catsArr = Array.isArray(itemCats) ? itemCats : (itemCats ? [itemCats] : []);
      const primary = catsArr[0];
      
      if (!currentPrimary || (primary && primary.toLowerCase() === currentPrimary.toLowerCase())) {
        if (catsArr.length > 1) {
          catsArr.slice(1).forEach(c => cats.add(c));
        }
      }
    });

    setAvailableSubCategories(Array.from(cats).sort());
  }, [allItems, urlCategory]);

  const filteredItems = useMemo(() => {
    const filters: any = {};
    
    if (urlCategory && urlCategory !== "all") {
      filters.category = [urlCategory];
    }

    // Add negation for excluded sub-categories
    if (excludedSubCategories.length > 0) {
      if (!filters.category) filters.category = [];
      excludedSubCategories.forEach(c => filters.category.push(`!${c}`));
    }

    const results = getItemsList({ filters });
    let list = Array.isArray(results) ? results : results.data;

    // Apply trade status filtering client-side
    if (tradeStatus) {
      list = list.filter(item => {
        if (tradeStatus === "Compraveis") return item.buyPrice !== undefined;
        if (tradeStatus === "Vendiveis") return item.sellPrice !== undefined;
        if (tradeStatus === "Não Comercializados") return item.buyPrice === undefined && item.sellPrice === undefined;
        if (tradeStatus === "Comercializados") return item.buyPrice !== undefined || item.sellPrice !== undefined;
        return true;
      });
    }

    // Apply search filter client-side
    if (!searchTerm) return list;
    
    const lowerSearch = searchTerm.toLowerCase();
    return list.filter(item => 
      item.name.toLowerCase().includes(lowerSearch) || 
      item.id.toLowerCase().includes(lowerSearch)
    );
  }, [getItemsList, urlCategory, excludedSubCategories, tradeStatus, searchTerm]);

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

  const selectedSubCategories = availableSubCategories.filter(c => !excludedSubCategories.includes(c));

  const handleSubCategoriesChange = (selected: string[]) => {
    const nowExcluded = availableSubCategories.filter(c => !selected.includes(c));
    const otherExclusions = excludedSubCategories.filter(c => !availableSubCategories.includes(c));
    setExcludedSubCategories([...otherExclusions, ...nowExcluded]);
  };

  return (
    <StyledContainer
      title={`Itens de ${gameId}`}
      label="Explore e descubra todos os itens disponíveis."
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar itens..." }}
      actionsStart={
        <>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <PickSelector
              label="Categoria"
              value={urlCategory === "all" ? null : urlCategory || null}
              options={categories}
              onChange={(cat) => {
                navigate(`/game/${gameId}/items/list/${cat || "all"}`);
              }}
            />
            {availableSubCategories.length > 0 && (
              <MultiPickSelector
                label="Sub-categoria"
                selectedOptions={selectedSubCategories}
                options={availableSubCategories}
                onChange={handleSubCategoriesChange}
                allLabel="Todas"
              />
            )}
            <PickSelector
              label="Status"
              value={tradeStatus}
              options={["Compraveis", "Vendiveis", "Comercializados", "Não Comercializados"]}
              onChange={setTradeStatus}
              icon={<SwapHoriz sx={{ fontSize: 18 }} />}
            />
          </Stack>
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
      actionsEnd={
        <ViewModeSelector mode={viewMode} onChange={setViewMode} />
      }
    >
      <ListingDataView
        data={filteredItems}
        viewMode={viewMode}
        cardMinWidth={280}
        emptyMessage="Nenhum item encontrado com estes filtros."
        renderCard={(item: any) => (
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
            <CardActionArea 
              onClick={() => navigate(`/game/${gameId}/items/view/${item.id}`)}
              sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
            >
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
                    {(Array.isArray(item.category) ? item.category : [item.category]).filter(Boolean).map((cat: string) => (
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
            </CardActionArea>
          </Card>
        )}
        renderListItem={(item: any) => (
          <Box 
            onClick={() => navigate(`/game/${gameId}/items/view/${item.id}`)}
            sx={{ 
              p: 1.5, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              cursor: 'pointer',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 0.5, backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {item.icon ? (
                  <img src={item.icon} alt={item.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                ) : (
                  <Inventory sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.2)' }} />
                )}
              </Box>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.id}</Typography>
              </Box>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={0.5}>
                {(Array.isArray(item.category) ? item.category : [item.category]).filter(Boolean).map((cat: string) => (
                  <Chip key={cat} label={cat} size="small" sx={{ height: 20, fontSize: '0.6rem', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                ))}
              </Stack>
              
              {showPrices && (item.sellPrice !== undefined || item.buyPrice !== undefined) && (
                <Stack direction="row" spacing={1}>
                  {item.buyPrice !== undefined && (
                    <ItemChip id="ouro" amount={item.buyPrice} size="small" icon="/img/heartopia/stats/ouro.png" />
                  )}
                  {item.sellPrice !== undefined && (
                    <ItemChip id="ouro" amount={item.sellPrice} size="small" icon="/img/heartopia/stats/ouro.png" />
                  )}
                </Stack>
              )}
            </Stack>
          </Box>
        )}
        renderIconItem={(item: any) => (
          <Tooltip title={`${item.name} (${item.id})`}>
            <Box 
              onClick={() => navigate(`/game/${gameId}/items/view/${item.id}`)}
              sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1 }}
            >
              {item.icon ? (
                <img src={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Inventory sx={{ fontSize: 32, color: 'rgba(255, 255, 255, 0.2)' }} />
              )}
            </Box>
          </Tooltip>
        )}
      />
    </StyledContainer>
  );
}
