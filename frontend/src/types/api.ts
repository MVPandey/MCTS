import type { Message, Strategy, NodeCritiques } from './tree';

// Search request configuration
export interface SearchRequest {
  goal: string;
  first_message: string;
  init_branches: number;
  turns_per_branch: number;
  user_intents_per_branch: number;
  user_variability: boolean;
  scoring_mode: 'absolute' | 'comparative';
  prune_threshold: number;
  rounds: number;
  deep_research: boolean;
  reasoning_enabled: boolean;
  strategy_model: string | null;
  simulator_model: string | null;
  judge_model: string | null;
}

// Model info from /api/models
export interface Model {
  id: string;
  name: string;
  context_length: number;
  prompt_cost: number;
  completion_cost: number;
  supports_reasoning: boolean;
}

export interface ModelsResponse {
  models: Model[];
  default_model: string | null;
  error?: string;
}

// Token usage structures
export interface PhaseUsage {
  input_tokens: number;
  output_tokens: number;
  requests: number;
  external_cost_usd?: number;
}

export interface ModelUsage {
  input_tokens: number;
  output_tokens: number;
  requests: number;
  cost_usd: number;
  pricing: {
    input_per_million: number;
    output_per_million: number;
  };
}

export interface TokenUsage {
  models_used: string[];
  totals: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    total_requests: number;
    total_cost_usd: number;
  };
  by_phase: {
    strategy_generation: PhaseUsage;
    intent_generation: PhaseUsage;
    user_simulation: PhaseUsage;
    assistant_generation: PhaseUsage;
    judging: PhaseUsage;
    research: PhaseUsage & { external_cost_usd: number };
  };
  by_model: Record<string, ModelUsage>;
}

// Branch data (from exploration dict)
export interface BranchScores {
  individual: number[];
  aggregated: number;
  visits: number;
  value_mean: number;
  critiques: NodeCritiques | null;
}

export interface Branch {
  id: string;
  strategy: Strategy;
  user_intent: {
    label: string;
    emotional_tone: string;
    cognitive_stance: string;
  } | null;
  status: 'active' | 'pruned';
  depth: number;
  scores: BranchScores;
  trajectory: Message[];
  prune_reason: string | null;
}

export interface BestBranch {
  id: string;
  strategy: string;
  score: number;
  trajectory: Message[];
}

export interface ExplorationSummary {
  total_branches: number;
  active_branches: number;
  pruned_branches: number;
  total_rounds: number;
  best_score: number;
}

export interface ExplorationData {
  summary: ExplorationSummary;
  research_report: string | null;
  best_branch: BestBranch | null;
  branches: Branch[];
}

// Complete result
export interface DTSRunResult {
  best_node_id: string | null;
  best_score: number;
  best_messages: Message[];
  pruned_count: number;
  total_rounds: number;
  token_usage: TokenUsage;
  exploration: ExplorationData;
}
