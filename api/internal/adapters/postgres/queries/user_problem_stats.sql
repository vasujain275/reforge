-- name: GetUserProblemStats :one
SELECT * FROM user_problem_stats
WHERE user_id = $1 AND problem_id = $2
LIMIT 1;

-- name: CreateUserProblemStats :one
INSERT INTO user_problem_stats (
    user_id, problem_id, status, confidence, avg_confidence,
    last_attempt_at, total_attempts, avg_time_seconds, last_outcome, recent_history_json,
    next_review_at, interval_days, ease_factor, review_count
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING *;

-- name: UpdateUserProblemStats :one
UPDATE user_problem_stats
SET status = $1, confidence = $2, avg_confidence = $3,
    last_attempt_at = $4, total_attempts = $5, avg_time_seconds = $6,
    last_outcome = $7, recent_history_json = $8
WHERE user_id = $9 AND problem_id = $10
RETURNING *;

-- name: UpsertUserProblemStats :one
INSERT INTO user_problem_stats (
    user_id, problem_id, status, confidence, avg_confidence,
    last_attempt_at, total_attempts, avg_time_seconds, last_outcome, recent_history_json,
    next_review_at, interval_days, ease_factor, review_count
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
ON CONFLICT(user_id, problem_id) DO UPDATE SET
    status = excluded.status,
    confidence = excluded.confidence,
    avg_confidence = excluded.avg_confidence,
    last_attempt_at = excluded.last_attempt_at,
    total_attempts = excluded.total_attempts,
    avg_time_seconds = excluded.avg_time_seconds,
    last_outcome = excluded.last_outcome,
    recent_history_json = excluded.recent_history_json,
    next_review_at = excluded.next_review_at,
    interval_days = excluded.interval_days,
    ease_factor = excluded.ease_factor,
    review_count = excluded.review_count
RETURNING *;

-- name: UpdateSpacedRepetition :exec
UPDATE user_problem_stats
SET next_review_at = $1,
    interval_days = $2,
    ease_factor = $3,
    review_count = review_count + 1,
    updated_at = NOW()
WHERE user_id = $4 AND problem_id = $5;

-- name: GetProblemsForReview :many
SELECT ups.*, p.title, p.source, p.url, p.difficulty, p.created_at as problem_created_at
FROM user_problem_stats ups
JOIN problems p ON ups.problem_id = p.id
WHERE ups.user_id = $1 
  AND ups.status != 'abandoned'
  AND (ups.next_review_at IS NULL OR ups.next_review_at <= $2)
ORDER BY ups.next_review_at ASC NULLS FIRST
LIMIT $3;

-- name: GetOverdueProblemsCount :one
SELECT COUNT(*) as count
FROM user_problem_stats
WHERE user_id = $1 
  AND status != 'abandoned'
  AND next_review_at IS NOT NULL 
  AND next_review_at < NOW();

-- name: ListUserProblemStats :many
SELECT * FROM user_problem_stats
WHERE user_id = $1
ORDER BY updated_at DESC;

-- name: ListAllUserProblemStats :many
SELECT * FROM user_problem_stats
ORDER BY user_id, problem_id;

-- name: GetUserProblemStatsWithProblem :many
SELECT ups.*, p.title, p.source, p.url, p.difficulty, p.created_at as problem_created_at
FROM user_problem_stats ups
JOIN problems p ON ups.problem_id = p.id
WHERE ups.user_id = $1
ORDER BY ups.updated_at DESC;

-- name: GetUrgentProblems :many
SELECT ups.*, p.title, p.source, p.url, p.difficulty, p.created_at as problem_created_at
FROM user_problem_stats ups
JOIN problems p ON ups.problem_id = p.id
WHERE ups.user_id = $1 AND ups.status != 'abandoned'
ORDER BY ups.last_attempt_at ASC NULLS FIRST, ups.confidence ASC
LIMIT $2;

-- name: GetTotalProblemsForUser :one
SELECT COUNT(DISTINCT problem_id) as count
FROM user_problem_stats
WHERE user_id = $1;

-- name: GetMasteredProblemsForUser :one
SELECT COUNT(*) as count
FROM user_problem_stats
WHERE user_id = $1 AND status = 'solved' AND confidence >= 80;

-- name: GetAverageConfidenceForUser :one
SELECT COALESCE(AVG(confidence), 0) as avg_confidence
FROM user_problem_stats
WHERE user_id = $1 AND status != 'abandoned';
