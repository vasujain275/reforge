-- name: CreateSession :one
INSERT INTO revision_sessions (user_id, template_key, planned_duration_min, items_ordered)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetSession :one
SELECT * FROM revision_sessions
WHERE id = $1 AND user_id = $2
LIMIT 1;

-- name: ListSessionsForUser :many
SELECT * FROM revision_sessions
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetSessionCount :one
SELECT COUNT(*) as count
FROM revision_sessions
WHERE user_id = $1;

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
SET completed_at = $1
WHERE id = $2 AND user_id = $3;

-- name: DeleteSession :exec
DELETE FROM revision_sessions
WHERE id = $1 AND user_id = $2;

-- name: UpdateSessionTimer :exec
UPDATE revision_sessions
SET elapsed_time_seconds = $1,
    timer_state = $2,
    timer_last_updated_at = $3
WHERE id = $4 AND user_id = $5;

-- name: UpdateSessionOrder :exec
UPDATE revision_sessions
SET items_ordered = $1
WHERE id = $2 AND user_id = $3;
