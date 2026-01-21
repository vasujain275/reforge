// Core domain types matching backend schema

export interface Problem {
  id: number;
  title: string;
  source?: string;
  url?: string;
  difficulty: "easy" | "medium" | "hard";
  created_at: string;
  patterns?: Pattern[];
  stats?: UserProblemStats;
}

export interface Pattern {
  id: number;
  title: string;
  description?: string;
}

export interface UserProblemStats {
  id: number;
  user_id: number;
  problem_id: number;
  status: "unsolved" | "solved" | "abandoned";
  confidence: number; // 0-100
  avg_confidence: number; // 0-100
  last_attempt_at?: string;
  total_attempts: number;
  avg_time_seconds?: number;
  last_outcome?: "passed" | "failed";
  recent_history_json?: string;
  updated_at: string;
}

export interface UserPatternStats {
  id: number;
  user_id: number;
  pattern_id: number;
  times_revised: number;
  avg_confidence: number;
  last_revised_at?: string;
}

export interface RevisionSession {
  id: number;
  user_id: number;
  template_key: string;
  created_at: string;
  planned_duration_min: number;
  items_ordered?: string; // JSON array
  completed?: boolean;
  problems?: SessionProblem[];
}

export interface SessionProblem {
  id: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  source?: string;
  planned_min: number;
  score: number;
  days_since_last?: number;
  confidence: number;
  reason: string;
  created_at: string;
  completed?: boolean;
  outcome?: "passed" | "failed";
}

export interface Attempt {
  id: number;
  user_id: number;
  problem_id: number;
  session_id?: number;
  confidence_score: number;
  duration_seconds?: number;
  outcome: "passed" | "failed";
  notes?: string;
  performed_at: string;
}

export interface SessionTemplate {
  key: string;
  display_name: string;
  icon: string;
  duration_min: number;
  estimated_problems: string;
  description: string;
  max_difficulty?: "easy" | "medium" | "hard";
}

export interface UrgentProblem extends Problem {
  score: number;
  days_since_last: number;
  confidence: number;
  reason: string;
}

export interface DashboardStats {
  total_problems: number;
  mastered_problems: number;
  avg_confidence: number;
  current_streak: number;
  weakest_pattern?: {
    name: string;
    confidence: number;
  };
}

export interface ScoreBreakdown {
  total_score: number;
  features: {
    name: string;
    value: number;
    weight: number;
    contribution: number;
  }[];
}

// Pattern types matching backend
export interface PatternWithStats {
  id: number;
  title: string;
  description?: string;
  problemCount: number;
  stats?: PatternUserStats;
}

export interface PatternUserStats {
  id: number;
  user_id: number;
  pattern_id: number;
  times_revised: number;
  avg_confidence: number;
  last_revised_at?: string;
}

// Settings types matching backend
export interface ScoringWeights {
  w_conf: number;
  w_days: number;
  w_attempts: number;
  w_time: number;
  w_difficulty: number;
  w_failed: number;
  w_pattern: number;
}
