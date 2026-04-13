import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Box, Typography, Paper, Stack } from "@mui/material";
import { ShoppingCart } from "@mui/icons-material";
import { ItemChip } from "../common/ItemChip";

export interface ShopNodeData {
  shopName: string;
  items: Array<{
    id: string;
    name: string;
    icon?: string;
    amount: number;
    price: number;
  }>;
}

export function ShopFlowNode({ data }: NodeProps & { data: ShopNodeData }) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 0,
        minWidth: 200,
        backgroundColor: "rgba(76, 175, 80, 0.05)",
        border: "1px solid rgba(76, 175, 80, 0.2)",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 1, backgroundColor: "rgba(76, 175, 80, 0.1)", borderBottom: "1px solid rgba(76, 175, 80, 0.2)", display: "flex", alignItems: "center", gap: 1 }}>
        <ShoppingCart sx={{ fontSize: 16, color: "success.light" }} />
        <Typography variant="caption" fontWeight={800} sx={{ color: "success.light", textTransform: "uppercase", letterSpacing: 1 }}>
          {data.shopName || "SHOP"}
        </Typography>
      </Box>

      <Box sx={{ p: 1.5, position: "relative" }}>
        <Handle type="target" position={Position.Left} style={{ background: "#4caf50", left: -4 }} />
        <Handle type="source" position={Position.Right} style={{ background: "#4caf50", right: -4 }} />
        <Stack spacing={1}>
          {data.items.map((item, idx) => (
            <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ItemChip id={item.id} icon={item.icon} size="small" amount={item.amount} />
              <Typography variant="caption" noWrap>
                {item.name}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}
