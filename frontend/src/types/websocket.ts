import type { DTSRunResult } from './api';

// WebSocket event types

export interface SearchStartedData {
  goal: string;
  first_message: string;
  total_rounds: number;
  config: {
    init_branches: number;
    turns_per_branch: number;
    user_intents_per_branch: number;
    scoring_mode: string;
    prune_threshold: number;
  };
}

export type Phase =
  | 'initializing'
  | 'researching'
  | 'generating_strategies'
  | 'generating_intents'
  | 'expanding'
  | 'scoring'
  | 'pruning'
  | 'complete';

export interface PhaseData {
  phase: Phase;
  message: string;
  count?: number;
  branch_count?: number;
  intents_per_branch?: number;
  turns_per_branch?: number;
  node_count?: number;
  scoring_mode?: string;
  threshold?: number;
  best_score?: number;
  best_strategy?: string;
}

export interface StrategyGeneratedData {
  index: number;
  total: number;
  tagline: string;
  description: string;
}

export interface IntentGeneratedData {
  label: string;
  emotional_tone: string;
  cognitive_stance: string;
  strategy: string;
}

export interface RoundStartedData {
  round: number;
  total_rounds: number;
}

export interface NodeAddedData {
  id: string;
  parent_id: string | null;
  depth: number;
  status: string;
  strategy: string | null;
  user_intent: string | null;
  message_count: number;
}

export interface NodeUpdatedData {
  id: string;
  status: string;
  score: number;
  individual_scores: number[];
  passed: boolean;
}

export interface NodesPrunedData {
  ids: string[];
  reasons: Record<string, string>;
}

export interface TokenUpdateData {
  totals: {
    input_tokens: number;
    output_tokens: number;
    total_cost_usd: number;
  };
}

export interface ResearchLogData {
  message: string;
}

export interface ErrorData {
  message: string;
  details?: unknown;
}

// Event map for type-safe event handling
export type WSEventMap = {
  search_started: SearchStartedData;
  phase: PhaseData;
  strategy_generated: StrategyGeneratedData;
  intent_generated: IntentGeneratedData;
  round_started: RoundStartedData;
  node_added: NodeAddedData;
  node_updated: NodeUpdatedData;
  nodes_pruned: NodesPrunedData;
  token_update: TokenUpdateData;
  research_log: ResearchLogData;
  complete: DTSRunResult;
  error: ErrorData;
  pong: Record<string, never>;
};

export type WSEventType = keyof WSEventMap;

export interface WSMessage<T extends WSEventType = WSEventType> {
  type: T;
  data: WSEventMap[T];
}
