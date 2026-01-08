import { create } from 'zustand';
import type { SearchConfig, ScoringMode, SearchRequest } from '@/types';
import { DEFAULT_CONFIG } from '@/types';

interface ConfigState extends SearchConfig {
  // Actions
  setGoal: (goal: string) => void;
  setFirstMessage: (msg: string) => void;
  setInitBranches: (value: number) => void;
  setTurnsPerBranch: (value: number) => void;
  setRounds: (value: number) => void;
  setUserIntentsPerBranch: (value: number) => void;
  setUserVariability: (enabled: boolean) => void;
  setPruneThreshold: (value: number) => void;
  setScoringMode: (mode: ScoringMode) => void;
  setDeepResearch: (enabled: boolean) => void;
  setReasoningEnabled: (enabled: boolean) => void;
  setStrategyModel: (modelId: string | null) => void;
  setSimulatorModel: (modelId: string | null) => void;
  setJudgeModel: (modelId: string | null) => void;
  reset: () => void;
  toRequest: () => SearchRequest;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  ...DEFAULT_CONFIG,

  setGoal: (goal) => set({ goal }),
  setFirstMessage: (firstMessage) => set({ firstMessage }),
  setInitBranches: (initBranches) => set({ initBranches }),
  setTurnsPerBranch: (turnsPerBranch) => set({ turnsPerBranch }),
  setRounds: (rounds) => set({ rounds }),
  setUserIntentsPerBranch: (userIntentsPerBranch) => set({ userIntentsPerBranch }),
  setUserVariability: (userVariability) => set({ userVariability }),
  setPruneThreshold: (pruneThreshold) => set({ pruneThreshold }),
  setScoringMode: (scoringMode) => set({ scoringMode }),
  setDeepResearch: (deepResearch) => set({ deepResearch }),
  setReasoningEnabled: (reasoningEnabled) => set({ reasoningEnabled }),
  setStrategyModel: (strategyModel) => set({ strategyModel }),
  setSimulatorModel: (simulatorModel) => set({ simulatorModel }),
  setJudgeModel: (judgeModel) => set({ judgeModel }),

  reset: () => set(DEFAULT_CONFIG),

  toRequest: () => {
    const state = get();
    return {
      goal: state.goal,
      first_message: state.firstMessage,
      init_branches: state.initBranches,
      turns_per_branch: state.turnsPerBranch,
      user_intents_per_branch: state.userIntentsPerBranch,
      user_variability: state.userVariability,
      scoring_mode: state.scoringMode,
      prune_threshold: state.pruneThreshold,
      rounds: state.rounds,
      deep_research: state.deepResearch,
      reasoning_enabled: state.reasoningEnabled,
      strategy_model: state.strategyModel,
      simulator_model: state.simulatorModel,
      judge_model: state.judgeModel,
    };
  },
}));
