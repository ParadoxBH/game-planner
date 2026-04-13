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
  Assignment,
  Science
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { ItemChip } from "../common/ItemChip";
import { TimeChip } from "../common/TimeChip";

import type { GameDataTypes, RecipeItem, RecipeUnlock, Entity, Category } from "../../types/gameModels";

interface RecipeCardProps {
  id: string;
  name: string;
  stations: string[];
  ingredients: RecipeItem[];
  products: RecipeItem[];
  unlock?: RecipeUnlock[];
  getSourceData: (type: GameDataTypes | undefined, id: string) => { name: string; icon?: string; type: GameDataTypes; level?: number } | undefined;
  eventsMap: Map<string, string>;
  craftTime?: number;
  variant?: "default" | "compact";
  entities?: Entity[];
  categories?: Category[];
}



export function RecipeCard({
  id,
  name,
  stations,
  ingredients,
  products,
  unlock,
  getSourceData,
  eventsMap,
  craftTime,
  variant = "default",
  entities = [],
  categories = []
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
        transform: variant === "compact" ? "translateY(-6px)" : "none",
        boxShadow: variant === "compact" ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
      }
    }}>
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
            {(() => {
              const mainProduct = products[0];
              const productData = mainProduct ? getSourceData(mainProduct.type, mainProduct.id) : null;
              
              return productData?.icon ? (
                <img
                  src={productData.icon}
                  alt={name}
                  style={{
                    width: "80%",
                    height: "80%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Science sx={{ fontSize: 32, color: "rgba(255, 255, 255, 0.2)" }} />
              );
            })()}
            {(() => {
                const mainProduct = products[0];
                const productData = mainProduct ? getSourceData(mainProduct.type, mainProduct.id) : null;
                if (productData?.level && productData.level > 0) {
                     return (
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
                        {productData.level}
                        </Box>
                    );
                }
                return null;
            })()}
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
            {name}
          </Typography>
        </Box>
      ) : (
        <CardContent sx={{ p: '16px !important' }}>
          <Stack spacing={2.5}>
            {/* Header: Name and Stations */}
            <Stack alignItems="stretch" textAlign={"start"}>
              <Stack direction="row" alignItems={"center"} justifyContent="space-between">
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Receita
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                  {stations.map(s => {
                    const normalizedStation = s.toLowerCase();
                    const relatedEntities = entities.filter(e => {
                      const cats = Array.isArray(e.category) ? e.category : [e.category];
                      return cats.some(c => c && c.toLowerCase() === normalizedStation);
                    });

                    const isSingle = relatedEntities.length === 1;
                    const firstEntity = relatedEntities.length > 0 ? relatedEntities[0] : null;

                    let displayName = s;
                    let displayIcon = undefined;
                    let entityId = undefined;

                    if (isSingle && firstEntity) {
                      displayName = firstEntity.name;
                      displayIcon = firstEntity.icon;
                      entityId = firstEntity.id;
                    } else {
                      const cat = categories.find(c => c.id.toLowerCase() === normalizedStation);
                      if (cat) {
                        displayName = cat.name;
                        displayIcon = cat.icon;
                      }
                    }

                    const targetUrl = entityId 
                      ? `/game/${gameId}/entity/view/${entityId}`
                      : `/game/${gameId}/entity/list/all?subCategory=${s}`;

                    return (
                      <Chip 
                        key={s} 
                        label={displayName} 
                        size="small" 
                        icon={displayIcon ? (
                          <Box component="img" src={displayIcon} sx={{ width: 14, height: 14, objectFit: 'contain' }} />
                        ) : (
                          <Construction sx={{ fontSize: '0.8rem !important' }} />
                        )} 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(targetUrl);
                        }}
                        sx={{ 
                          backgroundColor: 'rgba(255,255,255,0.05)', 
                          fontSize: '0.65rem', 
                          height: 20,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderColor: 'primary.main',
                          }
                        }} 
                      />
                    );
                  })}
                  {craftTime && craftTime > 0 && (
                    <TimeChip seconds={craftTime} />
                  )}
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
                      level={source?.level}
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
                      level={source?.level}
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
      )}
    </Card>
  );
}
