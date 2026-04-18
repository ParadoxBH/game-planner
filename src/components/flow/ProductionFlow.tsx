import { useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box } from "@mui/material";
import { type CraftNode } from "../../utils/craftingTree";
import { StationFlowNode, type StationNodeData } from "./StationFlowNode";
import { ShopFlowNode, type ShopNodeData } from "./ShopFlowNode";
import { MoneyFlowNode } from "./MoneyFlowNode";
import { ResultFlowNode } from "./ResultFlowNode";
import { StageGroup } from "./StageGroup";
import { type Recipe } from "../../types/gameModels";

const nodeTypes: NodeTypes = {
  stationNode: StationFlowNode,
  shopNode: ShopFlowNode,
  moneyNode: MoneyFlowNode,
  resultNode: ResultFlowNode,
  stageGroup: StageGroup,
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
    
    // Maps to track existing nodes per level to avoid duplication across stages
    const shopNodesMap = new Map<string, Node>(); // shopName-level -> node
    const stationNodesMap = new Map<string, Node>(); // stationName-level -> node
    
    const horizontalSpacing = 600;
    const verticalSpacing = 280;

    // Helper to calculate max depth of the tree
    const getMaxDepth = (node: CraftNode): number => {
        if (!node.ingredients || node.ingredients.length === 0) return 0;
        return 1 + Math.max(...node.ingredients.map(getMaxDepth));
    };

    const maxDepth = getMaxDepth(tree);

    // Track how many nodes we have at each level for Y positioning
    const levelNodeCounts = new Map<number, number>();

    const getNextYPos = (level: number) => {
        const count = levelNodeCounts.get(level) || 0;
        levelNodeCounts.set(level, count + 1);
        return count * verticalSpacing + 100; // Offset for stage header
    };

    // Helper to aggregate shop items within a specific level
    const getOrAddShopNode = (shopName: string, item: CraftNode, level: number) => {
      const key = `${shopName}-${level}`;
      const existing = shopNodesMap.get(key);
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

      const id = `shop-${shopName.replace(/\s+/g, "-")}-L${level}`;
      const newNode: Node = {
        id,
        type: "shopNode",
        position: { x: 50, y: getNextYPos(level) },
        data: {
          shopName,
          items: [{ id: item.id, name: item.name, icon: item.icon, amount: item.amount, price: item.buyPrice }]
        },
        parentId: `stage-${level}`
      };
      nodes.push(newNode);
      shopNodesMap.set(key, newNode);
      return id;
    };

    // Helper to aggregate recipes by station within a specific level
    const getOrAddStationNode = (stationName: string, recipe: CraftNode, level: number) => {
        const key = `${stationName}-${level}`;
        const existing = stationNodesMap.get(key);
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

        const id = `station-${stationName.replace(/\s+/g, "-")}-L${level}`;
        const hasAlts = allRecipesByProduct?.has(recipe.id) && (allRecipesByProduct.get(recipe.id)?.length || 0) > 1;
        const newNode: Node = {
            id,
            type: "stationNode",
            position: { x: 50, y: getNextYPos(level) },
            data: {
                stationName,
                recipes: [{ ...recipe, hasAlternatives: hasAlts }],
                onSelectCategory,
                onSelectRecipe
            },
            parentId: `stage-${level}`
        };
        nodes.push(newNode);
        stationNodesMap.set(key, newNode);
        return id;
    };

    // Create Stage containers first
    for (let i = 0; i <= maxDepth; i++) {
        nodes.push({
            id: `stage-${i}`,
            type: 'stageGroup',
            data: { label: i === maxDepth ? "Etapa Final" : i === 0 ? "Matérias-Primas" : `Etapa ${i + 1}` },
            position: { x: i * horizontalSpacing, y: 0 },
            style: {
                width: horizontalSpacing - 100,
                height: 1000, // Will be adjusted later
                zIndex: -1,
                pointerEvents: 'none',
            },
        } as Node);
    }

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

    // Start traversal from the final product (highest level)
    traverse(tree, maxDepth);

    // Adjust Stage heights based on node counts
    nodes.forEach(node => {
        if (node.type === 'stageGroup' && node.id.startsWith('stage-')) {
            const level = parseInt(node.id.split('-')[1]);
            const count = levelNodeCounts.get(level) || 1;
            node.style = { ...node.style, height: count * verticalSpacing + 150 };
        }
    });

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

    // --- TERMINAL NODES (Money & Result) ---
    const sellPrice = tree.sellPrice;
    const resultNodeId = 'result-node';
    const moneyNodeId = 'money-node';

    // Add Money Node on the far left
    if (totalBuyCost > 0 || shopNodesMap.size > 0) {
        nodes.push({
            id: moneyNodeId,
            type: 'moneyNode',
            position: { x: -horizontalSpacing / 2, y: ((levelNodeCounts.get(0) || 1) * verticalSpacing) / 2 },
            data: { totalCost: totalBuyCost }
        } as Node);

        // Connect money to ALL shop nodes
        shopNodesMap.forEach((shopNode) => {
            edges.push({
                id: `e-${moneyNodeId}-${shopNode.id}`,
                source: moneyNodeId,
                target: shopNode.id,
                animated: true,
                style: { stroke: "#ffeb3b", strokeWidth: 3 },
            });
        });
    }

    // Add Result Node on the far right
    nodes.push({
        id: resultNodeId,
        type: 'resultNode',
        position: { x: (maxDepth + 1) * horizontalSpacing, y: ((levelNodeCounts.get(maxDepth) || 1) * verticalSpacing) / 2 },
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
    stationNodesMap.forEach((node, key) => {
        if (key.endsWith(`-${maxDepth}`)) {
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
        }
    });

    shopNodesMap.forEach((node, key) => {
        if (key.endsWith(`-${maxDepth}`)) {
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
