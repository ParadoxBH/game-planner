import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Chip, 
  Stack,
  Divider,
  Paper
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
      <CardContent>
        <Stack spacing={2}>
          {/* Recipe Title & Stations */}
          <Box>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700 }}>
              {name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              {stations.map(s => (
                <Chip 
                  key={s} 
                  label={s} 
                  size="small" 
                  icon={<Construction sx={{ fontSize: '1rem' }} />} 
                  sx={{ backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '0.7rem' }} 
                />
              ))}
            </Stack>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

          {/* Crafting Process */}
          <Grid container spacing={2} alignItems="center">
            {/* Ingredients */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={1}>
                <Typography variant="overline" sx={{ color: 'text.disabled', lineHeight: 1 }}>Ingredientes</Typography>
                {ingredients.map((ing, idx) => {
                  const source = getSourceData(ing.type as any, ing.id);
                  return (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Paper variant="outlined" sx={{ 
                        p: 0.5, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: 32, 
                        height: 32, 
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        borderColor: ing.type === 'category' ? 'warning.dark' : 'divider'
                      }}>
                        {ing.type === 'category' ? (
                          <Category sx={{ fontSize: 16, color: 'warning.main' }} />
                        ) : source?.icon ? (
                          <img src={source.icon} alt={ing.id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <Inventory sx={{ fontSize: 16, color: 'text.disabled' }} />
                        )}
                      </Paper>
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {ing.type === 'category' ? `Qualquer ${ing.id}` : (ing.name || source?.name || ing.id)}
                      </Typography>
                      <Chip label={`x${ing.amount}`} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                    </Box>
                  );
                })}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 1 }} sx={{ display: 'flex', justifyContent: 'center' }}>
              <KeyboardDoubleArrowRight sx={{ color: 'text.disabled', display: { xs: 'none', md: 'block' } }} />
            </Grid>

            {/* Products */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={1}>
                <Typography variant="overline" sx={{ color: 'primary.main', lineHeight: 1 }}>Produtos</Typography>
                {products.map((prod, idx) => {
                  const source = getSourceData(prod.type, prod.id);
                  return (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Paper variant="outlined" sx={{ 
                        p: 0.5, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: 32, 
                        height: 32, 
                        backgroundColor: 'rgba(0,0,0,0.2)', 
                        borderColor: prod.type === 'entity' ? 'secondary.dark' : 'primary.dark' 
                      }}>
                        {source?.icon ? (
                          <img src={source.icon} alt={prod.id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          prod.type === 'entity' ? <Bolt sx={{ fontSize: 16, color: 'secondary.main' }} /> : <Inventory sx={{ fontSize: 16, color: 'primary.main' }} />
                        )}
                      </Paper>
                      <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }}>
                        {prod.name || source?.name || prod.id}
                      </Typography>
                      <Chip 
                        color={prod.type === 'entity' ? "secondary" : "primary"} 
                        label={`x${prod.amount}`} 
                        size="small" 
                        sx={{ height: 20, fontSize: '0.7rem' }} 
                      />
                    </Box>
                  );
                })}
              </Stack>
            </Grid>
          </Grid>

          {/* Unlock Requirements */}
          {unlock && unlock.length > 0 && (
            <Box sx={{ 
              mt: 1, 
              p: 1.5, 
              borderRadius: 1, 
              backgroundColor: 'rgba(255, 68, 0, 0.05)', 
              border: '1px dashed rgba(255, 68, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#ffbb00', fontWeight: 600 }}>
                <Lock sx={{ fontSize: '0.9rem' }} /> Requisito
              </Typography>
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
                    <Typography key={idx} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem' }}>
                      <Icon sx={{ fontSize: '1rem', color }} /> 
                      <b>{label}{req.subject ? ` de ${req.subject}` : ''}:</b> {displayValue}
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
