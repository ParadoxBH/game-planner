import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
} from "@mui/material";
import { 
  Construction,
  KeyboardDoubleArrowRight,
  Lock,
  Bolt,
  Assignment
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { ItemChip } from "../common/ItemChip";

import type { GameDataTypes, RecipeItem, RecipeUnlock } from "../../types/gameModels";

interface RecipeCardProps {
  id: string;
  name: string;
  stations: string[];
  ingredients: RecipeItem[];
  products: RecipeItem[];
  unlock?: RecipeUnlock[];
  getSourceData: (type: GameDataTypes | undefined, id: string) => { name: string; icon?: string; type: GameDataTypes } | undefined;
  eventsMap: Map<string, string>;
}



export function RecipeCard({
  id,
  name,
  stations,
  ingredients,
  products,
  unlock,
  getSourceData,
  eventsMap
}: RecipeCardProps) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  return (
    <Card 
      onClick={() => navigate(`/game/${gameId}/recipes/view/${id}`)}
      sx={{ 
        cursor: 'pointer',
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
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
      }
    }}>
      <CardContent sx={{ p: '16px !important' }}>
        <Stack spacing={2.5}>
          {/* Header: Name and Stations */}
          <Stack alignItems="stretch" textAlign={"start"}>
            <Stack direction="row" alignItems={"center"} justifyContent="space-between">
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Receita
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                {stations.map(s => (
                  <Chip 
                    key={s} 
                    label={s} 
                    size="small" 
                    icon={<Construction sx={{ fontSize: '0.8rem !important' }} />} 
                    sx={{ backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', height: 20 }} 
                  />
                ))}
              </Stack>
            </Stack>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2 }}>
              {name}
            </Typography>
          </Stack>

          {/* Crafting Flow */}
          <Stack direction="row" spacing={3} alignItems="center" justifyContent={"space-between"} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
            {/* Ingredients */}
            <Stack direction="row" spacing={1.5} sx={{ display: 'flex', alignItems: 'center' }}>
              {ingredients.map((ing, idx) => {
                const source = getSourceData(ing.type as any, ing.id);
                return (
                  <ItemChip 
                    key={idx} 
                    id={ing.id}
                    name={source?.name}
                    icon={source?.icon}
                    amount={ing.amount} 
                    type={ing.type} 
                  />
                );
              })}
            </Stack>
            
            <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.3 }}>
              <KeyboardDoubleArrowRight sx={{ fontSize: 24 }} />
            </Box>

            {/* Products */}
            <Stack direction="row" spacing={1.5} sx={{ display: 'flex', alignItems: 'center' }}>
              {products.map((prod, idx) => {
                const source = getSourceData(prod.type, prod.id);
                return (
                  <ItemChip 
                    key={idx} 
                    id={prod.id}
                    name={source?.name}
                    icon={source?.icon}
                    amount={prod.amount} 
                    type={prod.type} 
                    isProduct 
                  />
                );
              })}
            </Stack>
          </Stack>

          {/* Unlock Requirements */}
          {unlock && unlock.length > 0 && (
            <Box sx={{ 
              p: 1.5, 
              borderRadius: 1, 
              backgroundColor: 'rgba(255, 187, 0, 0.05)', 
              border: '1px dashed rgba(255, 187, 0, 0.2)',
            }}>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {unlock.map((req, idx) => {
                  let Icon = Lock;
                  let color = "#ffbb00";
                  let label = req.type;

                  if (req.type === 'level') {
                    Icon = Bolt;
                    label = "Nível";
                  } else if (req.type === 'quest') {
                    Icon = Assignment;
                    label = "Missão";
                  } else if (req.type === 'upgrade') {
                    Icon = Construction;
                    label = "Upgrade";
                  } else if (req.type === 'event') {
                    label = "Evento";
                  }

                  const displayValue = req.type === 'event' ? (eventsMap.get(req.value) || req.value) : req.value;

                  return (
                    <Typography key={idx} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                      <Icon sx={{ fontSize: '0.9rem', color }} /> 
                      <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{label}:</Box> {displayValue}
                    </Typography>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
