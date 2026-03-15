import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Box, Typography, Paper, Divider, Stack } from "@mui/material";
import { PointOfSale, Inventory, TrendingUp, TrendingDown } from "@mui/icons-material";
import { ItemChip } from "../common/ItemChip";

export interface ResultNodeData {
  itemName: string;
  itemId: string;
  itemIcon?: string;
  sellPrice: number;
  totalBuyCost: number;
  leftovers: Array<{
    id: string;
    name: string;
    icon?: string;
    amount: number;
  }>;
}

export function ResultFlowNode({ data }: NodeProps & { data: ResultNodeData }) {
  const profit = data.sellPrice - data.totalBuyCost;
  const isProfit = profit >= 0;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 0,
        minWidth: 260,
        backgroundColor: "rgba(33, 150, 243, 0.05)",
        border: "1px solid rgba(33, 150, 243, 0.2)",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: 1, backgroundColor: "rgba(33, 150, 243, 0.1)", borderBottom: "1px solid rgba(33, 150, 243, 0.2)", display: "flex", alignItems: "center", gap: 1 }}>
        <PointOfSale sx={{ fontSize: 16, color: "primary.light" }} />
        <Typography variant="caption" fontWeight={800} sx={{ color: "primary.light", textTransform: "uppercase", letterSpacing: 1 }}>
          FINAL RESULT
        </Typography>
      </Box>

      <Box sx={{ p: 2, position: "relative" }}>
        <Handle type="target" position={Position.Left} style={{ background: "#2196f3", left: -4 }} />
        
        <Stack spacing={2}>
          {/* Main Product Info */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <ItemChip id={data.itemId} icon={data.itemIcon} size="medium" amount={1} />
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>{data.itemName}</Typography>
              <Typography variant="caption" color="text.secondary">Target Product</Typography>
            </Box>
          </Box>

          <Divider sx={{ opacity: 0.1 }} />

          {/* Financials */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Sell Value:</Typography>
              <Typography variant="caption" fontWeight={700}>{data.sellPrice.toLocaleString()}G</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Total Buy Cost:</Typography>
              <Typography variant="caption" fontWeight={700}>{data.totalBuyCost.toLocaleString()}G</Typography>
            </Box>
            <Box sx={{ 
              display: "flex", 
              justifyContent: "space-between", 
              mt: 1, 
              p: 1, 
              borderRadius: 1, 
              backgroundColor: isProfit ? "rgba(76, 175, 80, 0.1)" : "rgba(244, 67, 54, 0.1)",
              border: "1px solid",
              borderColor: isProfit ? "success.main" : "error.main"
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {isProfit ? <TrendingUp color="success" sx={{ fontSize: 16 }} /> : <TrendingDown color="error" sx={{ fontSize: 16 }} />}
                <Typography variant="caption" fontWeight={800} color={isProfit ? "success.main" : "error.main"}>
                  {isProfit ? "PROFIT" : "LOSS"}
                </Typography>
              </Box>
              <Typography variant="caption" fontWeight={900} color={isProfit ? "success.main" : "error.main"}>
                {Math.abs(profit).toLocaleString()}G
              </Typography>
            </Box>
          </Box>

          {/* Leftovers */}
          {data.leftovers.length > 0 && (
            <>
              <Divider sx={{ opacity: 0.1 }} />
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                  <Inventory sx={{ fontSize: 14, color: "text.secondary" }} />
                  <Typography variant="caption" fontWeight={700} color="text.secondary">LEFTOVERS (SURPLUS)</Typography>
                </Box>
                <Stack spacing={0.5}>
                  {data.leftovers.map((item, idx) => (
                    <Box key={idx} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <ItemChip id={item.id} icon={item.icon} size="small" amount={0} disableLink />
                        <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>{item.name}</Typography>
                      </Box>
                      <Typography variant="caption" fontWeight={700} color="primary.main">+{item.amount}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </Box>
    </Paper>
  );
}
