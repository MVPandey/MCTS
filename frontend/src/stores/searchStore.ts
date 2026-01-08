import { create } from 'zustand';
import type { DTSRunResult, ExplorationData, TokenUsage, Phase } from '@/types';
import { generateId } from '@/lib/utils';
import { useTreeStore } from './treeStore';

export type LogType = 'search' | 'phase' | 'research' | 'strategy' | 'intent' | 'round' | 'node' | 'score' | 'prune';

export interface LogEntry {
  id: string;
  type: LogType;
  message: string;
  timestamp: number;
}

export type SearchStatus = 'idle' | 'running' | 'complete' | 'error';

export interface SearchStats {
  strategies: number;
  nodes: number;
  pruned: number;
  currentRound: number;
  totalRounds: number;
  bestScore: number;
}

interface SearchState {
  // Status
  status: SearchStatus;
  currentPhase: Phase | null;
  error: string | null;

  // Progress stats
  stats: SearchStats;

  // Activity log
  logs: LogEntry[];

  // Results
  result: DTSRunResult | null;
  exploration: ExplorationData | null;
  tokenUsage: TokenUsage | null;

  // Actions
  setStatus: (status: SearchStatus) => void;
  setPhase: (phase: Phase) => void;
  setError: (error: string) => void;
  updateStats: (updates: Partial<SearchStats>) => void;
  incrementStat: (key: keyof SearchStats) => void;
  addLog: (type: LogType, message: string) => void;
  setResult: (result: DTSRunResult) => void;
  reset: () => void;
  exportToJson: () => void;
  importFromJson: (file: File) => Promise<void>;
}

const initialStats: SearchStats = {
  strategies: 0,
  nodes: 0,
  pruned: 0,
  currentRound: 1,
  totalRounds: 1,
  bestScore: 0,
};

export const useSearchStore = create<SearchState>((set) => ({
  status: 'idle',
  currentPhase: null,
  error: null,
  stats: { ...initialStats },
  logs: [],
  result: null,
  exploration: null,
  tokenUsage: null,

  setStatus: (status) => set({ status }),

  setPhase: (currentPhase) => set({ currentPhase }),

  setError: (error) => set({ error, status: 'error' }),

  updateStats: (updates) =>
    set((state) => ({
      stats: { ...state.stats, ...updates },
    })),

  incrementStat: (key) =>
    set((state) => ({
      stats: { ...state.stats, [key]: state.stats[key] + 1 },
    })),

  addLog: (type, message) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          id: generateId(),
          type,
          message,
          timestamp: Date.now(),
        },
      ],
    })),

  setResult: (result) =>
    set({
      result,
      exploration: result.exploration,
      tokenUsage: result.token_usage,
      status: 'complete',
    }),

  reset: () =>
    set({
      status: 'idle',
      currentPhase: null,
      error: null,
      stats: { ...initialStats },
      logs: [],
      result: null,
      exploration: null,
      tokenUsage: null,
    }),

  exportToJson: () => {
    const state = useSearchStore.getState();
    if (!state.result) return;

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      result: state.result,
      logs: state.logs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dts-tree-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importFromJson: async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.result) {
        throw new Error('Invalid file format: missing result data');
      }

      set({
        status: 'complete',
        currentPhase: 'complete',
        error: null,
        stats: {
          strategies: data.result.exploration?.summary?.total_branches ?? 0,
          nodes: data.result.exploration?.branches?.length ?? 0,
          pruned: data.result.pruned_count ?? 0,
          currentRound: data.result.total_rounds ?? 1,
          totalRounds: data.result.total_rounds ?? 1,
          bestScore: data.result.best_score ?? 0,
        },
        logs: data.logs ?? [],
        result: data.result,
        exploration: data.result.exploration,
        tokenUsage: data.result.token_usage,
      });

      // Also load tree visualization
      if (data.result.exploration?.branches) {
        useTreeStore.getState().loadFromBranches(
          data.result.exploration.branches,
          data.result.best_node_id
        );
      }
    } catch (e) {
      console.error('Failed to import JSON:', e);
      throw e;
    }
  },
}));
