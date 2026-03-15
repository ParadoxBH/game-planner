import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Box, Typography, Paper } from "@mui/material";
import { Paid } from "@mui/icons-material";

export interface MoneyNodeData {
  totalCost: number;
}

export function MoneyFlowNode({ data }: NodeProps & { data: MoneyNodeData }) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 0,
        minWidth: 180,
        backgroundColor: "rgba(255, 235, 59, 0.05)",
        border: "1px solid rgba(255, 235, 59, 0.2)",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 1, backgroundColor: "rgba(255, 235, 59, 0.1)", borderBottom: "1px solid rgba(255, 235, 59, 0.2)", display: "flex", alignItems: "center", gap: 1 }}>
        <Paid sx={{ fontSize: 16, color: "warning.light" }} />
        <Typography variant="caption" fontWeight={800} sx={{ color: "warning.light", textTransform: "uppercase", letterSpacing: 1 }}>
          TOTAL COST
        </Typography>
      </Box>

      <Box sx={{ p: 2, position: "relative", textAlign: "center" }}>
        <Handle type="source" position={Position.Right} style={{ background: "#ffeb3b", right: -4 }} />
        <Typography variant="h6" fontWeight={800} color="warning.light">
          {data.totalCost.toLocaleString()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Gold / Coins
        </Typography>
      </Box>
    </Paper>
  );
}
