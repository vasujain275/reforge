-- name: CreateSession :one
INSERT INTO revision_sessions (user_id, template_key, planned_duration_min, items_ordered)
VALUES (?, ?, ?, ?)
RETURNING *;

-- name: GetSession :one
SELECT * FROM revision_sessions
WHERE id = ? AND user_id = ?
LIMIT 1;

-- name: ListSessionsForUser :many
SELECT * FROM revision_sessions
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: GetSessionCount :one
SELECT COUNT(*) as count
FROM revision_sessions
WHERE user_id = ?;

-- name: UpdateSessionCompleted :exec
UPDATE revision_sessions
SET completed_at = ?
WHERE id = ? AND user_id = ?;

-- name: DeleteSession :exec
DELETE FROM revision_sessions
WHERE id = ? AND user_id = ?;
