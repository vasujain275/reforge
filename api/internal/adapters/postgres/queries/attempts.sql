-- name: CreateAttempt :one
INSERT INTO attempts (user_id, problem_id, session_id, confidence_score, duration_seconds, outcome, notes, performed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
RETURNING *;

-- name: GetAttempt :one
SELECT * FROM attempts
WHERE id = $1 AND user_id = $2
LIMIT 1;

-- name: ListAttemptsForUser :many
SELECT a.*, p.title as problem_title, p.difficulty as problem_difficulty
FROM attempts a
JOIN problems p ON a.problem_id = p.id
WHERE a.user_id = $1
ORDER BY a.performed_at DESC
LIMIT $2 OFFSET $3;

-- name: ListAttemptsForProblem :many
SELECT * FROM attempts
WHERE user_id = $1 AND problem_id = $2
ORDER BY performed_at DESC;

-- name: GetRecentAttempts :many
SELECT a.*, p.title as problem_title, p.difficulty as problem_difficulty
FROM attempts a
JOIN problems p ON a.problem_id = p.id
WHERE a.user_id = $1
ORDER BY a.performed_at DESC
LIMIT $2;

-- name: GetLatestAttemptForProblemInSession :one
SELECT * FROM attempts
WHERE user_id = $1 AND problem_id = $2 AND session_id = $3
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
VALUES ($1, $2, $3, 'in_progress', 0, 'idle', NOW(), NOW())
RETURNING *;

-- name: GetInProgressAttemptForProblem :one
SELECT a.*, p.title as problem_title, p.difficulty as problem_difficulty
FROM attempts a
JOIN problems p ON a.problem_id = p.id
WHERE a.user_id = $1 AND a.problem_id = $2 AND a.status = 'in_progress'
ORDER BY a.started_at DESC
LIMIT 1;

-- name: GetAttemptById :one
SELECT a.*, p.title as problem_title, p.difficulty as problem_difficulty
FROM attempts a
JOIN problems p ON a.problem_id = p.id
WHERE a.id = $1 AND a.user_id = $2
LIMIT 1;

-- name: UpdateAttemptTimer :exec
UPDATE attempts
SET elapsed_time_seconds = $1,
    timer_state = $2,
    timer_last_updated_at = $3
WHERE id = $4 AND user_id = $5 AND status = 'in_progress';

-- name: CompleteAttempt :one
UPDATE attempts
SET status = 'completed',
    timer_state = 'idle',
    confidence_score = $1,
    duration_seconds = $2,
    outcome = $3,
    notes = $4,
    performed_at = NOW()
WHERE id = $5 AND user_id = $6 AND status = 'in_progress'
RETURNING *;

-- name: AbandonAttempt :exec
UPDATE attempts
SET status = 'abandoned',
    timer_state = 'idle',
    timer_last_updated_at = NOW()
WHERE id = $1 AND user_id = $2 AND status = 'in_progress';

-- name: DeleteAttempt :exec
DELETE FROM attempts
WHERE id = $1 AND user_id = $2;
