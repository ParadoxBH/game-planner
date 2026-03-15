import { useMemo } from "react";
import {
  ReactFlow,
  Handle,
  Position,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type NodeProps,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, Typography, Paper } from "@mui/material";
import { type CraftNode } from "../../utils/craftingTree";
import { Construction } from "@mui/icons-material";

// Custom node component for the crafting tree
const CraftingFlowNode = ({ data }: NodeProps & { data: { label: string; node: CraftNode } }) => {
  const { node } = data;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5,
        minWidth: 150,
        backgroundColor: node.type === "category" ? "rgba(25, 118, 210, 0.1)" : "rgba(255, 255, 255, 0.05)",
        border: "1px solid",
        borderColor: node.type === "category" ? "primary.main" : "rgba(255, 255, 255, 0.1)",
        borderRadius: 2,
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#555" }} />
      
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            backgroundColor: "rgba(0,0,0,0.2)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {node.icon ? (
            <img src={node.icon} alt={node.name} style={{ width: "80%", height: "80%", objectFit: "contain" }} />
          ) : (
            <Construction sx={{ fontSize: 20, color: "rgba(255, 255, 255, 0.2)" }} />
          )}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {node.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            x{node.amount}
          </Typography>
        </Box>
      </Box>

      {node.shopName && (
        <Typography variant="caption" sx={{ mt: 1, display: "block", color: "primary.light", fontWeight: 600 }}>
          {node.shopName}
        </Typography>
      )}

      {node.ingredients.length > 0 && (
        <Handle type="source" position={Position.Right} style={{ background: "#555" }} />
      )}
    </Paper>
  );
};

const nodeTypes = {
  craftNode: CraftingFlowNode,
};

interface RecipeFlowTreeProps {
  tree: CraftNode;
}

export function RecipeFlowTree({ tree }: RecipeFlowTreeProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const verticalSiblingsSpacing = 120;
    const horizontalDepthSpacing = 300;

    const traverse = (currentNode: CraftNode, x: number, y: number, parentId?: string) => {
      const id = `${currentNode.type}-${currentNode.id}-${Math.random().toString(36).substr(2, 9)}`;
      
      nodes.push({
        id,
        type: "craftNode",
        data: { label: currentNode.name, node: currentNode },
        position: { x, y },
      });

      if (parentId) {
        edges.push({
          id: `e-${id}-${parentId}`,
          source: id,
          target: parentId,
          animated: true,
          style: { stroke: "#555" },
        });
      }

      if (currentNode.ingredients.length > 0) {
        const totalHeight = (currentNode.ingredients.length - 1) * verticalSiblingsSpacing;
        let currentY = y - totalHeight / 2;

        currentNode.ingredients.forEach((ing) => {
          traverse(ing, x - horizontalDepthSpacing, currentY, id);
          currentY += verticalSiblingsSpacing;
        });
      }
    };

    traverse(tree, 0, 0);
    return { nodes, edges };
  }, [tree]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <Box sx={{ width: "100%", height: 500, backgroundColor: "background.paper", borderRadius: 2, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#333" gap={20} />
        <Controls />
      </ReactFlow>
    </Box>
  );
}
