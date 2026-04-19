import { useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  Position,
  Handle,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, Typography, Paper, Stack } from "@mui/material";
import { 
  Paid
} from "@mui/icons-material";
import { ItemChip } from "../common/ItemChip";
import { RecipeCard } from "../recipe/RecipeCard";
import { ItemShopCard } from "../shop/ItemShopCard";
import { EntityCard } from "../entity/EntityCard";
import { useNavigate, useParams } from "react-router-dom";

// --- Custom Nodes ---


const SourceNode = ({ data }: NodeProps & { data: any }) => {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();

  return (
    <Box sx={{ position: "relative" }}>
      <Handle type="source" position={Position.Right} style={{ background: "#666", right: -8, zIndex: 10 }} />
      <Box sx={{ transform: 'scale(0.8)', transformOrigin: 'top left', mb: -8, mr: -6 }}>
        {data.type === 'recipe' && (
          <RecipeCard 
            {...data.recipe} 
            getSourceData={data.getSourceData}
            eventsMap={data.eventsMap}
          />
        )}
        {data.type === 'shop' && (
          <ItemShopCard 
            {...data.shopData}
            itemsMap={data.itemsMap}
            entitiesMap={data.entitiesMap}
            eventsMap={data.eventsMap}
            onClick={() => navigate(`/game/${gameId}/shops/list/${data.shopData.shop.id}`)}
          />
        )}
        {data.type === 'drop' && (
          <EntityCard 
            entity={data.entity}
            showPrices
            onClick={() => navigate(`/game/${gameId}/entity/view/${data.entity.id}`)}
          />
        )}
      </Box>
    </Box>
  );
};

const ItemNode = ({ data }: NodeProps & { data: any }) => (
  <Paper elevation={6} sx={{ 
    p: 0,
    minWidth: 200, 
    backgroundColor: "rgba(144, 202, 249, 0.1)", 
    border: "2px solid #90caf9",
    borderRadius: 3,
    overflow: "hidden",
    boxShadow: "0 0 20px rgba(144, 202, 249, 0.2)"
  }}>
    <Box sx={{ p: 2, textAlign: "center", position: "relative" }}>
      <Handle type="target" position={Position.Left} style={{ background: "#90caf9", width: 10, height: 10, left: -6 }} />
      <Handle type="source" position={Position.Right} style={{ background: "#90caf9", width: 10, height: 10, right: -6 }} />
      
      <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
        <ItemChip id={data.item.id} icon={data.item.icon} size="extraLarge" level={data.item.level} />
      </Box>
      <Typography variant="h6" fontWeight={800} color="primary.light" noWrap>
        {data.item.name}
      </Typography>
      
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
        {data.item.buyPrice !== undefined && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>COMPRA</Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="body2" fontWeight={800} color="warning.main">{data.item.buyPrice}</Typography>
              <Paid sx={{ fontSize: 12, color: 'warning.main' }} />
            </Stack>
          </Box>
        )}
        {data.item.sellPrice !== undefined && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.6rem' }}>VENDA</Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="body2" fontWeight={800} color="warning.main">{data.item.sellPrice}</Typography>
              <Paid sx={{ fontSize: 12, color: 'warning.main' }} />
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  </Paper>
);

const UsageNode = ({ data }: NodeProps & { data: any }) => (
  <Box sx={{ position: "relative" }}>
    <Handle type="target" position={Position.Left} style={{ background: "#666", left: -8, zIndex: 10 }} />
    <Box sx={{ transform: 'scale(0.8)', transformOrigin: 'top left', mb: -8, mr: -6 }}>
       <RecipeCard 
          {...data.recipe} 
          getSourceData={data.getSourceData}
          eventsMap={data.eventsMap}
        />
    </Box>
  </Box>
);

const nodeTypes = {
  sourceNode: SourceNode,
  itemNode: ItemNode,
  usageNode: UsageNode,
};

// --- Main Component ---

interface ItemFlowSectionProps {
  item: any;
  productionRecipes: any[];
  usagesAsIngredient: any[];
  dropsFrom: any[];
  soldIn: any[];
  itemsMap: Map<string, any>;
  entitiesMap: Map<string, any>;
  eventsMap: Map<string, any>;
  getSourceData: (type: any, id: string) => any;
}

