// Configuration types for the search form

export type ScoringMode = 'absolute' | 'comparative';

export interface SearchConfig {
  goal: string;
  firstMessage: string;
  initBranches: number;
  turnsPerBranch: number;
  rounds: number;
  userIntentsPerBranch: number;
  userVariability: boolean;
  pruneThreshold: number;
  scoringMode: ScoringMode;
  deepResearch: boolean;
  reasoningEnabled: boolean;
  strategyModel: string | null;
  simulatorModel: string | null;
  judgeModel: string | null;
}

export const DEFAULT_CONFIG: SearchConfig = {
  goal: '',
  firstMessage: '',
  initBranches: 6,
  turnsPerBranch: 5,
  rounds: 1,
  userIntentsPerBranch: 3,
  userVariability: false,  // Default: use fixed persona (cheaper)
  pruneThreshold: 6.5,
  scoringMode: 'comparative',
  deepResearch: false,
  reasoningEnabled: false,  // Default: disabled (cheaper, faster)
  strategyModel: null,
  simulatorModel: null,
  judgeModel: null,
};
