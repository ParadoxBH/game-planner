import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Box, Typography, Paper, Stack, Divider, Tooltip } from "@mui/material";
import { type CraftNode } from "../../utils/craftingTree";
import { Construction, SwapHoriz, HelpOutline } from "@mui/icons-material";
import { ItemChip } from "../common/ItemChip";
import { TimeChip } from "../common/TimeChip";

export interface StationNodeData {
  stationName: string;
  recipes: (CraftNode & { hasAlternatives?: boolean })[];
  onSelectCategory?: (categoryId: string) => void;
  onSelectRecipe?: (itemId: string) => void;
}

export function StationFlowNode({ data }: NodeProps & { data: StationNodeData }) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 0,
        minWidth: 320,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 1, backgroundColor: "rgba(255, 255, 255, 0.1)", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", alignItems: "center", gap: 1 }}>
        <Construction sx={{ fontSize: 16, color: "primary.main" }} />
        <Typography variant="caption" fontWeight={800} sx={{ color: "primary.main", textTransform: "uppercase", letterSpacing: 1 }}>
          {data.stationName || "GENERAL CRAFTING"}
        </Typography>
      </Box>

      <Stack spacing={0} divider={<Divider sx={{ borderStyle: "dashed", opacity: 0.3 }} />}>
        {data.recipes.map((recipe, rIdx) => (
          <Stack key={rIdx} direction="row" divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: "dashed", opacity: 0.2 }} />}>
            {/* Ingredients Side */}
            <Box sx={{ p: 1.5, flex: 1, position: "relative", backgroundColor: "rgba(0,0,0,0.1)" }}>
              <Handle 
                type="target" 
                position={Position.Left} 
                id={`target-${recipe.id}`}
                style={{ background: "#555", left: -4 }} 
              />
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", fontSize: "0.6rem" }}>
                INGREDIENTS
              </Typography>
              <Stack spacing={0.5}>
                {recipe.ingredients.map((ing, idx) => {
                  const isCategory = ing.type === "category" || ing.categoryId !== undefined;
                  return (
                    <Box 
                      key={idx} 
                      sx={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 1,
                        cursor: isCategory ? "pointer" : "default",
                        p: 0.5,
                        borderRadius: 1,
                        transition: "background-color 0.2s",
                        "&:hover": isCategory ? {
                          backgroundColor: "rgba(25, 118, 210, 0.08)",
                        } : {}
                      }}
                      onClick={isCategory ? () => data.onSelectCategory?.(ing.categoryId || ing.id) : undefined}
                    >
                      <Tooltip title={isCategory ? "Clique para escolher o item desta categoria" : ""}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <ItemChip {...ing} size="small" disableLink />
                          <Typography variant="caption" noWrap sx={{ maxWidth: 80, fontSize: "0.7rem", color: isCategory ? "primary.main" : "inherit", fontWeight: isCategory ? 600 : 400 }}>
                            {ing.name}
                          </Typography>
                          {isCategory && (
                            <SwapHoriz sx={{ fontSize: 14, color: "primary.main" }} />
                          )}
                        </Box>
                      </Tooltip>
                      {isCategory && !ing.icon && (
                         <HelpOutline sx={{ fontSize: 12, color: "text.disabled" }} />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            {/* Result Side */}
            <Box 
              sx={{ 
                p: 1.5, 
                flex: 1, 
                position: "relative", 
                display: "flex", 
                alignItems: "center", 
                gap: 1.5,
                borderRadius: 1,
                border: (recipe.hasAlternatives || recipe.type === "category" || recipe.categoryId) ? "1px dashed" : "1px solid transparent",
                borderColor: (recipe.hasAlternatives || recipe.type === "category" || recipe.categoryId) ? "primary.main" : "transparent",
                cursor: (recipe.hasAlternatives || recipe.type === "category" || recipe.categoryId) ? "pointer" : "default",
                transition: "all 0.2s",
                "&:hover": (recipe.hasAlternatives || recipe.type === "category" || recipe.categoryId) ? {
                  backgroundColor: "rgba(25, 118, 210, 0.08)",
                  borderColor: "primary.dark",
                  boxShadow: "0 0 8px rgba(25, 118, 210, 0.2)"
                } : {}
              }}
              onClick={() => {
                if (recipe.categoryId || recipe.type === "category") {
                  data.onSelectCategory?.(recipe.categoryId || recipe.id);
                } else if (recipe.hasAlternatives) {
                  data.onSelectRecipe?.(recipe.id);
                }
              }}
            >
              <Handle 
                type="source" 
                position={Position.Right} 
                id={`source-${recipe.id}`}
                style={{ background: "#555", right: -4 }} 
              />
              <Tooltip title={
                (recipe.categoryId || recipe.type === "category")
                  ? "Este recurso é baseado em uma categoria. Clique para escolher/trocar o item." 
                  : (recipe.hasAlternatives ? "Múltiplas receitas disponíveis. Clique para trocar." : "")
              }>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
                  <ItemChip {...recipe} size="small" disableLink />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography 
                        variant="caption" 
                        fontWeight={700} 
                        noWrap 
                        sx={{ 
                            display: "block",
                            color: (recipe.categoryId || recipe.type === "category") ? "orange" : "inherit"
                        }}
                    >
                      {recipe.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                      x{recipe.amount}
                    </Typography>
                    {recipe.recipe?.craftTime && recipe.recipe.craftTime > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <TimeChip seconds={recipe.recipe.craftTime} size="small" />
                      </Box>
                    )}
                  </Box>
                  {(recipe.hasAlternatives || recipe.type === "category" || recipe.categoryId) && (
                    <SwapHoriz sx={{ fontSize: 16, color: (recipe.categoryId || recipe.type === "category") ? "orange" : "primary.main" }} />
                  )}
                </Box>
              </Tooltip>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
