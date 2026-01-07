import { create } from 'zustand';
import type { Node, Edge } from 'reactflow';
import type { NodeAddedData, NodeUpdatedData } from '@/types';

export interface TreeNodeData {
  id: string;
  parentId: string | null;
  depth: number;
  status: 'active' | 'expanding' | 'scored' | 'pruned' | 'error';
  strategy: string | null;
  userIntent: string | null;
  score: number | null;
  individualScores: number[];
  passed: boolean | null;
  messageCount: number;
  isSelected: boolean;
  isBestPath: boolean;
}

interface TreeState {
  // ReactFlow data
  nodes: Node<TreeNodeData>[];
  edges: Edge[];

  // Metadata
  rootId: string | null;
  bestNodeId: string | null;

  // Layout direction
  layoutDirection: 'TB' | 'LR';

  // Actions
  initializeTree: () => void;
  addNode: (data: NodeAddedData) => void;
  updateNode: (data: NodeUpdatedData) => void;
  pruneNodes: (ids: string[]) => void;
  setSelectedNode: (id: string | null) => void;
  setBestPath: (nodeId: string) => void;
  setLayoutDirection: (direction: 'TB' | 'LR') => void;
  reset: () => void;
}

export const useTreeStore = create<TreeState>((set, get) => ({
  nodes: [],
  edges: [],
  rootId: null,
  bestNodeId: null,
  layoutDirection: 'TB',

  initializeTree: () => {
    // Reset state - root node will be added via addNode when backend sends it
    set({
      nodes: [],
      edges: [],
      rootId: null,
      bestNodeId: null,
    });
  },

  addNode: (data) => {
    const { id, parent_id, depth, status, strategy, user_intent, message_count } = data;

    // Create new node
    const newNode: Node<TreeNodeData> = {
      id,
      type: 'treeNode',
      position: { x: 0, y: 0 }, // Position will be calculated by dagre
      data: {
        id,
        parentId: parent_id,
        depth,
        status: status as TreeNodeData['status'],
        strategy,
        userIntent: user_intent,
        score: null,
        individualScores: [],
        passed: null,
        messageCount: message_count,
        isSelected: false,
        isBestPath: false,
      },
    };

    // Create edge from parent (if not root)
    const newEdge: Edge | null = parent_id
      ? {
          id: `${parent_id}-${id}`,
          source: parent_id,
          target: id,
          type: 'treeEdge',
          data: { isPruned: false, isBestPath: false },
        }
      : null;

    // If this is the root node (no parent), set rootId
    const isRoot = parent_id === null;

    set((state) => ({
      nodes: [...state.nodes, newNode],
      edges: newEdge ? [...state.edges, newEdge] : state.edges,
      rootId: isRoot ? id : state.rootId,
    }));
  },

  updateNode: (data) => {
    const { id, status, score, individual_scores, passed } = data;

    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                status: status as TreeNodeData['status'],
                score,
                individualScores: individual_scores,
                passed,
              },
            }
          : node
      ),
    }));

    // Update best score tracking
    const currentBestScore = get().nodes.find((n) => n.id === get().bestNodeId)?.data.score ?? 0;
    if (score > currentBestScore) {
      set({ bestNodeId: id });
    }
  },

  pruneNodes: (ids) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        ids.includes(node.id)
          ? {
              ...node,
              data: { ...node.data, status: 'pruned' as const },
            }
          : node
      ),
      edges: state.edges.map((edge) =>
        ids.includes(edge.target)
          ? {
              ...edge,
              data: { ...edge.data, isPruned: true },
            }
          : edge
      ),
    }));
  },

  setSelectedNode: (id) => {
    set((state) => ({
      nodes: state.nodes.map((node) => ({
        ...node,
        data: { ...node.data, isSelected: node.id === id },
      })),
    }));
  },

  setBestPath: (nodeId) => {
    // Find path from nodeId to root
    const { nodes, edges } = get();
    const pathNodeIds = new Set<string>();
    const pathEdgeIds = new Set<string>();

    let currentId: string | null = nodeId;
    while (currentId) {
      pathNodeIds.add(currentId);
      const node = nodes.find((n) => n.id === currentId);
      const parentId = node?.data.parentId;
      if (parentId) {
        pathEdgeIds.add(`${parentId}-${currentId}`);
      }
      currentId = parentId ?? null;
    }

    set({
      bestNodeId: nodeId,
      nodes: nodes.map((node) => ({
        ...node,
        data: { ...node.data, isBestPath: pathNodeIds.has(node.id) },
      })),
      edges: edges.map((edge) => ({
        ...edge,
        data: { ...edge.data, isBestPath: pathEdgeIds.has(edge.id) },
      })),
    });
  },

  setLayoutDirection: (layoutDirection) => set({ layoutDirection }),

  reset: () =>
    set({
      nodes: [],
      edges: [],
      rootId: null,
      bestNodeId: null,
    }),
}));
