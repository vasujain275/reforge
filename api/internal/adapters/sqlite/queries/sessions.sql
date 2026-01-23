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

-- name: SearchSessionsForUser :many
SELECT * FROM revision_sessions
WHERE user_id = sqlc.arg(user_id)
  AND (sqlc.arg(search_query) = '' OR template_key LIKE '%' || sqlc.arg(search_query) || '%' OR session_name LIKE '%' || sqlc.arg(search_query) || '%')
  AND (sqlc.arg(status_filter) = '' OR (sqlc.arg(status_filter) = 'active' AND completed_at IS NULL) OR (sqlc.arg(status_filter) = 'completed' AND completed_at IS NOT NULL))
ORDER BY created_at DESC
LIMIT sqlc.arg(limit_val) OFFSET sqlc.arg(offset_val);

-- name: CountSearchSessionsForUser :one
SELECT COUNT(*) as count
FROM revision_sessions
WHERE user_id = sqlc.arg(user_id)
  AND (sqlc.arg(search_query) = '' OR template_key LIKE '%' || sqlc.arg(search_query) || '%' OR session_name LIKE '%' || sqlc.arg(search_query) || '%')
  AND (sqlc.arg(status_filter) = '' OR (sqlc.arg(status_filter) = 'active' AND completed_at IS NULL) OR (sqlc.arg(status_filter) = 'completed' AND completed_at IS NOT NULL));

-- name: UpdateSessionCompleted :exec
UPDATE revision_sessions
SET completed_at = ?
WHERE id = ? AND user_id = ?;

-- name: DeleteSession :exec
DELETE FROM revision_sessions
WHERE id = ? AND user_id = ?;

-- name: UpdateSessionTimer :exec
UPDATE revision_sessions
SET elapsed_time_seconds = ?,
    timer_state = ?,
    timer_last_updated_at = ?
WHERE id = ? AND user_id = ?;
