-- +goose Up
-- +goose StatementBegin

-- ============================================================================
-- PHASE A: Add spaced repetition columns to user_problem_stats
-- ============================================================================

-- Add SM-2 algorithm fields for spaced repetition scheduling
ALTER TABLE user_problem_stats ADD COLUMN next_review_at TIMESTAMPTZ;
ALTER TABLE user_problem_stats ADD COLUMN interval_days INTEGER DEFAULT 1;
ALTER TABLE user_problem_stats ADD COLUMN ease_factor REAL DEFAULT 2.5;
ALTER TABLE user_problem_stats ADD COLUMN review_count INTEGER DEFAULT 0;

-- Index for efficient due-date queries (finding overdue problems)
CREATE INDEX idx_user_problem_stats_next_review 
ON user_problem_stats(user_id, next_review_at);

-- ============================================================================
-- PHASE B: Backfill existing data based on historical performance
-- ============================================================================

-- Step 1: Set review_count from total_attempts
UPDATE user_problem_stats
SET review_count = COALESCE(total_attempts, 0);

-- Step 2: Calculate ease_factor based on historical avg_confidence
-- Higher avg_confidence = higher ease factor (easier retention, longer intervals)
UPDATE user_problem_stats
SET ease_factor = CASE
    WHEN avg_confidence >= 90 THEN 2.8   -- Mastered: longer intervals
    WHEN avg_confidence >= 80 THEN 2.6
    WHEN avg_confidence >= 70 THEN 2.5   -- Default
    WHEN avg_confidence >= 60 THEN 2.3
    WHEN avg_confidence >= 50 THEN 2.1
    ELSE 1.8                              -- Struggling: shorter intervals
END
WHERE avg_confidence IS NOT NULL;

-- Step 3: Calculate interval_days based on mastery level
-- Problems with high confidence + many attempts = longer intervals
UPDATE user_problem_stats
SET interval_days = CASE
    -- Mastered problems (high confidence, multiple attempts)
    WHEN total_attempts > 3 AND avg_confidence >= 90 THEN 30
    WHEN total_attempts > 2 AND avg_confidence >= 80 THEN 14
    WHEN total_attempts > 1 AND avg_confidence >= 70 THEN 7
    -- Moderate familiarity
    WHEN total_attempts > 0 AND avg_confidence >= 50 THEN 3
    -- Struggling or new
    ELSE 1
END;

-- Step 4: Calculate next_review_at based on last_attempt_at + interval_days
-- If a problem is overdue, this will set a past date (will be prioritized immediately)
UPDATE user_problem_stats
SET next_review_at = last_attempt_at + (interval_days || ' days')::INTERVAL
WHERE last_attempt_at IS NOT NULL;

-- Step 5: Handle never-attempted problems (should be due immediately for first attempt)
UPDATE user_problem_stats
SET next_review_at = NOW() - INTERVAL '1 day',
    interval_days = 1,
    ease_factor = 2.5,
    review_count = 0
WHERE last_attempt_at IS NULL;

-- Step 6: Reset interval for problems that were failed last time
-- Failed problems need immediate review regardless of other factors
UPDATE user_problem_stats
SET interval_days = 1,
    next_review_at = last_attempt_at + INTERVAL '1 day',
    ease_factor = GREATEST(1.3, ease_factor - 0.2)
WHERE last_outcome = 'failed' AND last_attempt_at IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_user_problem_stats_next_review;

-- PostgreSQL supports DROP COLUMN directly
ALTER TABLE user_problem_stats DROP COLUMN IF EXISTS next_review_at;
ALTER TABLE user_problem_stats DROP COLUMN IF EXISTS interval_days;
ALTER TABLE user_problem_stats DROP COLUMN IF EXISTS ease_factor;
ALTER TABLE user_problem_stats DROP COLUMN IF EXISTS review_count;

-- +goose StatementEnd