export function ItemFlowSection({
  item,
  productionRecipes,
  usagesAsIngredient,
  dropsFrom,
  soldIn,
  itemsMap,
  entitiesMap,
  eventsMap,
  getSourceData,
}: ItemFlowSectionProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const centerNodeId = "center-item";
    const horizontalSpacing = 600;
    const verticalSpacing = 300; // Increased to accommodate cards

    // 1. Center Item Node
    nodes.push({
      id: centerNodeId,
      type: "itemNode",
      position: { x: 0, y: 0 },
      data: { item },
    });

    // 2. Sources (Left)
    const sourcesCount = (productionRecipes?.length || 0) + (dropsFrom?.length || 0) + (soldIn?.length || 0);
    let currentLeftY = -( (sourcesCount - 1) * verticalSpacing ) / 2;

    // Production Recipes as Source
    productionRecipes?.forEach((recipe) => {
      const id = `source-recipe-${recipe.id}`;
      nodes.push({
        id,
        type: "sourceNode",
        position: { x: -horizontalSpacing, y: currentLeftY },
        data: { 
          type: 'recipe', 
          recipe: {
            id: recipe.id,
            name: recipe.normalizedName,
            stations: recipe.normalizedStations,
            ingredients: recipe.normalizedIngredients,
            products: recipe.normalizedProducts,
            unlock: recipe.unlock
          },
          getSourceData,
          eventsMap
        },
      });
      edges.push({
        id: `e-${id}-${centerNodeId}`,
        source: id,
        target: centerNodeId,
        animated: true,
        style: { stroke: "#2196f3", strokeWidth: 3 },
      });
      currentLeftY += verticalSpacing;
    });

    // Drops as Source
    dropsFrom?.forEach((entity) => {
      const id = `source-drop-${entity.id}`;
      nodes.push({
        id,
        type: "sourceNode",
        position: { x: -horizontalSpacing, y: currentLeftY },
        data: { 
          type: 'drop', 
          entity
        },
      });
      edges.push({
        id: `e-${id}-${centerNodeId}`,
        source: id,
        target: centerNodeId,
        animated: true,
        style: { stroke: "#ff9800", strokeWidth: 3 },
      });
      currentLeftY += verticalSpacing;
    });

    // Shops as Source
    soldIn?.forEach((shopData, idx) => {
      const id = `source-shop-${shopData.shop.id}-${idx}`;
      nodes.push({
        id,
        type: "sourceNode",
        position: { x: -horizontalSpacing, y: currentLeftY },
        data: { 
          type: 'shop', 
          shopData: {
            ...shopData,
            npc: entitiesMap.get(shopData.shop.npcId),
            currencyItem: itemsMap.get(shopData.shopItem.currency || "ouro")
          },
          itemsMap,
          entitiesMap,
          eventsMap: new Map(Array.from(eventsMap.entries()).map(([k, v]) => [k, { name: v }]))
        },
      });
      edges.push({
        id: `e-${id}-${centerNodeId}`,
        source: id,
        target: centerNodeId,
        animated: true,
        style: { stroke: "#4caf50", strokeWidth: 3 },
      });
      currentLeftY += verticalSpacing;
    });

    // 3. Usages (Right)
    const usageCount = usagesAsIngredient?.length || 0;
    let currentRightY = -( (usageCount - 1) * verticalSpacing ) / 2;

    usagesAsIngredient?.forEach((recipe) => {
      const id = `usage-recipe-${recipe.id}`;
      nodes.push({
        id,
        type: "usageNode",
        position: { x: horizontalSpacing, y: currentRightY },
        data: { 
          recipe: {
            id: recipe.id,
            name: recipe.normalizedName,
            stations: recipe.normalizedStations,
            ingredients: recipe.normalizedIngredients,
            products: recipe.normalizedProducts,
            unlock: recipe.unlock
          },
          getSourceData,
          eventsMap
        },
      });
      edges.push({
        id: `e-${centerNodeId}-${id}`,
        source: centerNodeId,
        target: id,
        animated: true,
        style: { stroke: "#f44336", strokeWidth: 3 },
      });
      currentRightY += verticalSpacing;
    });

    return { nodes, edges };
  }, [item, productionRecipes, usagesAsIngredient, dropsFrom, soldIn, itemsMap, entitiesMap, eventsMap, getSourceData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  return (
    <Box sx={{ width: "100%", flex: 1, backgroundColor: "#0a0a0a", borderRadius: 2, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
      >
        <Background color="#222" gap={20} variant={"dots" as any} />
        <Controls />
      </ReactFlow>
    </Box>
  );
}
