import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useTreeStore, useUIStore, useSearchStore } from '@/stores';
import { TreeNode } from './TreeNode';
import { TreeEdge } from './TreeEdge';
import type { TreeNodeData } from '@/stores/treeStore';

const nodeTypes = {
  treeNode: TreeNode,
};

const edgeTypes = {
  treeEdge: TreeEdge,
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

function getLayoutedElements(
  nodes: Node<TreeNodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node<TreeNodeData>[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function TreeCanvas() {
  const { nodes: storeNodes, edges: storeEdges, layoutDirection } = useTreeStore();
  const setSelectedBranch = useUIStore((s) => s.setSelectedBranch);
  const status = useSearchStore((s) => s.status);

  const [nodes, setNodes, onNodesChange] = useNodesState<TreeNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update layout when store changes
  useEffect(() => {
    if (storeNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        storeNodes,
        storeEdges,
        layoutDirection
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [storeNodes, storeEdges, layoutDirection, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<TreeNodeData>) => {
      setSelectedBranch(node.id);
    },
    [setSelectedBranch]
  );

  if (status === 'idle' && storeNodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-2">🌳</div>
          <div className="text-sm">Configure your search and click Start</div>
          <div className="text-xs mt-1">The tree will grow here in real-time</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background color="hsl(var(--border))" gap={20} />
        <Controls className="bg-card border border-border" />
        <MiniMap
          className="bg-card border border-border"
          nodeColor={(node) => {
            const data = node.data as TreeNodeData;
            if (data.status === 'pruned') return 'hsl(0, 62%, 50%)';
            if (data.isBestPath) return 'hsl(142, 76%, 36%)';
            if (data.score !== null) return 'hsl(217, 91%, 60%)';
            return 'hsl(var(--muted))';
          }}
        />
      </ReactFlow>
    </div>
  );
}
