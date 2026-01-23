-- name: CreateAttempt :one
INSERT INTO attempts (user_id, problem_id, session_id, confidence_score, duration_seconds, outcome, notes, performed_at)
VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
RETURNING *;

-- name: GetAttempt :one
SELECT * FROM attempts
WHERE id = ? AND user_id = ?
LIMIT 1;

-- name: ListAttemptsForUser :many
SELECT a.*, p.title as problem_title, p.difficulty as problem_difficulty
FROM attempts a
JOIN problems p ON a.problem_id = p.id
WHERE a.user_id = ?
ORDER BY a.performed_at DESC
LIMIT ? OFFSET ?;

-- name: ListAttemptsForProblem :many
SELECT * FROM attempts
WHERE user_id = ? AND problem_id = ?
ORDER BY performed_at DESC;

-- name: GetRecentAttempts :many
SELECT a.*, p.title as problem_title, p.difficulty as problem_difficulty
FROM attempts a
JOIN problems p ON a.problem_id = p.id
WHERE a.user_id = ?
ORDER BY a.performed_at DESC
LIMIT ?;

-- name: GetLatestAttemptForProblemInSession :one
SELECT * FROM attempts
WHERE user_id = ? AND problem_id = ? AND session_id = ?
ORDER BY performed_at DESC
LIMIT 1;

-- ============================================================================
-- ATTEMPT TIMER QUERIES (for stopwatch functionality)
-- ============================================================================

-- name: CreateInProgressAttempt :one
INSERT INTO attempts (
    user_id, 
    problem_id, 
    session_id, 
    status, 
    elapsed_time_seconds, 
    timer_state, 
    started_at,
    timer_last_updated_at
)
VALUES (?, ?, ?, 'in_progress', 0, 'idle', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING *;

-- name: GetInProgressAttemptForProblem :one
SELECT a.*, p.title as problem_title, p.difficulty as problem_difficulty
FROM attempts a
JOIN problems p ON a.problem_id = p.id
WHERE a.user_id = ? AND a.problem_id = ? AND a.status = 'in_progress'
ORDER BY a.started_at DESC
LIMIT 1;

-- name: GetAttemptById :one
SELECT a.*, p.title as problem_title, p.difficulty as problem_difficulty
FROM attempts a
JOIN problems p ON a.problem_id = p.id
WHERE a.id = ? AND a.user_id = ?
LIMIT 1;

-- name: UpdateAttemptTimer :exec
UPDATE attempts
SET elapsed_time_seconds = ?,
    timer_state = ?,
    timer_last_updated_at = ?
WHERE id = ? AND user_id = ? AND status = 'in_progress';

-- name: CompleteAttempt :one
UPDATE attempts
SET status = 'completed',
    timer_state = 'idle',
    confidence_score = ?,
    duration_seconds = ?,
    outcome = ?,
    notes = ?,
    performed_at = CURRENT_TIMESTAMP
WHERE id = ? AND user_id = ? AND status = 'in_progress'
RETURNING *;

-- name: AbandonAttempt :exec
UPDATE attempts
SET status = 'abandoned',
    timer_state = 'idle',
    timer_last_updated_at = CURRENT_TIMESTAMP
WHERE id = ? AND user_id = ? AND status = 'in_progress';

-- name: DeleteAttempt :exec
DELETE FROM attempts
WHERE id = ? AND user_id = ?;
