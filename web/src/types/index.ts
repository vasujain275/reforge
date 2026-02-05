/**
 * Core domain types matching backend schema.
 * 
 * IMPORTANT: All IDs are UUIDs (uuid in backend, string in TypeScript).
 */

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface Problem {
  id: string;
  title: string;
  source?: string;
  url?: string;
  difficulty: Difficulty;
  created_at: string;
  patterns?: Pattern[];
  stats?: UserProblemStats;
}

export interface Pattern {
  id: string;
  title: string;
  description?: string;
}

export type Difficulty = "easy" | "medium" | "hard";
export type AttemptOutcome = "passed" | "failed";
export type ProblemStatus = "unsolved" | "solved" | "abandoned";
export type TimerState = "idle" | "running" | "paused";
export type ProblemPriority = "overdue" | "due_soon" | "on_track" | "new";

// ============================================================================
// USER STATS
// ============================================================================

export interface UserProblemStats {
  id: string;
  user_id: string;
  problem_id: string;
  status: ProblemStatus;
  confidence: number; // 0-100
  avg_confidence: number; // 0-100
  last_attempt_at?: string;
  total_attempts: number;
  avg_time_seconds?: number;
  last_outcome?: AttemptOutcome;
  recent_history_json?: string;
  updated_at: string;
  // Spaced repetition fields
  ease_factor?: number;
  interval_days?: number;
  next_review_at?: string;
}

export interface UserPatternStats {
  id: string;
  user_id: string;
  pattern_id: string;
  times_revised: number;
  avg_confidence: number;
  last_revised_at?: string;
}

// ============================================================================
// SESSIONS
// ============================================================================

export interface RevisionSession {
  id: string;
  user_id: string;
  template_key?: string;
  session_name?: string;
  is_custom: boolean;
  created_at: string;
  planned_duration_min: number;
  items_ordered?: string; // JSON array
  completed?: boolean;
  started_at?: string;
  completed_at?: string;
  problems?: SessionProblem[];
  elapsed_time_seconds: number;
  timer_state: TimerState;
  timer_last_updated_at?: string;
}

export interface SessionProblem {
  id: string;
  title: string;
  difficulty: Difficulty;
  source?: string;
  url?: string;
  planned_min: number;
  score: number;
  days_since_last?: number;
  confidence: number;
  reason: string;
  created_at: string;
  completed?: boolean;
  outcome?: AttemptOutcome;
  priority?: ProblemPriority;
  days_until_due?: number;
}

// ============================================================================
// ATTEMPTS
// ============================================================================

export interface Attempt {
  id: string;
  user_id: string;
  problem_id: string;
  session_id?: string;
  confidence_score: number;
  duration_seconds?: number;
  outcome: AttemptOutcome;
  notes?: string;
  performed_at: string;
}

export interface InProgressAttempt {
  id: string;
  user_id: string;
  problem_id: string;
  session_id?: string;
  status: "in_progress" | "completed" | "abandoned";
  elapsed_time_seconds: number;
  timer_state: TimerState;
  timer_last_updated_at?: string;
  started_at: string;
  problem_title?: string;
  problem_difficulty?: string;
}

// ============================================================================
// ATTEMPT API REQUEST TYPES
// ============================================================================

export interface StartAttemptBody {
  problem_id: string;
  session_id?: string;
}

export interface UpdateAttemptTimerBody {
  elapsed_time_seconds: number;
  timer_state: TimerState;
}

export interface CompleteAttemptBody {
  confidence_score: number;
  outcome: AttemptOutcome;
  notes?: string;
  duration_seconds?: number;
}

// ============================================================================
// SESSION TEMPLATES
// ============================================================================

export type TemplateCategory = "daily" | "pattern" | "weekend";
export type ScoringEmphasis = "standard" | "confidence" | "time" | "failure";
export type PatternMode = "all" | "specific" | "exclude" | "weakest";
export type ProblemCountStrategy = "auto" | "fixed";

export interface TemplateInfo {
  key: string;
  display_name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  duration_min: number;
}

export interface UserSessionTemplate {
  id: string;
  user_id: string;
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
  problem_count_strategy: ProblemCountStrategy;
  fixed_problem_count?: number;
  difficulty_distribution: DifficultyDistribution;
  require_quick_win: boolean;
  pattern_mode: PatternMode;
  pattern_ids?: string[];
  max_same_pattern: number;
  scoring_emphasis: ScoringEmphasis;
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

// ============================================================================
// DASHBOARD
// ============================================================================

export interface UrgentProblem {
  id: string;
  title: string;
  source?: string;
  url?: string;
  difficulty: Difficulty;
  score: number;
  days_since_last?: number;
  confidence: number;
  reason: string;
  patterns?: Pattern[];
  priority?: ProblemPriority;
  days_until_due?: number;
}

export interface DashboardStats {
  total_problems: number;
  mastered_problems: number;
  avg_confidence: number;
  current_streak: number;
  problems_due?: number;
  weakest_pattern?: {
    name: string;
    confidence: number;
  };
}

// ============================================================================
// SCORING
// ============================================================================

export interface ScoreBreakdown {
  total_score: number;
  features: ScoreFeature[];
}

export interface ScoreFeature {
  name: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface ScoringWeights {
  w_conf: number;
  w_days: number;
  w_attempts: number;
  w_time: number;
  w_difficulty: number;
  w_failed: number;
  w_pattern: number;
}

// ============================================================================
// PATTERNS WITH STATS
// ============================================================================

export interface PatternWithStats {
  id: string;
  title: string;
  description?: string;
  problemCount: number;
  stats?: PatternUserStats;
}

export interface PatternUserStats {
  id: string;
  user_id: string;
  pattern_id: string;
  times_revised: number;
  avg_confidence: number;
  last_revised_at?: string;
}

// ============================================================================
// PAGINATION
// ============================================================================

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

// ============================================================================
// USER & AUTH
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token?: string;
}
