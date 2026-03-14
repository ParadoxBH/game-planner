import {
  Box,
  Typography,
  Card,
  CardActionArea,
} from "@mui/material";
import { Storefront, ChevronRight } from "@mui/icons-material";

import type { Shop, Entity } from "../../types/gameModels";

interface ShopCardProps {
  shop: Shop;
  npc?: Entity;
  onClick: () => void;
}

export const ShopCard = ({ shop, npc, onClick }: ShopCardProps) => {
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
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }
    }}>
      <CardActionArea 
        onClick={onClick}
        sx={{ height: '100%', p: 3 }}
      >
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
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 2 }}>
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
      </CardActionArea>
    </Card>
  );
};
