-- name: GetUserProblemStats :one
SELECT * FROM user_problem_stats
WHERE user_id = ? AND problem_id = ?
LIMIT 1;

-- name: CreateUserProblemStats :one
INSERT INTO user_problem_stats (
    user_id, problem_id, status, confidence, avg_confidence,
    last_attempt_at, total_attempts, avg_time_seconds, last_outcome, recent_history_json,
    next_review_at, interval_days, ease_factor, review_count
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING *;

-- name: UpdateUserProblemStats :one
UPDATE user_problem_stats
SET status = ?, confidence = ?, avg_confidence = ?,
    last_attempt_at = ?, total_attempts = ?, avg_time_seconds = ?,
    last_outcome = ?, recent_history_json = ?
WHERE user_id = ? AND problem_id = ?
RETURNING *;

-- name: UpsertUserProblemStats :one
INSERT INTO user_problem_stats (
    user_id, problem_id, status, confidence, avg_confidence,
    last_attempt_at, total_attempts, avg_time_seconds, last_outcome, recent_history_json,
    next_review_at, interval_days, ease_factor, review_count
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
SET next_review_at = ?,
    interval_days = ?,
    ease_factor = ?,
    review_count = review_count + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = ? AND problem_id = ?;

-- name: GetProblemsForReview :many
SELECT ups.*, p.title, p.source, p.url, p.difficulty, p.created_at as problem_created_at
FROM user_problem_stats ups
JOIN problems p ON ups.problem_id = p.id
WHERE ups.user_id = ? 
  AND ups.status != 'abandoned'
  AND (ups.next_review_at IS NULL OR ups.next_review_at <= ?)
ORDER BY ups.next_review_at ASC NULLS FIRST
LIMIT ?;

-- name: GetOverdueProblemsCount :one
SELECT COUNT(*) as count
FROM user_problem_stats
WHERE user_id = ? 
  AND status != 'abandoned'
  AND next_review_at IS NOT NULL 
  AND next_review_at < datetime('now');

-- name: ListUserProblemStats :many
SELECT * FROM user_problem_stats
WHERE user_id = ?
ORDER BY updated_at DESC;

-- name: ListAllUserProblemStats :many
SELECT * FROM user_problem_stats
ORDER BY user_id, problem_id;

-- name: GetUserProblemStatsWithProblem :many
SELECT ups.*, p.title, p.source, p.url, p.difficulty, p.created_at as problem_created_at
FROM user_problem_stats ups
JOIN problems p ON ups.problem_id = p.id
WHERE ups.user_id = ?
ORDER BY ups.updated_at DESC;

-- name: GetUrgentProblems :many
SELECT ups.*, p.title, p.source, p.url, p.difficulty, p.created_at as problem_created_at
FROM user_problem_stats ups
JOIN problems p ON ups.problem_id = p.id
WHERE ups.user_id = ? AND ups.status != 'abandoned'
ORDER BY ups.last_attempt_at ASC NULLS FIRST, ups.confidence ASC
LIMIT ?;

-- name: GetTotalProblemsForUser :one
SELECT COUNT(DISTINCT problem_id) as count
FROM user_problem_stats
WHERE user_id = ?;

-- name: GetMasteredProblemsForUser :one
SELECT COUNT(*) as count
FROM user_problem_stats
WHERE user_id = ? AND status = 'solved' AND confidence >= 80;

-- name: GetAverageConfidenceForUser :one
SELECT COALESCE(AVG(confidence), 0) as avg_confidence
FROM user_problem_stats
WHERE user_id = ? AND status != 'abandoned';
