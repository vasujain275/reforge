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
  template_key?: string;
  session_name?: string;
  is_custom: boolean;
  created_at: string;
  planned_duration_min: number;
  items_ordered?: string; // JSON array
  completed?: boolean;
  problems?: SessionProblem[];
  elapsed_time_seconds: number;
  timer_state: "idle" | "running" | "paused";
  timer_last_updated_at?: string;
}

export interface SessionProblem {
  id: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  source?: string;
  url?: string;
  planned_min: number;
  score: number;
  days_since_last?: number;
  confidence: number;
  reason: string;
  created_at: string;
  completed?: boolean;
  outcome?: "passed" | "failed";
  priority?: "overdue" | "due_soon" | "on_track" | "new";
  days_until_due?: number;
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

// ============================================================================
// ATTEMPT TIMER TYPES (for stopwatch functionality)
// ============================================================================

// In-progress attempt with timer state (matches backend InProgressAttemptResponse)
export interface InProgressAttempt {
  id: number;
  user_id: number;
  problem_id: number;
  session_id?: number;
  status: "in_progress" | "completed" | "abandoned";
  elapsed_time_seconds: number;
  timer_state: "idle" | "running" | "paused";
  timer_last_updated_at?: string;
  started_at: string;
  problem_title?: string;
  problem_difficulty?: string;
}

// Request body for starting an attempt (matches backend StartAttemptBody)
export interface StartAttemptBody {
  problem_id: number;
  session_id?: number;
}

// Request body for updating attempt timer (matches backend UpdateAttemptTimerBody)
export interface UpdateAttemptTimerBody {
  elapsed_time_seconds: number;
  timer_state: "idle" | "running" | "paused";
}

// Request body for completing an attempt (matches backend CompleteAttemptBody)
export interface CompleteAttemptBody {
  confidence_score: number;
  outcome: "passed" | "failed";
  notes?: string;
  duration_seconds?: number; // Optional: override elapsed time
}

// Enhanced template types matching new backend
export interface TemplateInfo {
  key: string;
  display_name: string;
  description: string;
  category: "daily" | "pattern" | "weekend";
  icon: string;
  duration_min: number;
}

export interface GenerateSessionResponse {
  template_key?: string;
  template_name: string;
  template_description: string;
  planned_duration_min: number;
  problems: SessionProblem[];
}

export interface TemplateListResponse {
  presets: TemplateInfo[];
  custom: UserSessionTemplate[];
}

export interface UserSessionTemplate {
  id: number;
  user_id: number;
  template_name: string;
  template_key?: string;
  config: CustomSessionConfig;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  use_count: number;
  is_favorite: boolean;
}

export interface CustomSessionConfig {
  session_name?: string;
  duration_min: number;
  problem_count_strategy: "auto" | "fixed";
  fixed_problem_count?: number;
  difficulty_distribution: DifficultyDistribution;
  require_quick_win: boolean;
  pattern_mode: "all" | "specific" | "exclude" | "weakest";
  pattern_ids?: number[];
  max_same_pattern: number;
  scoring_emphasis: "standard" | "confidence" | "time" | "failure";
  confidence_range?: ConfidenceRange;
  min_days_since_last?: number;
  goals?: string[];
}

export interface DifficultyDistribution {
  easy_percent: number;
  medium_percent: number;
  hard_percent: number;
}

export interface ConfidenceRange {
  min: number;
  max: number;
}

// Urgent problem type for dashboard
export interface UrgentProblem {
  id: number;
  title: string;
  source?: string;
  url?: string;
  difficulty: "easy" | "medium" | "hard";
  score: number;
  days_since_last?: number;
  confidence: number;
  reason: string;
  patterns?: Pattern[];
  priority?: "overdue" | "due_soon" | "on_track" | "new";
  days_until_due?: number;
}

// Dashboard stats type
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

// Score breakdown type
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

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedPatternsResponse extends PaginatedResponse<PatternWithStats> {
  unique_problem_count: number;
}

export type PaginatedProblems = PaginatedResponse<Problem>;
export type PaginatedSessions = PaginatedResponse<RevisionSession>;
export type PaginatedPatterns = PaginatedPatternsResponse;

