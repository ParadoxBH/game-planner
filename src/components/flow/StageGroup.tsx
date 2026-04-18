import type { Node, NodeProps } from "@xyflow/react";
import { Box, Typography } from "@mui/material";

export type StageGroupNode = Node<{ label: string }, 'stageGroup'>;

export function StageGroup({ data }: NodeProps<StageGroupNode>) {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 4,
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(4px)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "all",
      }}
    >
      <Box
        sx={{
          padding: "8px 16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "rgba(255, 255, 255, 0.4)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontSize: "0.7rem",
          }}
        >
          {data.label}
        </Typography>
      </Box>
    </Box>
  );
}
