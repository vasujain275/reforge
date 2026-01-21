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
