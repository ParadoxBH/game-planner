import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
  Divider,
  Paper,
  Tooltip
} from "@mui/material";
import { 
  Construction,
  Inventory,
  KeyboardDoubleArrowRight,
  Lock,
  Bolt,
  Assignment,
  Category
} from "@mui/icons-material";

export interface RecipeIngredient {
  type?: 'item' | 'entity' | 'category';
  id: string;
  name?: string;
  amount: number;
}

export interface RecipeProduct {
  type?: 'item' | 'entity';
  id: string;
  name?: string;
  amount: number;
}

export interface RecipeUnlock {
  type: string;
  subject?: string;
  value: string;
}

interface RecipeCardProps {
  name: string;
  stations: string[];
  ingredients: RecipeIngredient[];
  products: RecipeProduct[];
  unlock?: RecipeUnlock[];
  getSourceData: (type: 'item' | 'entity' | undefined, id: string) => { name: string; icon?: string; type: 'item' | 'entity' } | undefined;
  eventsMap: Map<string, string>;
}

function RecipeItem({ 
  source, 
  amount, 
  type, 
  id,
  isProduct 
}: { 
  source?: { name: string; icon?: string; type: 'item' | 'entity' };
  amount: number;
  type?: 'item' | 'entity' | 'category';
  id: string;
  isProduct?: boolean;
}) {
  const name = type === 'category' ? `Qualquer ${id}` : (source?.name || id);
  const icon = type === 'category' ? <Category sx={{ fontSize: 28, color: 'warning.main' }} /> : 
               source?.icon ? <img src={source.icon} alt={id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> :
               type === 'entity' ? <Bolt sx={{ fontSize: 28, color: 'secondary.main' }} /> : 
               <Inventory sx={{ fontSize: 28, color: isProduct ? 'primary.main' : 'text.disabled' }} />;

  return (
    <Tooltip title={name} arrow>
      <Box sx={{ position: 'relative', width: 56, height: 56 }}>
        <Paper variant="outlined" sx={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          p: 0.75,
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderColor: type === 'category' ? 'warning.dark' : 
                       type === 'entity' ? 'secondary.dark' : 
                       isProduct ? 'primary.dark' : 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.05)',
            borderColor: 'primary.main'
          }
        }}>
          {icon}
        </Paper>
        <Box sx={{ 
          position: 'absolute', 
          bottom: -6, 
          right: -6, 
          backgroundColor: isProduct ? 'primary.main' : 'background.paper',
          color: isProduct ? 'primary.contrastText' : 'text.primary',
          borderRadius: '10px',
          px: 1,
          minWidth: 22,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid',
          borderColor: '#121212', // Match background
          boxShadow: 4,
          zIndex: 1
        }}>
          <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>
            {amount}
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );
}

export function RecipeCard({
  name,
  stations,
  ingredients,
  products,
  unlock,
  getSourceData,
  eventsMap
}: RecipeCardProps) {
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
              {ingredients.map((ing, idx) => (
                <RecipeItem 
                  key={idx} 
                  source={getSourceData(ing.type as any, ing.id)} 
                  amount={ing.amount} 
                  type={ing.type} 
                  id={ing.id} 
                />
              ))}
            </Stack>
            
            <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.3 }}>
              <KeyboardDoubleArrowRight sx={{ fontSize: 24 }} />
            </Box>

            {/* Products */}
            <Stack direction="row" spacing={1.5} sx={{ display: 'flex', alignItems: 'center' }}>
              {products.map((prod, idx) => (
                <RecipeItem 
                  key={idx} 
                  source={getSourceData(prod.type, prod.id)} 
                  amount={prod.amount} 
                  type={prod.type} 
                  id={prod.id} 
                  isProduct 
                />
              ))}
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
