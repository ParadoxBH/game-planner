import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel
} from "@mui/material";
import { 
  ContentCopy,
  Redeem,
  CalendarToday,
  TimerOff,
  CheckCircle,
  RadioButtonUnchecked,
  FilterList
} from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useState, useMemo, useEffect } from "react";
import { StyledContainer } from "./common/StyledContainer";
import { ItemChip } from "./common/ItemChip";
import { redemptionService } from "../services/redemptionService";
import type { Item, RedemptionCode } from "../types/gameModels";
import { codeRepository } from "../repositories/CodeRepository";
import { itemRepository } from "../repositories/ItemRepository";
import { theme } from "../theme/theme";
import { Ribbon } from "./Ribbon";
import { usePlatform } from "../hooks/usePlatform";

export function CodesPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { loading: dbLoading, error: codesError } = useApi(gameId);
  const { isMobile } = usePlatform();
  
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // States for filters
  const [hideExpired, setHideExpired] = useState(true);
  const [hideCollected, setHideCollected] = useState(false);
  
  // State for collected codes
  const [collectedCodes, setCollectedCodes] = useState<string[]>([]);

  useEffect(() => {
    if (dbLoading) return;

    let isMounted = true;
    setDataLoading(true);

    Promise.all([
      codeRepository.getAll(),
      itemRepository.getAll()
    ]).then(([allCodes, allItems]) => {
      if (!isMounted) return;
      setCodes(allCodes);
      setItems(allItems);
      setDataLoading(false);
    }).catch(err => {
      console.error("Error fetching codes data:", err);
      if (isMounted) setDataLoading(false);
    });

    return () => { isMounted = false; };
  }, [dbLoading]);

  useEffect(() => {
    if (gameId) {
      setCollectedCodes(redemptionService.getCollectedCodes(gameId));
    }
  }, [gameId]);

  const itemsMap = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach(item => map.set(item.id, item));
    return map;
  }, [items]);

  const filteredCodes = useMemo<RedemptionCode[]>(() => {
    if (!codes) return [];
    
    const now = new Date();
    
    return codes.filter(c => {
      // Search filter
      const matchesSearch = c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.rewards.some(r => {
                              const item = itemsMap.get(r.id);
                              return item?.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase());
                            });
      
      if (!matchesSearch) return false;

      // Expired filter
      const isExpired = new Date(c.expiresAt) < now;
      if (hideExpired && isExpired) return false;

      // Collected filter
      const isCollected = collectedCodes.includes(c.code);
      if (hideCollected && isCollected) return false;

      return true;
    });
  }, [codes, searchTerm, itemsMap, hideExpired, hideCollected, collectedCodes]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopySuccess(code);
  };

  const toggleCollected = (code: string) => {
    if (!gameId) return;
    
    if (collectedCodes.includes(code)) {
      redemptionService.removeCollectedCode(gameId, code);
      setCollectedCodes(prev => prev.filter(c => c !== code));
    } else {
      redemptionService.saveCollectedCode(gameId, code);
      setCollectedCodes(prev => [...prev, code]);
    }
  };

  if (dbLoading || dataLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (codesError) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" variant="h6">Erro ao carregar códigos: {codesError}</Typography>
      </Box>
    );
  }

  return (
    <StyledContainer
      title={`Códigos de Resgate - ${gameId}`}
      label="Aproveite recompensas gratuitas com os códigos abaixo."
      searchValue={searchTerm}
      onChangeSearch={setSearchTerm}
      search={{ placeholder: "Pesquisar códigos ou recompensas..." }}
      actionsStart={
          <Stack flex={1} px={1} direction={"row"} alignItems={"center"} justifyContent={"space-between"}>
            <Stack direction={"row"} alignItems={"center"} justifyContent={"start"}>
              <Switch size="small" checked={hideExpired} onChange={(e) => setHideExpired(e.target.checked)} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Ocultar Expirados</Typography>
            </Stack>
            <Stack direction={"row"} alignItems={"center"} justifyContent={"end"}>
              <Switch size="small" checked={hideCollected} onChange={(e) => setHideCollected(e.target.checked)} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Ocultar Coletados</Typography>
            </Stack>
          </Stack>
        }
    >
      {filteredCodes && filteredCodes.length > 0 ? (
        <Grid container spacing={1}>
          {filteredCodes.map((c, idx) => {
            const isExpired = new Date(c.expiresAt) < new Date();
            const isCollected = collectedCodes.includes(c.code);
            
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} spacing={1} key={idx}>
                <Card sx={{ 
                  backgroundColor: isCollected ? 'rgba(0, 255, 0, 0.01)' : 'rgba(255, 255, 255, 0.02)', 
                  backdropFilter: 'blur(16px)',
                  borderRadius: 1,
                  border: 1,
                  borderColor: isCollected ? 'rgba(0, 255, 0, 0.2)' : isExpired ? 'rgba(255, 0, 0, 0.2)' : 'divider',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    backgroundColor: isCollected ? 'rgba(0, 255, 0, 0.02)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: isCollected ? 'rgba(0, 255, 0, 0.3)' : isExpired ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                  }
                }}>
                  {isCollected ? <Ribbon backgroundColor={theme.palette.success.main} label="Coletado"/>
                  : isExpired && (
                    <Ribbon backgroundColor={theme.palette.error.main} label={"Expirado"}/>
                  )}
                  
                    <Stack spacing={1} sx={{ p: isMobile ? 1 : 3, flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h5" sx={{ 
                          fontWeight: 900, 
                          color: isExpired && !isCollected ? 'text.disabled' : (isCollected ? 'success.main' : 'primary.main'),
                          letterSpacing: 2,
                          fontFamily: 'monospace'
                        }}>
                          {c.code}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title={isCollected ? "Desmarcar como Coletado" : "Marcar como Coletado"}>
                            <IconButton 
                              onClick={() => toggleCollected(c.code)} 
                              size="small"
                              sx={{ 
                                color: isCollected ? 'success.main' : 'text.disabled',
                                backgroundColor: isCollected ? 'rgba(0, 255, 0, 0.05)' : 'rgba(255,255,255,0.05)',
                                '&:hover': { backgroundColor: isCollected ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255,255,255,0.1)' }
                              }}
                            >
                              {isCollected ? <CheckCircle fontSize="small" /> : <RadioButtonUnchecked fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copiar Código">
                            <IconButton 
                              onClick={() => handleCopy(c.code)} 
                              disabled={isExpired && !isCollected}
                              size="small"
                              sx={{ 
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                '&:hover': { backgroundColor: 'primary.main', color: 'white' }
                              }}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>

                      <Divider sx={{ opacity: 0.1 }} />

                      <Stack spacing={1}>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                          Recompensas
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
                          {c.rewards.map((r: { id: string; quantity: number }, rIdx: number) => {
                            const item = itemsMap.get(r.id);
                            return (
                              <ItemChip
                                key={rIdx}
                                id={r.id}
                                name={item?.name}
                                icon={item?.icon}
                                amount={r.quantity}
                                size="small"
                              />
                            );
                          })}
                        </Stack>
                      </Stack>

                        <Stack spacing={1}>
                          {false && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarToday sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Adicionado em: <b>{new Date(c.addedAt).toLocaleDateString()}</b>
                            </Typography>
                          </Box>}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TimerOff sx={{ fontSize: '0.9rem', color: isExpired ? 'error.main' : 'warning.main' }} />
                            <Typography variant="caption" sx={{ color: isExpired ? 'error.main' : 'text.secondary' }}>
                              Expira em: <b>{new Date(c.expiresAt).toLocaleDateString()}</b>
                            </Typography>
                          </Box>
                        </Stack>
                    </Stack>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Stack sx={{ flex: 1, textAlign: 'center', py: 8, alignItems: "center", justifyContent: "center" }}>
          <Redeem sx={{ fontSize: 64, color: 'rgba(255, 255, 255, 0.05)', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.3)' }}>
            Nenhum código encontrado.
          </Typography>
        </Stack>
      )}

      <Snackbar 
        open={!!copySuccess} 
        autoHideDuration={2000} 
        onClose={() => setCopySuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%', borderRadius: 2 }}>
          Código <b>{copySuccess}</b> copiado!
        </Alert>
      </Snackbar>
    </StyledContainer>
  );
}
