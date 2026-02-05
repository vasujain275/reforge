-- +goose Up
-- +goose StatementBegin

-- Add indexes for performance optimization on patterns queries
CREATE INDEX IF NOT EXISTS idx_patterns_title ON patterns(title);

-- Add indexes for user_pattern_stats (used in sorting and filtering)
CREATE INDEX IF NOT EXISTS idx_user_pattern_stats_user_pattern ON user_pattern_stats(user_id, pattern_id);
CREATE INDEX IF NOT EXISTS idx_user_pattern_stats_avg_confidence ON user_pattern_stats(user_id, avg_confidence);
CREATE INDEX IF NOT EXISTS idx_user_pattern_stats_times_revised ON user_pattern_stats(user_id, times_revised);
CREATE INDEX IF NOT EXISTS idx_user_pattern_stats_last_revised ON user_pattern_stats(user_id, last_revised_at);

-- Add composite index for problem_patterns to speed up pattern->problem count queries
CREATE INDEX IF NOT EXISTS idx_problem_patterns_pattern_problem ON problem_patterns(pattern_id, problem_id);

-- Add indexes for problems queries
CREATE INDEX IF NOT EXISTS idx_problems_title ON problems(title);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_created_at ON problems(created_at);

-- Add indexes for sessions queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON revision_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_completed ON revision_sessions(user_id, completed_at);

-- Add index for user_problem_stats queries
CREATE INDEX IF NOT EXISTS idx_user_problem_stats_status ON user_problem_stats(user_id, status);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_user_problem_stats_status;
DROP INDEX IF EXISTS idx_sessions_user_completed;
DROP INDEX IF EXISTS idx_sessions_user_created;
DROP INDEX IF EXISTS idx_problems_created_at;
DROP INDEX IF EXISTS idx_problems_difficulty;
DROP INDEX IF EXISTS idx_problems_title;
DROP INDEX IF EXISTS idx_problem_patterns_pattern_problem;
DROP INDEX IF EXISTS idx_user_pattern_stats_last_revised;
DROP INDEX IF EXISTS idx_user_pattern_stats_times_revised;
DROP INDEX IF EXISTS idx_user_pattern_stats_avg_confidence;
DROP INDEX IF EXISTS idx_user_pattern_stats_user_pattern;
DROP INDEX IF EXISTS idx_patterns_title;

-- +goose StatementEnd
