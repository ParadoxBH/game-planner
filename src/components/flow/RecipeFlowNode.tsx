import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Box, Typography, Paper, Stack, Divider } from "@mui/material";
import { type CraftNode } from "../../utils/craftingTree";
import { Construction } from "@mui/icons-material";
import { ItemChip } from "../common/ItemChip";

export function RecipeFlowNode({ data }: NodeProps & { data: { node: CraftNode } }) {
  const { node } = data;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 0,
        minWidth: 280,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 1, backgroundColor: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
        <Typography variant="caption" fontWeight={800} sx={{ color: "primary.main", textTransform: "uppercase", letterSpacing: 1 }}>
          CRAFTING RECIPE
        </Typography>
      </Box>

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: "dashed" }} />}>
        {/* Ingredients Side */}
        <Box sx={{ p: 1.5, flex: 1, position: "relative", backgroundColor: "rgba(0,0,0,0.1)" }}>
          <Handle type="target" position={Position.Left} style={{ background: "#555", left: -4 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            INGREDIENTS
          </Typography>
          <Stack spacing={1}>
            {node.ingredients.map((ing, idx) => (
              <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ItemChip id={ing.id} icon={ing.icon} size="small" amount={ing.amount} />
                <Typography variant="caption" noWrap sx={{ maxWidth: 80 }}>
                  {ing.name}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Result Side */}
        <Box sx={{ p: 1.5, flex: 1, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <Handle type="source" position={Position.Right} style={{ background: "#555", right: -4 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            RESULT
          </Typography>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1,
              backgroundColor: "rgba(25, 118, 210, 0.1)",
              border: "1px solid",
              borderColor: "primary.main",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mb: 1,
            }}
          >
            {node.icon ? (
              <img src={node.icon} alt={node.name} style={{ width: "80%", height: "80%", objectFit: "contain" }} />
            ) : (
              <Construction color="primary" />
            )}
          </Box>
          <Typography variant="body2" fontWeight={700}>
            {node.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            x{node.amount}
          </Typography>
        </Box>
      </Stack>
      
      {node.recipe?.stations && node.recipe.stations.length > 0 && (
        <Box sx={{ p: 1, backgroundColor: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
           <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
            STATION: {node.recipe.stations.join(", ")}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
