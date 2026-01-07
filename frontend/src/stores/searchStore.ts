import { create } from 'zustand';
import type { DTSRunResult, ExplorationData, TokenUsage, Phase } from '@/types';
import { generateId } from '@/lib/utils';

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
}));
