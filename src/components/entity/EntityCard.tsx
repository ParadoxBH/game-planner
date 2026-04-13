import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
  Tooltip
} from "@mui/material";
import { 
  Category as CategoryIcon,
  TravelExplore as RequirementsIcon,
  Inventory as DropsIcon,
  ShoppingCart,
  Sell,
  Storefront
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { ItemChip } from "../common/ItemChip";
import { getPublicUrl } from "../../utils/pathUtils";
import type { Entity } from "../../types/gameModels";

interface EntityCardProps {
  entity: Entity;
  showPrices?: boolean;
  hasShop?: boolean;
  onClick: () => void;
  variant?: "default" | "compact";
}

export function EntityCard({ entity, showPrices, hasShop, onClick, variant = "default" }: EntityCardProps) {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();

  return (
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
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-6px)',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }
    }}
    onClick={onClick}
    >
      {variant === "compact" ? (
        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 1,
              backgroundColor: "rgba(0,0,0,0.2)",
              border: 1,
              borderColor: "divider",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {entity.icon ? (
              <img
                src={getPublicUrl(entity.icon)}
                alt={entity.name}
                style={{
                  width: "80%",
                  height: "80%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <CategoryIcon sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.2)" }} />
            )}
            {hasShop && (
              <Box sx={{ 
                position: 'absolute',
                top: 4,
                right: 4,
                display: 'flex', 
                alignItems: 'center', 
                backgroundColor: 'rgba(255, 68, 0, 0.3)', 
                p: 0.5, 
                borderRadius: 1,
                zIndex: 1
              }}>
                <Storefront sx={{ fontSize: '0.8rem', color: 'white' }} />
              </Box>
            )}
            {entity.level !== undefined && entity.level > 0 && (
              <Box
                sx={{
                  position: "absolute",
                  top: 4,
                  left: 4,
                  backgroundColor: "warning.main",
                  color: "warning.contrastText",
                  borderRadius: "4px",
                  px: 0.5,
                  minWidth: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  boxShadow: 2,
                  zIndex: 1,
                }}
              >
                {entity.level}
              </Box>
            )}
          </Box>
          <Typography
            variant="subtitle2"
            sx={{
              color: "text.primary",
              fontWeight: 700,
              lineHeight: 1.2,
              height: "2.4em",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {entity.name}
          </Typography>
        </Box>
      ) : (
        <>
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
                <img src={getPublicUrl(entity.icon)} alt={entity.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
              ) : (
                <CategoryIcon sx={{ fontSize: 32, color: 'rgba(255, 255, 255, 0.2)' }} />
              )}
              {entity.level !== undefined && entity.level > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 2,
                    left: 2,
                    backgroundColor: "warning.main",
                    color: "warning.contrastText",
                    borderRadius: "4px",
                    px: 0.5,
                    minWidth: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    boxShadow: 2,
                    zIndex: 1,
                  }}
                >
                  {entity.level}
                </Box>
              )}
            </Box>
            <Box>
              <Stack direction="row" spacing={0.5} sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                {(Array.isArray(entity.category) ? entity.category : [entity.category || ""]).map(cat => (
                  <Typography key={cat} variant="subtitle2" sx={{ color: 'primary.main', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    #{cat}
                  </Typography>
                ))}
              </Stack>
              <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 1 }}>
                {entity.name}
                {hasShop && (
                  <Tooltip title="Este NPC possui uma loja">
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      backgroundColor: 'rgba(255, 68, 0, 0.15)', 
                      p: 0.5, 
                      borderRadius: 1,
                      animation: 'pulse-glow 2s infinite ease-in-out',
                      '@keyframes pulse-glow': {
                        '0%': { boxShadow: '0 0 0 0 rgba(255, 68, 0, 0.4)' },
                        '70%': { boxShadow: '0 0 0 6px rgba(255, 68, 0, 0)' },
                        '100%': { boxShadow: '0 0 0 0 rgba(255, 68, 0, 0)' }
                      }
                    }}>
                      <Storefront sx={{ fontSize: '1rem', color: 'primary.main' }} />
                    </Box>
                  </Tooltip>
                )}
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
            
            {showPrices && (entity.sellPrice !== undefined || entity.buyPrice !== undefined) && (
              <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
                {entity.buyPrice !== undefined && (
                  <Tooltip title="Preço de Compra">
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ 
                      backgroundColor: 'rgba(76, 175, 80, 0.05)', 
                      px: 0.5, 
                      borderRadius: 0.5,
                      border: '1px solid rgba(76, 175, 80, 0.1)'
                    }}>
                      <ShoppingCart sx={{ fontSize: 12, color: 'success.main' }} />
                      <ItemChip id="ouro" amount={entity.buyPrice} size="small" icon={getPublicUrl("/img/heartopia/stats/ouro.png")} />
                    </Stack>
                  </Tooltip>
                )}
                {entity.sellPrice !== undefined && (
                  <Tooltip title="Preço de Venda">
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ 
                      backgroundColor: 'rgba(255, 152, 0, 0.05)', 
                      px: 0.5, 
                      borderRadius: 0.5,
                      border: '1px solid rgba(255, 152, 0, 0.1)'
                    }}>
                      <Sell sx={{ fontSize: 12, color: 'warning.main' }} />
                      <ItemChip id="ouro" amount={entity.sellPrice} size="small" icon={getPublicUrl("/img/heartopia/stats/ouro.png")} />
                    </Stack>
                  </Tooltip>
                )}
              </Stack>
            )}

            <Box sx={{ mt: 'auto' }}>
              <Tooltip title="ID da Entidade">
                <Chip
                  size="small"
                  label={entity.id}
                  onClick={() =>
                      navigate(`/game/${gameId}/entity/view/${entity.id}`)
                    }
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
        </>
      )}
    </Card>
  );
}
