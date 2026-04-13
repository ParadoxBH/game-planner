import {
  Box,
  Typography,
  Card,
  CardActionArea,
} from "@mui/material";
import { Storefront, ChevronRight } from "@mui/icons-material";

import { useNavigate, useParams } from "react-router-dom";
import type { Shop, Entity } from "../../types/gameModels";

interface ShopCardProps {
  shop: Shop;
  npc?: Entity;
  onClick: () => void;
  variant?: "compact" | "default";
}

export const ShopCard = ({ shop, npc, onClick, variant = "default" }: ShopCardProps) => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  return (
    <Card sx={{ 
      borderRadius: 2, 
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      height: '100%',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        transform: 'translateY(-6px)',
        borderColor: 'primary.main',
        boxShadow: variant === "compact" ? '0 8px 32px rgba(0,0,0,0.4)' : 'none'
      }
    }}>
      <CardActionArea 
        onClick={onClick}
        sx={{ height: '100%', p: 2 }}
      >
        {variant === "compact" ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5 }}>
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              backgroundColor: 'rgba(0,0,0,0.2)',
              border: '2px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {npc?.icon ? (
                <img src={npc.icon} alt={npc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Storefront sx={{ fontSize: 40, color: 'text.disabled' }} />
              )}
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2, height: '2.4em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {shop.name || npc?.name || shop.id}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <Box sx={{ 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              mb: 2,
              backgroundColor: 'rgba(0,0,0,0.2)',
              border: '2px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {npc?.icon ? (
                <img src={npc.icon} alt={npc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Storefront sx={{ fontSize: 50, color: 'text.disabled' }} />
              )}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              {shop.name || npc?.name || shop.id}
            </Typography>
            <Typography 
              variant="body2" 
              onClick={(e) => {
                e.stopPropagation();
                if (npc?.id) navigate(`/game/${gameId}/entity/view/${npc.id}`);
              }}
              sx={{ 
                color: 'text.secondary', 
                fontWeight: 600, 
                mb: 2,
                '&:hover': { color: 'primary.main', cursor: 'pointer' }
              }}
            >
              NPC: {npc?.name || "Desconhecido"}
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: 1
            }}>
              Ver Loja <ChevronRight sx={{ fontSize: 16 }} />
            </Box>
          </Box>
        )}
      </CardActionArea>
    </Card>
  );
};
