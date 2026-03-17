import { useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box } from "@mui/material";
import { type CraftNode } from "../../utils/craftingTree";
import { StationFlowNode, type StationNodeData } from "./StationFlowNode";
import { ShopFlowNode, type ShopNodeData } from "./ShopFlowNode";
import { MoneyFlowNode } from "./MoneyFlowNode";
import { ResultFlowNode } from "./ResultFlowNode";
import { type Recipe } from "../../types/gameModels";

const nodeTypes = {
  stationNode: StationFlowNode,
  shopNode: ShopFlowNode,
  moneyNode: MoneyFlowNode,
  resultNode: ResultFlowNode,
};

interface ProductionFlowProps {
  tree: CraftNode;
  allRecipesByProduct?: Map<string, Recipe[]>;
  onSelectCategory?: (categoryId: string) => void;
  onSelectRecipe?: (itemId: string) => void;
}

export function ProductionFlow({ tree, allRecipesByProduct, onSelectCategory, onSelectRecipe }: ProductionFlowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Maps to track existing nodes to avoid duplication
    const shopNodesMap = new Map<string, Node>();
    const stationNodesMap = new Map<string, Node>(); // stationName -> nodeId
    
    const horizontalSpacing = 500;
    const verticalSpacing = 250;

    // Helper to aggregate shop items
    const getOrAddShopNode = (shopName: string, item: CraftNode, level: number) => {
      const existing = shopNodesMap.get(shopName);
      if (existing) {
        const data = existing.data as unknown as ShopNodeData;
        const existingItem = data.items.find(i => i.id === item.id);
        if (existingItem) {
          existingItem.amount += item.amount;
        } else {
          data.items.push({ id: item.id, name: item.name, icon: item.icon, amount: item.amount, price: item.buyPrice });
        }
        return existing.id;
      }

      const id = `shop-${shopName.replace(/\s+/g, "-")}`;
      const newNode: Node = {
        id,
        type: "shopNode",
        position: { x: (level - 1) * horizontalSpacing, y: shopNodesMap.size * verticalSpacing },
        data: {
          shopName,
          items: [{ id: item.id, name: item.name, icon: item.icon, amount: item.amount, price: item.buyPrice }]
        }
      };
      nodes.push(newNode);
      shopNodesMap.set(shopName, newNode);
      return id;
    };

    // Helper to aggregate recipes by station
    const getOrAddStationNode = (stationName: string, recipe: CraftNode, level: number) => {
        const existing = stationNodesMap.get(stationName);
        if (existing) {
            const data = existing.data as unknown as StationNodeData;
            const existingRecipe = data.recipes.find(r => r.id === recipe.id);
            if (existingRecipe) {
                existingRecipe.amount += recipe.amount;
            } else {
                data.recipes.push(recipe);
            }
            return existing.id;
        }

        const id = `station-${stationName.replace(/\s+/g, "-")}`;
        const hasAlts = allRecipesByProduct?.has(recipe.id) && (allRecipesByProduct.get(recipe.id)?.length || 0) > 1;
        const newNode: Node = {
            id,
            type: "stationNode",
            position: { x: level * horizontalSpacing, y: stationNodesMap.size * verticalSpacing },
            data: {
                stationName,
                recipes: [{ ...recipe, hasAlternatives: hasAlts }],
                onSelectCategory,
                onSelectRecipe
            }
        };
        nodes.push(newNode);
        stationNodesMap.set(stationName, newNode);
        return id;
    };

    const traverse = (currentNode: CraftNode, level: number): { nodeId: string, handleId?: string } => {
      // If it's a recipe, group by station
      if (currentNode.recipe) {
        const stationName = currentNode.recipe.stations && currentNode.recipe.stations.length > 0 
            ? currentNode.recipe.stations[0] 
            : "General Crafting";
        
        const nodeId = getOrAddStationNode(stationName, currentNode, level);
        const handleId = `source-${currentNode.id}`;

        currentNode.ingredients.forEach(ing => {
          const source = traverse(ing, level - 1);
          edges.push({
            id: `e-${source.nodeId}-${source.handleId || 'default'}-${nodeId}-target-${currentNode.id}-${ing.id}`,
            source: source.nodeId,
            sourceHandle: source.handleId,
            target: nodeId,
            targetHandle: `target-${currentNode.id}`,
            animated: true,
            style: { stroke: "#666", strokeWidth: 2 },
          });
        });

        return { nodeId, handleId };
      } else if (currentNode.shopName || currentNode.buyPrice > 0) {
        const shopName = currentNode.shopName || "Compra Direta";
        const nodeId = getOrAddShopNode(shopName, currentNode, level);
        return { nodeId };
      } else {
        // Fallback for base resources/others
        const stationName = "Base Resources";
        const nodeId = getOrAddStationNode(stationName, currentNode, level);
        return { nodeId, handleId: `source-${currentNode.id}` };
      }
    };

    // Start traversal from the root product (level 0)
    traverse(tree, 0);

    // Add Money Node if there are any shops
    if (shopNodesMap.size > 0) {
        let totalCost = 0;
        let minX = 0;
        shopNodesMap.forEach(node => {
            const data = node.data as unknown as ShopNodeData;
            data.items.forEach(item => {
                totalCost += (item.price || 0) * item.amount;
            });
            if (node.position.x < minX) minX = node.position.x;
        });

        const moneyNodeId = 'money-node';
        nodes.push({
            id: moneyNodeId,
            type: 'moneyNode',
            position: { x: minX - horizontalSpacing, y: (shopNodesMap.size - 1) * verticalSpacing / 2 },
            data: { totalCost }
        } as Node);

        shopNodesMap.forEach(shopNode => {
            edges.push({
                id: `e-${moneyNodeId}-${shopNode.id}`,
                source: moneyNodeId,
                target: shopNode.id,
                animated: true,
                style: { stroke: "#ffeb3b", strokeWidth: 3 },
            });
        });
    }

    // --- LEFTOVERS & PROFIT CALCULATION ---
    const leftoversMap = new Map<string, { name: string, icon?: string, amount: number }>();
    let totalBuyCost = 0;

    const findLeftovers = (node: CraftNode) => {
        if (node.recipe) {
            let productAmount = node.recipe.amount || 1;
            const product = node.recipe.products?.find((p) => p.id === node.id);
            if (product) productAmount = product.amount;

            const batches = Math.ceil(node.amount / productAmount);
            const totalProduced = batches * productAmount;
            const leftover = totalProduced - node.amount;

            if (leftover > 0) {
                const existing = leftoversMap.get(node.id);
                if (existing) {
                    existing.amount += leftover;
                } else {
                    leftoversMap.set(node.id, { name: node.name, icon: node.icon, amount: leftover });
                }
            }
        }

        if ((node.shopName || node.buyPrice > 0) && node.buyPrice) {
            totalBuyCost += node.buyPrice * node.amount;
        }

        node.ingredients.forEach(findLeftovers);
    };

    findLeftovers(tree);

    // Filter leftovers to only show significant ones or items that aren't the final product
    const leftovers = Array.from(leftoversMap.entries())
        .filter(([id]) => id !== tree.id)
        .map(([id, data]) => ({ id, ...data }));

    // --- RESULT NODE ---
    const sellPrice = tree.sellPrice;

    const resultNodeId = 'result-node';
    let maxX = 0;
    nodes.forEach(n => { if (n.position.x > maxX) maxX = n.position.x; });

    nodes.push({
        id: resultNodeId,
        type: 'resultNode',
        position: { x: maxX + horizontalSpacing, y: (stationNodesMap.size - 1) * verticalSpacing / 2 },
        data: {
            itemName: tree.name,
            itemId: tree.id,
            itemIcon: tree.icon,
            sellPrice,
            totalBuyCost,
            leftovers,
            itemType: tree.type
        }
    } as Node);

    // Connect final production steps or shops to result node
    stationNodesMap.forEach((node) => {
        const data = node.data as unknown as StationNodeData;
        data.recipes.forEach(recipe => {
            // If this recipe produces the final item (root of tree), connect it
            if (recipe.id === tree.id || recipe.recipe?.products?.some(p => p.id === tree.id)) {
                edges.push({
                    id: `e-${node.id}-source-${recipe.id}-${resultNodeId}`,
                    source: node.id,
                    sourceHandle: `source-${recipe.id}`,
                    target: resultNodeId,
                    animated: true,
                    style: { stroke: "#2196f3", strokeWidth: 3 },
                });
            }
        });
    });

    shopNodesMap.forEach((node) => {
        const data = node.data as unknown as ShopNodeData;
        if (data.items.some(i => i.id === tree.id)) {
            edges.push({
                id: `e-${node.id}-source-root-${resultNodeId}`,
                source: node.id,
                target: resultNodeId,
                animated: true,
                style: { stroke: "#2196f3", strokeWidth: 3 },
            });
        }
    });

    return { nodes, edges };
  }, [tree, onSelectCategory, onSelectRecipe, allRecipesByProduct]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state when props/memoized values change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  return (
    <Box sx={{ width: "100%", height: 600, backgroundColor: "#1e1e1e", borderRadius: 2, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
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
