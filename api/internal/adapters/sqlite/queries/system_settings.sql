-- name: GetSystemSetting :one
SELECT * FROM system_settings
WHERE key = ?
LIMIT 1;

-- name: ListSystemSettings :many
SELECT * FROM system_settings
ORDER BY key;

-- name: UpdateSystemSetting :one
UPDATE system_settings
SET value = ?, updated_at = CURRENT_TIMESTAMP
WHERE key = ?
RETURNING *;

-- name: GetScoringWeights :many
SELECT key, value FROM system_settings
WHERE key IN ('w_conf', 'w_days', 'w_attempts', 'w_time', 'w_difficulty', 'w_failed', 'w_pattern');
