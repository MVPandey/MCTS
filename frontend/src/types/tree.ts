// Core tree and node types matching backend structures

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: string | null;
}

export interface Strategy {
  tagline: string;
  description: string;
}

export interface UserIntent {
  id: string;
  label: string;
  description: string;
  emotional_tone: string;
  cognitive_stance: string;
}

export interface NodeCritiques {
  weaknesses?: string[];
  strengths?: string[];
  key_moment?: string;
  biggest_missed_opportunity?: string;
  summary?: string;
}

export interface NodeStats {
  visits: number;
  value_mean: number;
  judge_scores: number[];
  aggregated_score: number;
  critiques: NodeCritiques | null;
}

export type NodeStatus = 'active' | 'pruned' | 'terminal' | 'error' | 'expanding' | 'scored';

export interface DialogueNode {
  id: string;
  parent_id: string | null;
  children: string[];
  depth: number;
  status: NodeStatus;
  strategy: Strategy | null;
  user_intent: UserIntent | null;
  messages: Message[];
  stats: NodeStats;
  prune_reason: string | null;
}
